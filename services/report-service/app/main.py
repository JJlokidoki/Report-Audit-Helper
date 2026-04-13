import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine, init_db
from app.log import setup_logging
from app.preset_software import seed_preset_software
from app.preset_vulnerabilities import seed_preset_vulnerabilities
from app.pdf_template_defaults import seed_pdf_templates
from app.routers import reports, system_info, vulnerabilities, checklist, executors, software, vulnerability_templates, pdf_templates

logger = logging.getLogger(__name__)


async def _migrate(conn) -> None:
    """Add new columns to existing tables (idempotent)."""
    for stmt in [
        "ALTER TABLE software ADD COLUMN description VARCHAR(500)",
        "ALTER TABLE software ADD COLUMN is_preset BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE software ADD COLUMN labels TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE pdf_template ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE pdf_template ADD COLUMN label VARCHAR(255) NOT NULL DEFAULT ''",
        "ALTER TABLE pdf_template ADD COLUMN anchor VARCHAR(100) NOT NULL DEFAULT ''",
        "ALTER TABLE pdf_template ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE pdf_template ADD COLUMN is_numbered BOOLEAN NOT NULL DEFAULT 1",
        "ALTER TABLE pdf_template ADD COLUMN is_builtin BOOLEAN NOT NULL DEFAULT 0",
    ]:
        try:
            await conn.execute(text(stmt))
        except Exception:
            pass  # column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Report Service started")
    await init_db()
    async with engine.begin() as conn:
        await _migrate(conn)
    async with AsyncSession(engine) as db:
        await seed_preset_software(db)
        await seed_preset_vulnerabilities(db)
        await seed_pdf_templates(db)
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
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.debug("%s %s -> %d", request.method, request.url.path, response.status_code)
    return response


app.include_router(reports.router)
app.include_router(system_info.router)
app.include_router(vulnerabilities.router)
app.include_router(checklist.router)
app.include_router(executors.router)
app.include_router(software.router)
app.include_router(vulnerability_templates.router)
app.include_router(pdf_templates.router)
