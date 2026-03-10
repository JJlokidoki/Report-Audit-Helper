from io import BytesIO
from pathlib import Path

from docxtpl import DocxTemplate


def fill_template(template_path: Path, context: dict) -> BytesIO:
    """Заполняет docxtpl шаблон контекстом, возвращает BytesIO."""
    doc = DocxTemplate(str(template_path))
    doc.render(context)
    buf = BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf
