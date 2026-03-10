from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SecurityCheck
from app.schemas import SecurityCheckUpdate, SecurityCheckResponse

router = APIRouter(prefix="/api/reports/{report_id}/checklist", tags=["checklist"])


@router.get("", response_model=list[SecurityCheckResponse])
async def get_checklist(
    report_id: int,
    status: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(SecurityCheck).where(SecurityCheck.report_id == report_id)
    if status:
        query = query.where(SecurityCheck.status == status)
    if category:
        query = query.where(SecurityCheck.category == category)
    query = query.order_by(SecurityCheck.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{check_id}", response_model=SecurityCheckResponse)
async def update_check(
    report_id: int,
    check_id: str,
    data: SecurityCheckUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SecurityCheck).where(
            SecurityCheck.report_id == report_id,
            SecurityCheck.check_id == check_id,
        )
    )
    check = result.scalar_one_or_none()
    if not check:
        raise HTTPException(404, "Check not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(check, field, value)
    await db.commit()
    await db.refresh(check)
    return check
