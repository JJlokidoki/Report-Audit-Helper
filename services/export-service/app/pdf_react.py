"""React SSR bridge: calls Node.js subprocess to render templates, then WeasyPrint for PDF."""

import asyncio
import json
import logging
import platform
import subprocess
from io import BytesIO
from pathlib import Path

logger = logging.getLogger(__name__)

RENDERER_SCRIPT = Path(__file__).parent.parent / "renderer" / "dist" / "render.js"
MOCK_DATA_PATH = Path(__file__).parent.parent / "renderer" / "mock" / "data.json"


def _get_mock_data() -> dict:
    return json.loads(MOCK_DATA_PATH.read_text(encoding="utf-8"))


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


async def render_react_to_html(
    report_type: str,
    data: dict,
    templates: dict[str, str] | None = None,
    global_css: str = "",
) -> str:
    """Call Node.js subprocess to render React templates to HTML."""
    payload = json.dumps({
        "reportType": report_type,
        "data": data,
        "templates": templates or {},
        "globalCss": global_css,
    })
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _render_sync, payload)


async def render_preview(
    report_type: str,
    section: str | None = None,
    content: str | None = None,
    css: str | None = None,
) -> str:
    """Render a preview using mock data. Returns HTML string."""
    data = _get_mock_data()
    return await render_react_to_html(
        report_type=report_type,
        data=data,
        templates={section: content} if section and content else {},
        global_css=css or "",
    )


WEASYPRINT_EXE = Path(__file__).parent.parent / "bin" / "weasyprint.exe"


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
    """Convert HTML to PDF via WeasyPrint (runs in executor to avoid blocking)."""
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(None, _html_to_pdf_sync, html)
    buf = BytesIO(pdf_bytes)
    logger.info("PDF generated: %d bytes", len(pdf_bytes))
    return buf


async def generate_pdf_report(report_type: str, data: dict, global_css: str = "") -> BytesIO:
    """Full pipeline: React SSR → HTML → WeasyPrint → PDF."""
    html = await render_react_to_html(report_type, data, global_css=global_css)
    return await html_to_pdf(html)
