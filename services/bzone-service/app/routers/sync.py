import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bzone_client import fetch_all_reports
from app.config import settings
from app.database import get_db
from app.models import BZoneReport, SyncLog
from app.schemas import SyncStatusResponse
from app.stages import get_stage_tag

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bzone", tags=["sync"])


@router.post("/sync", response_model=SyncStatusResponse)
async def run_sync(db: AsyncSession = Depends(get_db)):
    log = SyncLog(status="running")
    db.add(log)
    await db.commit()
    await db.refresh(log)

    try:
        target_stages = settings.bz_target_stages or None
        fetched = await fetch_all_reports(target_stages=target_stages)

        new_count = 0
        updated_count = 0
        now = datetime.now(timezone.utc)

        for data in fetched:
            report_id = data["id"]
            result = await db.execute(
                select(BZoneReport).where(BZoneReport.id == report_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                for key in (
                    "name", "assignee", "current_stage_id", "current_stage_tag",
                    "company", "company_name", "critical_type", "cvss",
                    "description", "researcher", "bounty",
                    "creation_date", "modification_date",
                ):
                    setattr(existing, key, data[key])
                existing.synced_at = now
                updated_count += 1
            else:
                report = BZoneReport(**data, synced_at=now)
                db.add(report)
                new_count += 1

        log.status = "success"
        log.total_fetched = len(fetched)
        log.new_reports = new_count
        log.updated_reports = updated_count
        log.finished_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(log)
        logger.info("Sync complete: %d fetched, %d new, %d updated", len(fetched), new_count, updated_count)

    except Exception as e:
        log.status = "failed"
        log.error = str(e)
        log.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(log)
        logger.error("Sync failed: %s", e)

    return log


@router.get("/sync/status", response_model=SyncStatusResponse | None)
async def get_sync_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SyncLog).order_by(SyncLog.id.desc()).limit(1)
    )
    return result.scalar_one_or_none()
