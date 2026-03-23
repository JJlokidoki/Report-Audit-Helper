import logging
import platform
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.log import setup_logging
from app.generator import generate_report
from app.pdf import docx_to_pdf

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Export Service started")
    yield


app = FastAPI(title="Export Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/export/{report_id}/word")
async def export_word(report_id: int):
    logger.info("Export requested: report_id=%d", report_id)
    try:
        buf = await generate_report(report_id)
    except FileNotFoundError as e:
        logger.warning("Templates not found: %s", e)
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.exception("Export failed: report_id=%d", report_id)
        raise HTTPException(500, f"Export failed: {e}")

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.docx"},
    )


@app.get("/api/export/{report_id}/pdf")
async def export_pdf(report_id: int):
    if platform.system() == "Windows":
        raise HTTPException(
            501,
            "PDF-генерация реализована только в Linux-окружении с LibreOffice",
        )

    logger.info("PDF export requested: report_id=%d", report_id)
    try:
        docx_buf = await generate_report(report_id)
        pdf_buf = await docx_to_pdf(docx_buf)
    except FileNotFoundError as e:
        logger.warning("Templates not found: %s", e)
        raise HTTPException(404, str(e))
    except RuntimeError as e:
        logger.error("PDF conversion failed: %s", e)
        raise HTTPException(500, str(e))
    except Exception as e:
        logger.exception("PDF export failed: report_id=%d", report_id)
        raise HTTPException(500, f"PDF export failed: {e}")

    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"},
    )
