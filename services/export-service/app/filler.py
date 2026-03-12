from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from docxtpl import DocxTemplate

from app.html_to_docx import enrich_context

_DRAWING_NS = {
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def _patch_missing_ns(buf: BytesIO) -> BytesIO:
    """Добавляет недостающие xmlns-декларации для drawing-элементов из Subdoc."""
    buf.seek(0)
    with ZipFile(buf, "r") as zin:
        xml = zin.read("word/document.xml").decode("utf-8")

        patches = [
            f'xmlns:{p}="{u}"'
            for p, u in _DRAWING_NS.items()
            if f"{p}:" in xml and f"xmlns:{p}=" not in xml
        ]
        if not patches:
            buf.seek(0)
            return buf

        xml = xml.replace(
            "<w:document ", "<w:document " + " ".join(patches) + " ", 1
        )

        files = {i.filename: zin.read(i.filename) for i in zin.infolist()}

    out = BytesIO()
    with ZipFile(out, "w") as zout:
        for name, data in files.items():
            zout.writestr(name, xml.encode("utf-8") if name == "word/document.xml" else data)
    out.seek(0)
    return out


def fill_template(template_path: Path, context: dict) -> BytesIO:
    """Заполняет docxtpl шаблон контекстом, конвертируя HTML-поля в RichText."""
    doc = DocxTemplate(str(template_path))
    doc.render(enrich_context(context, doc))
    buf = BytesIO()
    doc.save(buf)
    buf.seek(0)
    return _patch_missing_ns(buf)
