from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Executor
from app.schemas import ExecutorCreate, ExecutorUpdate, ExecutorResponse

router = APIRouter(prefix="/api/executors", tags=["executors"])


@router.get("", response_model=list[ExecutorResponse])
async def list_executors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Executor).order_by(Executor.name))
    return result.scalars().all()


@router.post("", response_model=ExecutorResponse, status_code=201)
async def create_executor(data: ExecutorCreate, db: AsyncSession = Depends(get_db)):
    executor = Executor(**data.model_dump())
    db.add(executor)
    await db.commit()
    await db.refresh(executor)
    return executor


@router.put("/{executor_id}", response_model=ExecutorResponse)
async def update_executor(executor_id: int, data: ExecutorUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Executor).where(Executor.id == executor_id))
    executor = result.scalar_one_or_none()
    if not executor:
        raise HTTPException(404, "Executor not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(executor, field, value)
    await db.commit()
    await db.refresh(executor)
    return executor


@router.delete("/{executor_id}", status_code=204)
async def delete_executor(executor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Executor).where(Executor.id == executor_id))
    executor = result.scalar_one_or_none()
    if not executor:
        raise HTTPException(404, "Executor not found")
    await db.delete(executor)
    await db.commit()
