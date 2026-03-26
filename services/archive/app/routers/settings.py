import logging

from fastapi import APIRouter, HTTPException

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
    try:
        provider = get_embedding_provider()
        provider.embed_query("test")
        return {
            "status": "ok",
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
        }
    except Exception as e:
        raise HTTPException(503, detail={
            "status": "error",
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "detail": str(e),
        })


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
