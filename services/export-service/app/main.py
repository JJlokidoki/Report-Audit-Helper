import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.generator import generate_report

logger = logging.getLogger("export-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Export Service", lifespan=lifespan)

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


@app.get("/api/export/{report_id}/word")
async def export_word(report_id: int):
    try:
        buf = await generate_report(report_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.exception("Export failed")
        raise HTTPException(500, f"Export failed: {e}")

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.docx"},
    )
