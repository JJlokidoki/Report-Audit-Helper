from io import BytesIO
from pathlib import Path

from docx import Document

from app.filler import fill_template


def test_fill_template_replaces_placeholder(simple_template: Path):
    result = fill_template(simple_template, {"title": "Test Report"})
    assert isinstance(result, BytesIO)
    doc = Document(result)
    full_text = " ".join(p.text for p in doc.paragraphs)
    assert "Test Report" in full_text


def test_fill_template_empty_context(simple_template: Path):
    result = fill_template(simple_template, {})
    assert isinstance(result, BytesIO)
    doc = Document(result)
    assert doc is not None


def test_fill_template_returns_seeked_buffer(simple_template: Path):
    result = fill_template(simple_template, {"title": "X"})
    assert result.tell() == 0
