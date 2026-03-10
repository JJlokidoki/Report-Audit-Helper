from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Report, SystemInfo, Executor, Software
from app.schemas import SystemInfoUpdate, SystemInfoResponse, ExecutorIds, SoftwareIds

router = APIRouter(prefix="/api/reports/{report_id}/system-info", tags=["system-info"])

_SI_OPTIONS = (selectinload(SystemInfo.executors), selectinload(SystemInfo.software))


async def _get_system_info(report_id: int, db: AsyncSession) -> SystemInfo:
    """Возвращает SystemInfo с eagerly-loaded relationships. Создаёт при первом обращении."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Report not found")

    result = await db.execute(
        select(SystemInfo).where(SystemInfo.report_id == report_id).options(*_SI_OPTIONS)
    )
    info = result.scalar_one_or_none()
    if not info:
        info = SystemInfo(report_id=report_id)
        db.add(info)
        await db.flush()
        result = await db.execute(
            select(SystemInfo).where(SystemInfo.id == info.id).options(*_SI_OPTIONS)
        )
        info = result.scalar_one()
    return info


async def _reload(info_id: int, db: AsyncSession) -> SystemInfo:
    result = await db.execute(
        select(SystemInfo).where(SystemInfo.id == info_id).options(*_SI_OPTIONS)
    )
    return result.scalar_one()


@router.get("", response_model=SystemInfoResponse)
async def get_system_info(report_id: int, db: AsyncSession = Depends(get_db)):
    info = await _get_system_info(report_id, db)
    await db.commit()
    return info


@router.put("", response_model=SystemInfoResponse)
async def update_system_info(report_id: int, data: SystemInfoUpdate, db: AsyncSession = Depends(get_db)):
    info = await _get_system_info(report_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(info, field, value)
    await db.commit()
    return await _reload(info.id, db)


@router.put("/executors", response_model=SystemInfoResponse)
async def set_executors(report_id: int, data: ExecutorIds, db: AsyncSession = Depends(get_db)):
    info = await _get_system_info(report_id, db)
    result = await db.execute(select(Executor).where(Executor.id.in_(data.executor_ids)))
    info.executors = list(result.scalars().all())
    await db.commit()
    return await _reload(info.id, db)


@router.put("/software", response_model=SystemInfoResponse)
async def set_software(report_id: int, data: SoftwareIds, db: AsyncSession = Depends(get_db)):
    info = await _get_system_info(report_id, db)
    result = await db.execute(select(Software).where(Software.id.in_(data.software_ids)))
    info.software = list(result.scalars().all())
    await db.commit()
    return await _reload(info.id, db)
