import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Iterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.parser import parse_vuln_markdown
from app.prompts import KILLCHAIN_PROMPT, SYSTEM_PROMPT
from app.providers import get_provider
from app.sse import format_chunk, format_done, format_error

router = APIRouter(prefix="/api/ai", tags=["generate"])

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
    msgs = _build_messages(req.history, images, SYSTEM_PROMPT)
    try:
        raw = await asyncio.get_event_loop().run_in_executor(
            _executor, lambda: provider.chat(msgs, images or None)
        )
    except Exception as e:
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
    msgs = _build_messages(req.history, images, SYSTEM_PROMPT)

    async def streamer():
        accumulated = ""
        try:
            gen = provider.stream(msgs, images or None)
            async for chunk in _sync_stream_to_async(gen):
                text = chunk.decode()
                accumulated += text
                yield format_chunk(text)
        except Exception as e:
            yield format_error(str(e))
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
            yield f"\n[ERROR] {e}".encode()

    return StreamingResponse(streamer(), media_type="text/plain")
