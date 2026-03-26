import logging
import uuid

import httpx
from fastapi import APIRouter

from app.config import settings
from app.providers import get_embedding_provider, reset_provider
from app.schemas import IndexStats, SettingsResponse, SettingsUpdate
from app.vectorstore import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/archive", tags=["settings"])

_PROVIDERS = ["openai", "ollama", "gigachat"]


@router.get("/settings", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    return SettingsResponse(
        embedding_provider=settings.embedding_provider,
        embedding_model=settings.embedding_model,
        embedding_base_url=settings.embedding_base_url,
        embedding_api_key=settings.embedding_api_key,
        embedding_dimensions=settings.embedding_dimensions,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        default_top_k=settings.default_top_k,
        providers=_PROVIDERS,
    )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(update: SettingsUpdate) -> SettingsResponse:
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    reset_provider()
    logger.info("Settings updated, provider reset")
    return await get_settings()


@router.get("/health")
async def health_check() -> dict:
    reset_provider()
    try:
        provider = get_embedding_provider()
        vector = provider.embed_query("ping")
        return {
            "status": "ok",
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimensions": len(vector),
        }
    except Exception as e:
        logger.warning("Health check failed: %s", e)
        return {
            "status": "error",
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "detail": str(e),
        }


GIGACHAT_AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"


@router.post("/refresh-token")
async def refresh_token():
    """Refresh GigaChat bearer token using EMBEDDING_AUTH_KEY."""
    auth_key = settings.embedding_auth_key
    if not auth_key:
        return {"status": "error", "detail": "EMBEDDING_AUTH_KEY не задан"}

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

        settings.embedding_api_key = token
        reset_provider()

        logger.info("GigaChat embedding token refreshed successfully")
        return {"status": "ok", "detail": "Токен обновлён"}
    except Exception as e:
        logger.warning("Token refresh failed: %s", e)
        return {"status": "error", "detail": str(e)}


@router.get("/stats", response_model=IndexStats)
async def get_stats() -> IndexStats:
    store = VectorStore()
    docs = store.list_documents()
    return IndexStats(
        total_documents=len(docs),
        total_chunks=store.total_chunks,
        embedding_provider=settings.embedding_provider,
        embedding_model=settings.embedding_model,
    )
