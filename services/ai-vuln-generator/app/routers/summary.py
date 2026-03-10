import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.prompts import SUMMARY_PROMPT
from app.providers import get_provider

router = APIRouter(prefix="/api/ai", tags=["summary"])

_executor = ThreadPoolExecutor(max_workers=2)


class SummaryRequest(BaseModel):
    vulnerabilities_markdown: str


class SummaryResponse(BaseModel):
    summary_markdown: str


@router.post("/results/summary", response_model=SummaryResponse)
async def generate_summary(req: SummaryRequest):
    provider = get_provider()
    msgs = [
        {"role": "system", "content": "Ты составляешь краткий маркированный список недостатков по найденным уязвимостям."},
        {"role": "user", "content": f"{SUMMARY_PROMPT}\n\nУязвимости:\n---\n{req.vulnerabilities_markdown}\n---"},
    ]
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            _executor, lambda: provider.chat(msgs)
        )
    except Exception as e:
        raise HTTPException(500, str(e))
    return SummaryResponse(summary_markdown=result.strip())
