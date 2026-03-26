import asyncio
import logging
from datetime import datetime

import httpx

from app.config import settings
from app.stages import get_stage_tag

logger = logging.getLogger(__name__)

_REPORTS_EP = "/api/bug-bounty/external/reports/"
_MAX_RETRIES = 3
_BATCH_SIZE = 3
_PAGE_LIMIT = 100
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
)


def _parse_report(raw: dict) -> dict:
    """Map BI.ZONE API report to internal flat dict."""
    company_data = (raw.get("task") or {}).get("company") or {}
    user_data = raw.get("user") or {}

    creation_date = None
    if raw.get("creationDate"):
        try:
            creation_date = datetime.fromisoformat(raw["creationDate"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass

    modification_date = None
    if raw.get("modificationDate"):
        try:
            modification_date = datetime.fromisoformat(raw["modificationDate"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass

    stage_id = raw.get("currentStageId", 0)

    return {
        "id": raw["id"],
        "name": raw.get("name", ""),
        "assignee": raw.get("assignee"),
        "current_stage_id": stage_id,
        "current_stage_tag": get_stage_tag(stage_id),
        "company": company_data.get("slug") or company_data.get("id", ""),
        "company_name": company_data.get("name"),
        "critical_type": raw.get("criticalType"),
        "cvss": raw.get("cvss"),
        "description": raw.get("description"),
        "researcher": user_data.get("username"),
        "bounty": raw.get("price", 0) or 0,
        "creation_date": creation_date,
        "modification_date": modification_date,
    }


async def _fetch_with_retry(
    client: httpx.AsyncClient, params: dict, retries: int = _MAX_RETRIES
) -> dict | None:
    for attempt in range(1, retries + 1):
        try:
            resp = await client.get(_REPORTS_EP, params=params)
            if resp.status_code == 200:
                return resp.json()
            logger.warning("Unexpected status %d for %s", resp.status_code, _REPORTS_EP)
            return None
        except Exception as e:
            logger.error("Request error (attempt %d/%d): %s", attempt, retries, e)
            if attempt == retries:
                raise
            delay = min(1.0 * (2 ** (attempt - 1)), 10.0)
            await asyncio.sleep(delay)
    return None


async def fetch_reports_for_company(
    client: httpx.AsyncClient,
    company: str,
    target_stages: list[int] | None = None,
) -> list[dict]:
    """Fetch all reports for a company with pagination."""
    logger.info("Fetching reports for company: %s", company)
    all_reports: list[dict] = []
    offset = 0

    while True:
        params = {
            "limit": _PAGE_LIMIT,
            "offset": offset,
            "has_access": "true",
            "task__company": company,
        }
        data = await _fetch_with_retry(client, params)
        if not data or not isinstance(data.get("results"), list):
            break

        reports = data["results"]
        for raw in reports:
            parsed = _parse_report(raw)
            if target_stages and parsed["current_stage_id"] not in target_stages:
                continue
            all_reports.append(parsed)

        logger.info(
            "  company=%s offset=%d fetched=%d total_collected=%d",
            company, offset, len(reports), len(all_reports),
        )

        if data.get("next"):
            offset += _PAGE_LIMIT
        else:
            break

    return all_reports


async def fetch_all_reports(
    target_stages: list[int] | None = None,
) -> list[dict]:
    """Fetch reports for all configured companies in batches."""
    companies = settings.bz_companies
    if not companies:
        logger.warning("No companies configured")
        return []

    all_reports: list[dict] = []
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {settings.bz_token}",
        "User-Agent": _USER_AGENT,
    }

    async with httpx.AsyncClient(
        base_url=settings.bz_base_url, headers=headers, timeout=30.0
    ) as client:
        for i in range(0, len(companies), _BATCH_SIZE):
            batch = companies[i : i + _BATCH_SIZE]
            logger.info("Processing batch: %s", ", ".join(batch))

            tasks = [
                fetch_reports_for_company(client, company, target_stages)
                for company in batch
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for company, result in zip(batch, results):
                if isinstance(result, Exception):
                    logger.error("Failed for company %s: %s", company, result)
                    continue
                all_reports.extend(result)

            if i + _BATCH_SIZE < len(companies):
                await asyncio.sleep(1.0)

    logger.info("Total reports fetched: %d", len(all_reports))
    return all_reports
