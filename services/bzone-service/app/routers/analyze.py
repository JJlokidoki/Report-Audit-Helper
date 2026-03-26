import json
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BZoneReport
from app.providers import get_provider
from app.prompts import ANALYSIS_SYSTEM_PROMPT
from app.schemas import AnalyzeRequest, AnalyzeResponse, AnalyzeResultItem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bzone", tags=["analyze"])
_executor = ThreadPoolExecutor(max_workers=2)


def _build_report_list(reports: list[BZoneReport]) -> str:
    lines = []
    for r in reports:
        desc = (r.description or "")[:500]
        lines.append(
            f"- ID: {r.id} | Name: {r.name} | Company: {r.company} "
            f"| CriticalType: {r.critical_type} | CVSS: {r.cvss}\n"
            f"  Description: {desc}"
        )
    return "\n".join(lines)


async def _get_reports(req: AnalyzeRequest, db: AsyncSession) -> list[BZoneReport]:
    if req.all:
        result = await db.execute(select(BZoneReport))
        return list(result.scalars().all())
    if req.report_ids:
        result = await db.execute(
            select(BZoneReport).where(BZoneReport.id.in_(req.report_ids))
        )
        return list(result.scalars().all())
    return []


def _parse_analysis(raw: str) -> list[dict]:
    """Extract JSON array from LLM response."""
    text = raw.strip()
    # try to find JSON array in the response
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_reports(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    reports = await _get_reports(req, db)
    if not reports:
        return AnalyzeResponse(results=[])

    report_text = _build_report_list(reports)
    messages = [
        {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
        {"role": "user", "content": f"Analyze these vulnerability reports:\n\n{report_text}"},
    ]

    provider = get_provider()
    raw = provider.chat(messages)
    items = _parse_analysis(raw)

    results = []
    report_map = {r.id: r for r in reports}

    for item in items:
        rid = item.get("report_id")
        if rid not in report_map:
            continue

        report = report_map[rid]
        report.cwe_id = item.get("cwe_id")
        report.cwe_name = item.get("cwe_name")
        report.is_duplicate = item.get("is_duplicate", False)
        report.duplicate_of = item.get("duplicate_of")
        report.ai_notes = item.get("notes")

        results.append(AnalyzeResultItem(
            report_id=rid,
            cwe_id=report.cwe_id,
            cwe_name=report.cwe_name,
            is_duplicate=report.is_duplicate,
            duplicate_of=report.duplicate_of,
            ai_notes=report.ai_notes,
        ))

    await db.commit()
    return AnalyzeResponse(results=results)


@router.post("/analyze/stream")
async def analyze_reports_stream(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    reports = await _get_reports(req, db)
    if not reports:
        return StreamingResponse(iter([""]), media_type="text/plain")

    report_text = _build_report_list(reports)
    messages = [
        {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
        {"role": "user", "content": f"Analyze these vulnerability reports:\n\n{report_text}"},
    ]

    provider = get_provider()

    def generate():
        yield from provider.stream(messages)

    import asyncio

    async def async_generate():
        loop = asyncio.get_event_loop()
        gen = await loop.run_in_executor(_executor, generate)
        for chunk in gen:
            yield chunk

    # Use sync generator via StreamingResponse
    return StreamingResponse(generate(), media_type="text/plain")
