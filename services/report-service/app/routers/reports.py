from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Report, Vulnerability, SecurityCheck
from app.schemas import ReportCreate, ReportUpdate, ReportResponse, ReportListResponse
from app.checklist_data import get_checklist_items

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=list[ReportListResponse])
async def list_reports(report_type: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Report)
    if report_type:
        query = query.where(Report.report_type == report_type)
    query = query.order_by(Report.created_at.desc())
    result = await db.execute(query)
    reports = result.scalars().all()
    response = []
    for r in reports:
        count_q = select(func.count()).select_from(Vulnerability).where(Vulnerability.report_id == r.id)
        count_result = await db.execute(count_q)
        count = count_result.scalar() or 0
        resp = ReportListResponse.model_validate(r)
        resp.vulnerability_count = count
        response.append(resp)
    return response


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(data: ReportCreate, db: AsyncSession = Depends(get_db)):
    report = Report(name=data.name, report_type=data.report_type)
    db.add(report)
    await db.flush()

    items = get_checklist_items(data.report_type)
    for item in items:
        check = SecurityCheck(
            report_id=report.id,
            checklist_type=item["checklist_type"],
            check_id=item["check_id"],
            category=item["category"],
            name=item["name"],
            short_description=item.get("short_description"),
            goal=item.get("goal"),
        )
        db.add(check)

    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(report_id: int, data: ReportUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    if data.name is not None:
        report.name = data.name
    await db.commit()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    await db.delete(report)
    await db.commit()
