import logging
import uuid

import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import BZoneReport, SyncLog
from app.schemas import SyncStatusResponse, BZoneStatsResponse
from app.stages import STAGES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bzone", tags=["settings"])

PROVIDERS = ["openai", "ollama", "gigachat"]


# ── Settings models ──────────────────────────────────────────────────────────

class BZoneSettingsResponse(BaseModel):
    bz_token: str
    bz_base_url: str
    bz_companies: list[str]
    bz_target_stages: list[int]
    llm_provider: str
    llm_model: str
    llm_base_url: str
    llm_api_key: str
    llm_temperature: float
    llm_max_tokens: int
    providers: list[str]
    has_token: bool


class BZoneSettingsUpdate(BaseModel):
    bz_token: str | None = None
    bz_base_url: str | None = None
    bz_target_stages: list[int] | None = None
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_temperature: float | None = None
    llm_max_tokens: int | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _mask_token(token: str) -> str:
    if not token or len(token) < 8:
        return "****" if token else ""
    return "****" + token[-4:]


def _build_response() -> BZoneSettingsResponse:
    return BZoneSettingsResponse(
        bz_token=_mask_token(settings.bz_token),
        bz_base_url=settings.bz_base_url,
        bz_companies=settings.bz_companies,
        bz_target_stages=settings.bz_target_stages,
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model,
        llm_base_url=settings.llm_base_url,
        llm_api_key=settings.llm_api_key,
        llm_temperature=settings.llm_temperature,
        llm_max_tokens=settings.llm_max_tokens,
        providers=PROVIDERS,
        has_token=bool(settings.bz_token),
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=BZoneSettingsResponse)
async def get_settings():
    return _build_response()


@router.put("/settings", response_model=BZoneSettingsResponse)
async def update_settings(body: BZoneSettingsUpdate):
    update_data = body.model_dump(exclude_none=True)
    if "bz_target_stages" in update_data:
        settings.bz_target_stages = update_data.pop("bz_target_stages")
    for field, value in update_data.items():
        setattr(settings, field, value)
    # re-create LLM provider
    import app.providers as prov
    prov._current = None
    return _build_response()


@router.get("/health")
async def health_check():
    import app.providers as prov
    prov._current = None
    try:
        provider = prov.get_provider()
        reply = provider.chat([{"role": "user", "content": "ping"}])
        return {
            "status": "ok",
            "provider": settings.llm_provider,
            "model": settings.llm_model,
            "reply": reply[:100],
        }
    except Exception as e:
        logger.warning("Health check failed: %s", e)
        return {
            "status": "error",
            "provider": settings.llm_provider,
            "model": settings.llm_model,
            "detail": str(e),
        }


GIGACHAT_AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"


@router.post("/refresh-token")
async def refresh_token():
    auth_key = settings.llm_auth_key
    if not auth_key:
        return {"status": "error", "detail": "LLM_AUTH_KEY not set"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=30) as client:
            resp = await client.post(
                GIGACHAT_AUTH_URL,
                headers={
                    "Authorization": f"Basic {auth_key}",
                    "RqUID": str(uuid.uuid4()),
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
                data={"scope": "GIGACHAT_API_PERS"},
            )
            resp.raise_for_status()
            token = resp.json()["access_token"]
        settings.llm_api_key = token
        import app.providers as prov
        prov._current = None
        logger.info("GigaChat token refreshed")
        return {"status": "ok", "detail": "Token refreshed"}
    except Exception as e:
        logger.warning("Token refresh failed: %s", e)
        return {"status": "error", "detail": str(e)}


@router.get("/stats", response_model=BZoneStatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Total reports
    total = (await db.execute(select(func.count(BZoneReport.id)))).scalar() or 0

    # By company
    rows = (await db.execute(
        select(BZoneReport.company, func.count(BZoneReport.id))
        .group_by(BZoneReport.company)
    )).all()
    by_company = {r[0]: r[1] for r in rows}

    # By stage tag
    rows = (await db.execute(
        select(BZoneReport.current_stage_tag, func.count(BZoneReport.id))
        .where(BZoneReport.current_stage_tag.isnot(None))
        .group_by(BZoneReport.current_stage_tag)
    )).all()
    by_stage = {r[0]: r[1] for r in rows}

    # With CWE
    with_cwe = (await db.execute(
        select(func.count(BZoneReport.id)).where(BZoneReport.cwe_id.isnot(None))
    )).scalar() or 0

    # Duplicates
    duplicates = (await db.execute(
        select(func.count(BZoneReport.id)).where(BZoneReport.is_duplicate == True)
    )).scalar() or 0

    # Last sync
    last_sync_row = (await db.execute(
        select(SyncLog).order_by(SyncLog.id.desc()).limit(1)
    )).scalar_one_or_none()

    last_sync = None
    if last_sync_row:
        last_sync = SyncStatusResponse.model_validate(last_sync_row)

    return BZoneStatsResponse(
        total_reports=total,
        by_company=by_company,
        by_stage=by_stage,
        with_cwe=with_cwe,
        duplicates=duplicates,
        last_sync=last_sync,
    )
