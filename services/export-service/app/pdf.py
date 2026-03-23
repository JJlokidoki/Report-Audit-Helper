import asyncio
import logging
import shutil
import tempfile
from io import BytesIO
from pathlib import Path

logger = logging.getLogger(__name__)


def _find_libreoffice() -> str | None:
    """Ищет libreoffice в PATH."""
    for name in ("libreoffice", "soffice"):
        path = shutil.which(name)
        if path:
            return path
    return None


async def docx_to_pdf(docx_buf: BytesIO) -> BytesIO:
    """Конвертирует DOCX (BytesIO) в PDF через LibreOffice headless."""
    lo_path = _find_libreoffice()
    if not lo_path:
        raise RuntimeError("LibreOffice не найден. Установите: apt-get install libreoffice-writer")

    with tempfile.TemporaryDirectory() as tmpdir:
        docx_path = Path(tmpdir) / "report.docx"
        docx_path.write_bytes(docx_buf.getvalue())

        proc = await asyncio.create_subprocess_exec(
            lo_path,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", tmpdir,
            str(docx_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)

        if proc.returncode != 0:
            logger.error("LibreOffice stderr: %s", stderr.decode(errors="replace"))
            raise RuntimeError(f"LibreOffice завершился с кодом {proc.returncode}")

        pdf_path = Path(tmpdir) / "report.pdf"
        if not pdf_path.exists():
            raise RuntimeError("PDF-файл не был создан LibreOffice")

        result = BytesIO(pdf_path.read_bytes())
        logger.info("PDF generated: %d bytes", len(result.getvalue()))
        return result
