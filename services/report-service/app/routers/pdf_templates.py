from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import PdfTemplate
from app.schemas import PdfTemplateUpdate, PdfTemplateReorder, PdfTemplateResponse
from app.pdf_template_defaults import _DEFAULT_CONTENT, SECTIONS

router = APIRouter(prefix="/api/pdf-templates", tags=["pdf-templates"])


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


@router.get("/sections/list")
async def list_sections():
    """Return available section names."""
    return SECTIONS


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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tpl, field, value)
    await db.commit()
    await db.refresh(tpl)
    return tpl


@router.post("/{template_id}/reset", response_model=PdfTemplateResponse)
async def reset_pdf_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Reset template to default content."""
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")
    tpl.content = _DEFAULT_CONTENT.get(tpl.section, "")
    tpl.css = None
    await db.commit()
    await db.refresh(tpl)
    return tpl
