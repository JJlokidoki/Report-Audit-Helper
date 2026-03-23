import logging
import platform
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.log import setup_logging
from app.config import settings
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


# ── Template management ───────────────────────────────────────────────────────

REPORT_TYPES = ["web", "ios", "android", "ai", "iot"]

ALLOWED_TEMPLATES = [
    "01_title.docx",
    "02_toc.docx",
    "03_general_info.docx",
    "04_test_results.docx",
    "05_vulnerability.docx",
    "06_threat_classification.docx",
    "07_checklist.docx",
]


def _validate_template_params(report_type: str, filename: str) -> None:
    if report_type not in REPORT_TYPES:
        raise HTTPException(404, "Unknown report type")
    if filename not in ALLOWED_TEMPLATES:
        raise HTTPException(400, f"Invalid template name. Allowed: {', '.join(ALLOWED_TEMPLATES)}")


@app.get("/api/templates")
async def list_templates():
    """List all template files grouped by report type."""
    result = {}
    for rt in REPORT_TYPES:
        d = settings.template_dir / rt
        existing = {f.name for f in d.glob("*.docx")} if d.is_dir() else set()
        result[rt] = [
            {"filename": name, "exists": name in existing}
            for name in ALLOWED_TEMPLATES
        ]
    return result


@app.get("/api/templates/{report_type}/{filename}")
async def download_template(report_type: str, filename: str):
    _validate_template_params(report_type, filename)
    path = settings.template_dir / report_type / filename
    if not path.is_file():
        raise HTTPException(404, "Template not found")
    buf = path.read_bytes()
    return StreamingResponse(
        iter([buf]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.put("/api/templates/{report_type}/{filename}")
async def upload_template(report_type: str, filename: str, file: UploadFile):
    _validate_template_params(report_type, filename)
    d = settings.template_dir / report_type
    d.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    (d / filename).write_bytes(content)
    logger.info("Template uploaded: %s/%s (%d bytes)", report_type, filename, len(content))
    return {"status": "ok", "report_type": report_type, "filename": filename}
