import pytest
import respx
import httpx
from io import BytesIO
from pathlib import Path
from docx import Document

from app import generator as gen_module
from app.generator import generate_report, _merge_docs, _build_contexts, _vuln_context
from app.config import settings


MOCK_REPORT = {"id": 1, "name": "Test", "report_type": "web"}
MOCK_SYSTEM_INFO = {
    "id": 1, "report_id": 1,
    "asName": "TestApp", "keId": "KE-1", "url": "https://test.com",
    "dateStart": "2024-01-01", "dateEnd": "2024-01-31",
    "segment": "DMZ", "goal": "Тестирование безопасности",
    "qualificationLevel": "Высокий", "accessLevel": "Внешний",
    "knowledgeLevel": "Чёрный ящик", "testConditions": "Без ограничений",
    "executors": [{"id": 1, "name": "Alice", "position": "Lead", "organization": "Corp"}],
    "software": [{"id": 1, "name": "Burp Suite", "version": "2024.1"}],
}
MOCK_SUMMARY = {
    "counts": {"critical": 1, "high": 0, "medium": 1, "low": 0, "info": 0},
    "vulnerabilities": [
        {"id": 1, "report_id": 1, "bug_name": "XSS", "bug_criticality": "critical",
         "bug_description": "desc", "cvss_score": 8.5, "cvss_vector": "AV:N",
         "reproduction_steps": "steps", "remediation": "fix", "automation_level": "no", "sort_order": 0},
        {"id": 2, "report_id": 1, "bug_name": "SQLI", "bug_criticality": "medium",
         "bug_description": None, "cvss_score": None, "cvss_vector": None,
         "reproduction_steps": None, "remediation": None, "automation_level": "no", "sort_order": 1},
    ],
}
MOCK_CHECKLIST = [
    {"id": 1, "report_id": 1, "checklist_type": "wstg", "check_id": "WSTG-INFO-01",
     "category": "Information Gathering", "name": "Разведка", "short_description": None,
     "goal": None, "status": "passed", "notes": "ok"},
]


def _make_template(tmp_path: Path, name: str, text: str = "{{ report_name }}") -> None:
    doc = Document()
    doc.add_paragraph(text)
    doc.save(str(tmp_path / name))


@pytest.fixture
def web_templates(tmp_path: Path):
    template_dir = tmp_path / "web"
    template_dir.mkdir()
    for name in ["01_title.docx", "02_toc.docx", "03_general_info.docx",
                 "04_test_results.docx", "07_checklist.docx"]:
        _make_template(template_dir, name)
    _make_template(template_dir, "05_vulnerability.docx", "{{ bug_name }}")
    return tmp_path


def test_build_contexts():
    ctx = _build_contexts(MOCK_REPORT, MOCK_SYSTEM_INFO, MOCK_SUMMARY, MOCK_CHECKLIST)
    assert ctx["01_title.docx"]["asName"] == "TestApp"
    assert ctx["04_test_results.docx"]["critical_count"] == 1
    checks = ctx["07_checklist.docx"]["checks"]
    assert len(checks) == len(MOCK_CHECKLIST)
    assert checks[0]["result"] == "Выполнено\nok"


def test_vuln_context():
    ctx = _vuln_context(MOCK_SUMMARY["vulnerabilities"][0])
    assert ctx["bug_name"] == "XSS"
    assert ctx["cvss_score"] == 8.5


def test_vuln_context_nulls():
    ctx = _vuln_context(MOCK_SUMMARY["vulnerabilities"][1])
    assert ctx["cvss_score"] == ""
    assert ctx["bug_description"] == ""


def test_merge_docs():
    docs = []
    for _ in range(2):
        doc = Document()
        doc.add_paragraph("Test")
        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)
        docs.append(buf)
    result = _merge_docs(docs)
    assert isinstance(result, BytesIO)
    assert result.tell() == 0


@pytest.mark.asyncio
async def test_generate_report_success(web_templates: Path, monkeypatch):
    monkeypatch.setattr(gen_module.settings, "template_dir", web_templates)
    base_url = settings.report_service_url

    with respx.mock:
        respx.get(f"{base_url}/api/reports/1").mock(return_value=httpx.Response(200, json=MOCK_REPORT))
        respx.get(f"{base_url}/api/reports/1/system-info").mock(return_value=httpx.Response(200, json=MOCK_SYSTEM_INFO))
        respx.get(f"{base_url}/api/reports/1/test-summary").mock(return_value=httpx.Response(200, json=MOCK_SUMMARY))
        respx.get(f"{base_url}/api/reports/1/checklist").mock(return_value=httpx.Response(200, json=MOCK_CHECKLIST))

        result = await generate_report(1)

    assert isinstance(result, BytesIO)
    doc = Document(result)
    assert doc is not None


@pytest.mark.asyncio
async def test_generate_report_no_templates(tmp_path: Path, monkeypatch):
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    monkeypatch.setattr(gen_module.settings, "template_dir", tmp_path)
    base_url = settings.report_service_url

    with respx.mock:
        respx.get(f"{base_url}/api/reports/1").mock(return_value=httpx.Response(200, json=MOCK_REPORT))
        respx.get(f"{base_url}/api/reports/1/system-info").mock(return_value=httpx.Response(200, json=MOCK_SYSTEM_INFO))
        respx.get(f"{base_url}/api/reports/1/test-summary").mock(return_value=httpx.Response(200, json=MOCK_SUMMARY))
        respx.get(f"{base_url}/api/reports/1/checklist").mock(return_value=httpx.Response(200, json=MOCK_CHECKLIST))

        with pytest.raises(FileNotFoundError):
            await generate_report(1)
