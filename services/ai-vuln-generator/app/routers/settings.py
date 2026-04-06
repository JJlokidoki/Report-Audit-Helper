import logging
import uuid

import httpx
from pydantic import BaseModel
from fastapi import APIRouter

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["settings"])

PROVIDERS = ["openai", "ollama", "gigachat"]


class AISettings(BaseModel):
    llm_provider: str
    llm_model: str
    llm_base_url: str
    llm_api_key: str
    llm_temperature: float
    llm_max_tokens: int
    llm_system_prompt: str


class AISettingsResponse(AISettings):
    providers: list[str]


@router.get("/settings", response_model=AISettingsResponse)
async def get_settings():
    return AISettingsResponse(
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model,
        llm_base_url=settings.llm_base_url,
        llm_api_key=settings.llm_api_key,
        llm_temperature=settings.llm_temperature,
        llm_max_tokens=settings.llm_max_tokens,
        llm_system_prompt=settings.llm_system_prompt,
        providers=PROVIDERS,
    )


class AISettingsUpdate(BaseModel):
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_temperature: float | None = None
    llm_max_tokens: int | None = None
    llm_system_prompt: str | None = None


@router.put("/settings", response_model=AISettingsResponse)
async def update_settings(body: AISettingsUpdate):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    # re-create provider with new settings
    import app.providers as prov
    prov._current = None
    return await get_settings()


@router.get("/health")
async def health_check():
    """Try a minimal LLM call to verify connection, auth and model."""
    import app.providers as prov
    prov._current = None  # force re-create with current settings
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
    """Refresh GigaChat bearer token using LLM_AUTH_KEY."""
    auth_key = settings.llm_auth_key
    if not auth_key:
        return {"status": "error", "detail": "LLM_AUTH_KEY не задан"}

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
        # force re-create provider with new token
        import app.providers as prov
        prov._current = None

        logger.info("GigaChat token refreshed successfully")
        return {"status": "ok", "detail": "Токен обновлён"}
    except Exception as e:
        logger.warning("Token refresh failed: %s", e)
        return {"status": "error", "detail": str(e)}
