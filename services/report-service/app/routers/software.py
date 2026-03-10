from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Software
from app.schemas import SoftwareCreate, SoftwareUpdate, SoftwareResponse

router = APIRouter(prefix="/api/software", tags=["software"])


@router.get("", response_model=list[SoftwareResponse])
async def list_software(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Software).order_by(Software.name))
    return result.scalars().all()


@router.post("", response_model=SoftwareResponse, status_code=201)
async def create_software(data: SoftwareCreate, db: AsyncSession = Depends(get_db)):
    sw = Software(**data.model_dump())
    db.add(sw)
    await db.commit()
    await db.refresh(sw)
    return sw


@router.put("/{software_id}", response_model=SoftwareResponse)
async def update_software(software_id: int, data: SoftwareUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Software).where(Software.id == software_id))
    sw = result.scalar_one_or_none()
    if not sw:
        raise HTTPException(404, "Software not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sw, field, value)
    await db.commit()
    await db.refresh(sw)
    return sw


@router.delete("/{software_id}", status_code=204)
async def delete_software(software_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Software).where(Software.id == software_id))
    sw = result.scalar_one_or_none()
    if not sw:
        raise HTTPException(404, "Software not found")
    await db.delete(sw)
    await db.commit()
