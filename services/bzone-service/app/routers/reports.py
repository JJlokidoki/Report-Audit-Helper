from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BZoneReport
from app.schemas import BZoneReportResponse

router = APIRouter(prefix="/api/bzone", tags=["reports"])


@router.get("/reports", response_model=list[BZoneReportResponse])
async def list_reports(
    company: str | None = Query(None),
    stage_id: int | None = Query(None),
    critical_type: str | None = Query(None),
    is_duplicate: bool | None = Query(None),
    has_cwe: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(BZoneReport)
    if company:
        q = q.where(BZoneReport.company == company)
    if stage_id is not None:
        q = q.where(BZoneReport.current_stage_id == stage_id)
    if critical_type:
        q = q.where(BZoneReport.critical_type == critical_type)
    if is_duplicate is not None:
        q = q.where(BZoneReport.is_duplicate == is_duplicate)
    if has_cwe is True:
        q = q.where(BZoneReport.cwe_id.isnot(None))
    elif has_cwe is False:
        q = q.where(BZoneReport.cwe_id.is_(None))

    q = q.order_by(BZoneReport.current_stage_id, BZoneReport.id.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/reports/{report_id}", response_model=BZoneReportResponse)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BZoneReport).where(BZoneReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    return report
