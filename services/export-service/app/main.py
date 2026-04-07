import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.log import setup_logging
from app.config import settings
from app.generator import generate_report

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


# ── Export endpoints ─────────────────────────────────────────────────────────


@app.get("/api/export/config")
async def export_config():
    return {"engine": settings.export_engine}


@app.get("/api/export/{report_id}/word")
async def export_word(report_id: int):
    if settings.export_engine == "pdf":
        raise HTTPException(501, "DOCX export not enabled (EXPORT_ENGINE=pdf)")

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
    if settings.export_engine == "docx":
        raise HTTPException(501, "PDF export not enabled (EXPORT_ENGINE=docx)")

    logger.info("PDF export requested: report_id=%d", report_id)
    try:
        from app.pdf_react import generate_pdf
        pdf_buf = await generate_pdf(report_id)
    except FileNotFoundError as e:
        logger.warning("Templates not found: %s", e)
        raise HTTPException(404, str(e))
    except RuntimeError as e:
        logger.error("PDF render failed: %s", e)
        raise HTTPException(500, str(e))
    except Exception as e:
        logger.exception("PDF export failed: report_id=%d", report_id)
        raise HTTPException(500, f"PDF export failed: {e}")

    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"},
    )


# ── DOCX template management ────────────────────────────────────────────────

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


# ── PDF template preview ────────────────────────────────────────────────────


def _parse_preview_body(body: dict) -> dict:
    return {
        "report_type": body.get("report_type", "web"),
        "section": body.get("section"),
        "content": body.get("content"),
        "css": body.get("css"),
        "section_order": body.get("section_order"),
    }


@app.post("/api/pdf-templates/preview")
async def preview_pdf_template(body: dict):
    """Render PDF template with mock data → HTML."""
    from app.pdf_react import render_preview

    params = _parse_preview_body(body)
    try:
        html = await render_preview(**params)
        return {"html": html}
    except Exception as e:
        logger.exception("Preview render failed")
        raise HTTPException(500, f"Preview failed: {e}")


@app.post("/api/pdf-templates/preview-pdf")
async def preview_pdf_template_as_pdf(body: dict):
    """Render PDF template with mock data → PDF binary."""
    from app.pdf_react import render_preview, html_to_pdf

    params = _parse_preview_body(body)
    try:
        html = await render_preview(**params)
        pdf_buf = await html_to_pdf(html)
        return StreamingResponse(pdf_buf, media_type="application/pdf")
    except Exception as e:
        logger.exception("PDF preview render failed")
        raise HTTPException(500, f"PDF preview failed: {e}")
