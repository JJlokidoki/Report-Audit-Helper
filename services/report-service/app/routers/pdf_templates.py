import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import PdfTemplate, PdfTemplateVersion
from app.schemas import (
    PdfTemplateCreate,
    PdfTemplateUpdate,
    PdfTemplateReorder,
    PdfTemplateResponse,
    PdfTemplateVersionResponse,
)
from app.pdf_template_defaults import (
    _get_defaults,
    SECTIONS,
)

router = APIRouter(prefix="/api/pdf-templates", tags=["pdf-templates"])

MAX_VERSIONS = 20


# ── Helpers ──────────────────────────────────────────────────────────────────


def _slugify(text: str) -> str:
    """Generate a safe slug from a Russian/English label."""
    # transliterate common Cyrillic chars
    translit = {
        "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh",
        "з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o",
        "п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c",
        "ч":"ch","ш":"sh","щ":"sch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya",
    }
    s = text.lower()
    s = "".join(translit.get(c, c) for c in s)
    s = re.sub(r"[^a-z0-9_]+", "_", s).strip("_")
    return s or f"user_{int(datetime.now().timestamp())}"


async def _ensure_unique_slug(db: AsyncSession, report_type: str, base: str) -> str:
    """Return `base` if unique for report_type, else append numeric suffix."""
    slug = base
    i = 2
    while True:
        result = await db.execute(
            select(PdfTemplate).where(
                PdfTemplate.report_type == report_type,
                PdfTemplate.section == slug,
            )
        )
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base}_{i}"
        i += 1


async def _next_sort_order(db: AsyncSession, report_type: str) -> int:
    result = await db.execute(
        select(func.max(PdfTemplate.sort_order)).where(PdfTemplate.report_type == report_type)
    )
    max_order = result.scalar() or 0
    return max_order + 1


async def _save_version(db: AsyncSession, template_id: int, content: str) -> None:
    """Save a version of content and prune old ones beyond MAX_VERSIONS."""
    db.add(PdfTemplateVersion(template_id=template_id, content=content))
    await db.flush()

    # Prune: keep only MAX_VERSIONS most recent
    result = await db.execute(
        select(PdfTemplateVersion)
        .where(PdfTemplateVersion.template_id == template_id)
        .order_by(PdfTemplateVersion.created_at.desc())
    )
    versions = list(result.scalars().all())
    if len(versions) > MAX_VERSIONS:
        for old in versions[MAX_VERSIONS:]:
            await db.delete(old)


# ── CRUD endpoints ───────────────────────────────────────────────────────────


@router.get("", response_model=list[PdfTemplateResponse])
async def list_pdf_templates(report_type: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(PdfTemplate).order_by(PdfTemplate.report_type, PdfTemplate.sort_order, PdfTemplate.id)
    if report_type:
        query = query.where(PdfTemplate.report_type == report_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/reorder")
async def reorder_pdf_templates(data: PdfTemplateReorder, db: AsyncSession = Depends(get_db)):
    """Reorder sections within a report type."""
    for item in data.orders:
        result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == item["id"]))
        tpl = result.scalar_one_or_none()
        if tpl:
            tpl.sort_order = item["sort_order"]
    await db.commit()
    return {"status": "ok"}


@router.post("", response_model=PdfTemplateResponse, status_code=201)
async def create_pdf_template(data: PdfTemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a user section. Slug auto-generated from label if omitted."""
    slug = data.section or _slugify(data.label)
    slug = await _ensure_unique_slug(db, data.report_type, slug)
    anchor = data.anchor or slug.replace("_", "-")

    tpl = PdfTemplate(
        report_type=data.report_type,
        section=slug,
        label=data.label,
        anchor=anchor,
        content=data.content,
        css=None,
        sort_order=await _next_sort_order(db, data.report_type),
        is_system=False,
        is_numbered=data.is_numbered,
        is_builtin=False,
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return tpl


@router.get("/{template_id}", response_model=PdfTemplateResponse)
async def get_pdf_template(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")
    return tpl


@router.put("/{template_id}", response_model=PdfTemplateResponse)
async def update_pdf_template(template_id: int, data: PdfTemplateUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")

    updates = data.model_dump(exclude_unset=True)

    # System sections: cannot change anchor
    if tpl.is_system and "anchor" in updates:
        raise HTTPException(403, "Cannot change anchor of system section")

    # Version content if it changes
    if "content" in updates and updates["content"] != tpl.content:
        await _save_version(db, tpl.id, tpl.content)

    for field, value in updates.items():
        setattr(tpl, field, value)

    await db.commit()
    await db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=204)
async def delete_pdf_template(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")
    if tpl.is_system:
        raise HTTPException(403, "Cannot delete system section")
    await db.delete(tpl)
    await db.commit()


@router.post("/{template_id}/reset", response_model=PdfTemplateResponse)
async def reset_pdf_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Reset template to default content. Only works for builtin sections."""
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")
    if not tpl.is_builtin:
        raise HTTPException(400, "Cannot reset user-created section (no default)")

    new_content = _get_defaults(tpl.report_type).get(tpl.section, "")
    if new_content != tpl.content:
        await _save_version(db, tpl.id, tpl.content)
    tpl.content = new_content
    tpl.css = None
    await db.commit()
    await db.refresh(tpl)
    return tpl


# ── Version history ─────────────────────────────────────────────────────────


@router.get("/{template_id}/versions", response_model=list[PdfTemplateVersionResponse])
async def list_versions(template_id: int, db: AsyncSession = Depends(get_db)):
    """Return version history for a template, newest first."""
    result = await db.execute(
        select(PdfTemplateVersion)
        .where(PdfTemplateVersion.template_id == template_id)
        .order_by(PdfTemplateVersion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{template_id}/versions/{version_id}/restore", response_model=PdfTemplateResponse)
async def restore_version(template_id: int, version_id: int, db: AsyncSession = Depends(get_db)):
    """Restore a previous version. Saves current content as a new version first."""
    t_result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    tpl = t_result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")

    v_result = await db.execute(
        select(PdfTemplateVersion).where(
            PdfTemplateVersion.id == version_id,
            PdfTemplateVersion.template_id == template_id,
        )
    )
    version = v_result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")

    # Save current content before overwriting
    if version.content != tpl.content:
        await _save_version(db, tpl.id, tpl.content)
        tpl.content = version.content

    await db.commit()
    await db.refresh(tpl)
    return tpl


# ── Legacy ───────────────────────────────────────────────────────────────────


@router.get("/sections/list")
async def list_sections():
    """Return available section names (legacy — kept for backward compat)."""
    return SECTIONS
