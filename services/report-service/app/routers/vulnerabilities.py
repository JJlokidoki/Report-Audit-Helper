from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Report, Vulnerability
from app.schemas import (
    VulnerabilityCreate, VulnerabilityUpdate, VulnerabilityResponse,
    VulnerabilityReorder, SeverityCounts, TestSummaryResponse,
)

router = APIRouter(prefix="/api/reports/{report_id}", tags=["vulnerabilities"])


@router.get("/test-summary", response_model=TestSummaryResponse)
async def get_test_summary(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Report not found")

    result = await db.execute(
        select(Vulnerability.bug_criticality, func.count())
        .where(Vulnerability.report_id == report_id)
        .group_by(Vulnerability.bug_criticality)
    )
    counts_raw = {row[0]: row[1] for row in result.all()}
    counts = SeverityCounts(
        critical=counts_raw.get("critical", 0),
        high=counts_raw.get("high", 0),
        medium=counts_raw.get("medium", 0),
        low=counts_raw.get("low", 0),
        info=counts_raw.get("info", 0),
    )

    result = await db.execute(
        select(Vulnerability)
        .where(Vulnerability.report_id == report_id)
        .order_by(Vulnerability.sort_order)
    )
    vulns = result.scalars().all()
    return TestSummaryResponse(counts=counts, vulnerabilities=vulns)


@router.get("/vulnerabilities", response_model=list[VulnerabilityResponse])
async def list_vulnerabilities(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vulnerability)
        .where(Vulnerability.report_id == report_id)
        .order_by(Vulnerability.sort_order)
    )
    return result.scalars().all()


@router.post("/vulnerabilities", response_model=VulnerabilityResponse, status_code=201)
async def create_vulnerability(report_id: int, data: VulnerabilityCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Report not found")

    max_order = await db.execute(
        select(func.coalesce(func.max(Vulnerability.sort_order), -1))
        .where(Vulnerability.report_id == report_id)
    )
    next_order = (max_order.scalar() or 0) + 1

    vuln = Vulnerability(report_id=report_id, sort_order=next_order, **data.model_dump())
    db.add(vuln)
    await db.commit()
    await db.refresh(vuln)
    return vuln


@router.put("/vulnerabilities/reorder", status_code=200)
async def reorder_vulnerabilities(report_id: int, data: VulnerabilityReorder, db: AsyncSession = Depends(get_db)):
    for item in data.orders:
        result = await db.execute(
            select(Vulnerability).where(Vulnerability.id == item["id"], Vulnerability.report_id == report_id)
        )
        vuln = result.scalar_one_or_none()
        if vuln:
            vuln.sort_order = item["sort_order"]
    await db.commit()
    return {"ok": True}


@router.get("/vulnerabilities/{vid}", response_model=VulnerabilityResponse)
async def get_vulnerability(report_id: int, vid: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vulnerability).where(Vulnerability.id == vid, Vulnerability.report_id == report_id)
    )
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(404, "Vulnerability not found")
    return vuln


@router.put("/vulnerabilities/{vid}", response_model=VulnerabilityResponse)
async def update_vulnerability(report_id: int, vid: int, data: VulnerabilityUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vulnerability).where(Vulnerability.id == vid, Vulnerability.report_id == report_id)
    )
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(404, "Vulnerability not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(vuln, field, value)
    await db.commit()
    await db.refresh(vuln)
    return vuln


@router.delete("/vulnerabilities/{vid}", status_code=204)
async def delete_vulnerability(report_id: int, vid: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vulnerability).where(Vulnerability.id == vid, Vulnerability.report_id == report_id)
    )
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(404, "Vulnerability not found")
    await db.delete(vuln)
    await db.commit()
