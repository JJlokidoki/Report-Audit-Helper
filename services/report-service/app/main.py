import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import reports, system_info, vulnerabilities, checklist, executors, software

logger = logging.getLogger("report-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Report Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_stub(request: Request, call_next):
    logger.warning("Auth not implemented")
    return await call_next(request)


app.include_router(reports.router)
app.include_router(system_info.router)
app.include_router(vulnerabilities.router)
app.include_router(checklist.router)
app.include_router(executors.router)
app.include_router(software.router)
