import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Iterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.parser import parse_vuln_markdown
from app.prompts import KILLCHAIN_PROMPT
from app.providers import get_provider
from app.sse import format_chunk, format_done, format_error

router = APIRouter(prefix="/api/ai", tags=["generate"])

_AUTH_ERROR_MSG = "Ошибка авторизации LLM-провайдера. Обновите токен в настройках AI."


def _is_auth_error(e: Exception) -> bool:
    """Check if exception is a 401 auth error from any provider."""
    # openai.AuthenticationError / openai.APIStatusError
    if hasattr(e, "status_code") and getattr(e, "status_code", None) == 401:
        return True
    # httpx.HTTPStatusError (GigaChat)
    resp = getattr(e, "response", None)
    if resp is not None and getattr(resp, "status_code", None) == 401:
        return True
    return False

_executor = ThreadPoolExecutor(max_workers=4)


class GenerateRequest(BaseModel):
    history: list[dict] = []
    images: list[str] = []       # base64-encoded PNG/JPEG
    filenames: list[str] = []


class VulnFieldsResponse(BaseModel):
    bug_name: str | None = None
    bug_description: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    bug_criticality: str | None = None


class GenerateResponse(BaseModel):
    markdown: str
    raw: str
    fields: VulnFieldsResponse | None = None


def _build_messages(history: list[dict], images: list[bytes], system_prompt: str) -> list:
    msgs = [{"role": "system", "content": system_prompt}]
    if history:
        msgs.extend(history)
    else:
        msgs.append({"role": "user", "content": "(empty draft)"})
    return msgs


def _decode_images(b64_list: list[str]) -> list[bytes]:
    result = []
    for b64 in b64_list:
        data = b64.split(",", 1)[-1] if "," in b64 else b64
        result.append(base64.b64decode(data))
    return result


_STREAM_END = object()


def _next_or_end(it: Iterator[str]):
    try:
        return next(it)
    except StopIteration:
        return _STREAM_END


async def _sync_stream_to_async(sync_gen: Iterator[str]):
    loop = asyncio.get_event_loop()
    it = iter(sync_gen)
    while True:
        chunk = await loop.run_in_executor(_executor, _next_or_end, it)
        if chunk is _STREAM_END:
            break
        yield chunk.encode()


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    provider = get_provider()
    images = _decode_images(req.images) if req.images else []
    msgs = _build_messages(req.history, images, settings.llm_system_prompt)
    try:
        raw = await asyncio.get_event_loop().run_in_executor(
            _executor, lambda: provider.chat(msgs, images or None)
        )
    except Exception as e:
        if _is_auth_error(e):
            raise HTTPException(401, _AUTH_ERROR_MSG)
        raise HTTPException(500, str(e))
    fields = parse_vuln_markdown(raw)
    return GenerateResponse(
        markdown=raw,
        raw=raw,
        fields=VulnFieldsResponse(**fields.to_dict()),
    )


@router.post("/generate/stream")
async def generate_stream(req: GenerateRequest):
    provider = get_provider()
    images = _decode_images(req.images) if req.images else []
    msgs = _build_messages(req.history, images, settings.llm_system_prompt)

    async def streamer():
        accumulated = ""
        try:
            gen = provider.stream(msgs, images or None)
            async for chunk in _sync_stream_to_async(gen):
                text = chunk.decode()
                accumulated += text
                yield format_chunk(text)
        except Exception as e:
            msg = _AUTH_ERROR_MSG if _is_auth_error(e) else str(e)
            yield format_error(msg)
            return
        fields = parse_vuln_markdown(accumulated)
        yield format_done(fields.to_dict())

    return StreamingResponse(
        streamer(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate/killchain/stream")
async def generate_killchain_stream(req: GenerateRequest):
    provider = get_provider()
    images = _decode_images(req.images) if req.images else []
    msgs = _build_messages(req.history, images, KILLCHAIN_PROMPT)

    async def streamer():
        try:
            gen = provider.stream(msgs, images or None)
            async for chunk in _sync_stream_to_async(gen):
                yield chunk
        except Exception as e:
            msg = _AUTH_ERROR_MSG if _is_auth_error(e) else str(e)
            yield f"\n[ERROR] {msg}".encode()

    return StreamingResponse(streamer(), media_type="text/plain")
