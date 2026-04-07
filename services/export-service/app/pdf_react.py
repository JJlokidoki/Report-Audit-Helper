"""React SSR → HTML → WeasyPrint → PDF pipeline."""

import asyncio
import json
import logging
import platform
import subprocess
from io import BytesIO
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RENDERER_SCRIPT = Path(__file__).parent.parent / "renderer" / "dist" / "render.js"
MOCK_DATA_PATH = Path(__file__).parent.parent / "renderer" / "mock" / "data.json"
WEASYPRINT_EXE = Path(__file__).parent.parent / "bin" / "weasyprint.exe"


# ── Data fetching ────────────────────────────────────────────────────────────


async def fetch_report_data(report_id: int) -> dict:
    """Fetch all report data from Report Service. Returns ReportData dict."""
    async with httpx.AsyncClient(timeout=30, trust_env=False) as client:
        base = settings.report_service_url
        report = (await client.get(f"{base}/api/reports/{report_id}")).json()
        system_info = (await client.get(f"{base}/api/reports/{report_id}/system-info")).json()
        summary = (await client.get(f"{base}/api/reports/{report_id}/test-summary")).json()
        checklist = (await client.get(f"{base}/api/reports/{report_id}/checklist")).json()

    return {
        "report": report,
        "systemInfo": system_info,
        "summary": summary,
        "checklist": checklist,
    }


async def fetch_pdf_templates(report_type: str) -> list[dict]:
    """Fetch PDF templates from Report Service for a given report type."""
    async with httpx.AsyncClient(timeout=10, trust_env=False) as client:
        resp = await client.get(
            f"{settings.report_service_url}/api/pdf-templates",
            params={"report_type": report_type},
        )
        return resp.json() if resp.status_code == 200 else []


def extract_template_config(pdf_templates: list[dict]) -> tuple[str, list[str], dict[str, str]]:
    """Extract CSS, section order, and template content from DB templates.

    Returns: (global_css, section_order, db_templates)
    """
    global_css = next(
        (t["content"] for t in pdf_templates if t.get("section") == "styles"),
        "",
    )
    section_order = [
        t["section"] for t in pdf_templates if t.get("section") != "styles"
    ]
    db_templates = {
        t["section"]: t["content"]
        for t in pdf_templates
        if t.get("section") != "styles" and t.get("content")
    }
    return global_css, section_order, db_templates


def get_mock_data() -> dict:
    """Load mock data for preview rendering."""
    return json.loads(MOCK_DATA_PATH.read_text(encoding="utf-8"))


# ── React SSR ────────────────────────────────────────────────────────────────


def _render_sync(payload: str) -> str:
    """Run Node.js renderer synchronously (called from executor)."""
    result = subprocess.run(
        ["node", str(RENDERER_SCRIPT)],
        input=payload.encode(),
        capture_output=True,
        timeout=30,
    )
    if result.returncode != 0:
        error_msg = result.stderr.decode()[:500]
        logger.error("React renderer failed: %s", error_msg)
        raise RuntimeError(f"React render failed: {error_msg}")
    return result.stdout.decode()


async def render_to_html(
    report_type: str,
    data: dict,
    templates: dict[str, str] | None = None,
    global_css: str = "",
    section_order: list[str] | None = None,
) -> str:
    """Render React templates to HTML via Node.js subprocess."""
    payload = json.dumps({
        "reportType": report_type,
        "data": data,
        "templates": templates or {},
        "globalCss": global_css,
        "sectionOrder": section_order or [],
    })
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _render_sync, payload)


# ── WeasyPrint PDF ───────────────────────────────────────────────────────────


def _html_to_pdf_sync(html: str) -> bytes:
    """Convert HTML to PDF synchronously (called from executor)."""
    if platform.system() == "Windows" and WEASYPRINT_EXE.exists():
        result = subprocess.run(
            [str(WEASYPRINT_EXE), "-", "-"],
            input=html.encode("utf-8"),
            capture_output=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise RuntimeError(f"weasyprint.exe failed: {result.stderr.decode()[:500]}")
        return result.stdout
    else:
        import weasyprint
        return weasyprint.HTML(string=html).write_pdf()


async def html_to_pdf(html: str) -> BytesIO:
    """Convert HTML to PDF via WeasyPrint (runs in executor)."""
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(None, _html_to_pdf_sync, html)
    buf = BytesIO(pdf_bytes)
    logger.info("PDF generated: %d bytes", len(pdf_bytes))
    return buf


# ── High-level pipelines ─────────────────────────────────────────────────────


async def generate_pdf(report_id: int) -> BytesIO:
    """Full PDF export: fetch data → fetch templates → React SSR → WeasyPrint → PDF."""
    data = await fetch_report_data(report_id)
    report_type = data["report"].get("report_type", "web")
    pdf_templates = await fetch_pdf_templates(report_type)
    global_css, section_order, db_templates = extract_template_config(pdf_templates)

    html = await render_to_html(
        report_type, data,
        templates=db_templates,
        global_css=global_css,
        section_order=section_order,
    )
    return await html_to_pdf(html)


async def render_preview(
    report_type: str,
    section: str | None = None,
    content: str | None = None,
    css: str | None = None,
    section_order: list[str] | None = None,
) -> str:
    """Render preview with mock data. Returns HTML string."""
    data = get_mock_data()
    return await render_to_html(
        report_type=report_type,
        data=data,
        templates={section: content} if section and content else {},
        global_css=css or "",
        section_order=section_order,
    )
