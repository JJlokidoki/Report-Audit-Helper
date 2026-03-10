import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Iterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.prompts import KILLCHAIN_PROMPT, SYSTEM_PROMPT
from app.providers import get_provider

router = APIRouter(prefix="/api/ai", tags=["generate"])

_executor = ThreadPoolExecutor(max_workers=4)


class GenerateRequest(BaseModel):
    history: list[dict] = []
    images: list[str] = []       # base64-encoded PNG/JPEG
    filenames: list[str] = []


class GenerateResponse(BaseModel):
    markdown: str
    raw: str


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


async def _sync_stream_to_async(sync_gen: Iterator[str]):
    loop = asyncio.get_event_loop()
    it = iter(sync_gen)
    while True:
        try:
            chunk = await loop.run_in_executor(_executor, next, it)
            yield chunk.encode()
        except StopIteration:
            break


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
    return GenerateResponse(markdown=raw, raw=raw)


@router.post("/generate/stream")
async def generate_stream(req: GenerateRequest):
    provider = get_provider()
    images = _decode_images(req.images) if req.images else []
    msgs = _build_messages(req.history, images, SYSTEM_PROMPT)

    async def streamer():
        try:
            gen = provider.stream(msgs, images or None)
            async for chunk in _sync_stream_to_async(gen):
                yield chunk
        except Exception as e:
            yield f"\n[ERROR] {e}".encode()

    return StreamingResponse(streamer(), media_type="text/plain")


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
