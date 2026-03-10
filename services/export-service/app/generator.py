from io import BytesIO
from pathlib import Path

import httpx
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docxcompose.composer import Composer

from app.config import settings
from app.filler import fill_template

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

STATUS_LABEL = {
    "passed": "Выполнено",
    "failed": "Сломано",
    "not_applicable": "Не применимо",
    "not_tested": "Не выполнено",
}

TEMPLATE_FILES = [
    "01_title.docx",
    "02_toc.docx",
    "03_general_info.docx",
    "04_test_results.docx",
    "06_threat_classification.docx",
    "07_checklist.docx",
]

VULN_TEMPLATE = "05_vulnerability.docx"


async def _fetch(client: httpx.AsyncClient, path: str) -> dict:
    resp = await client.get(f"{settings.report_service_url}/api{path}")
    resp.raise_for_status()
    return resp.json()


def _build_contexts(report: dict, system_info: dict, summary: dict, checklist: list) -> dict[str, dict]:
    """Собирает контексты для каждого шаблона."""
    executors_str = ", ".join(e["name"] for e in system_info.get("executors", []))
    software_list = system_info.get("software", [])
    counts = summary.get("counts", {})

    base = {
        "report_name": report.get("name", ""),
        "report_type": report.get("report_type", ""),
        "asName": system_info.get("asName") or "",
        "keId": system_info.get("keId") or "",
        "url": system_info.get("url") or "",
        "dateStart": system_info.get("dateStart") or "",
        "dateEnd": system_info.get("dateEnd") or "",
        "segment": system_info.get("segment") or "",
        "goal": system_info.get("goal") or "",
        "qualificationLevel": system_info.get("qualificationLevel") or "",
        "accessLevel": system_info.get("accessLevel") or "",
        "knowledgeLevel": system_info.get("knowledgeLevel") or "",
        "testConditions": system_info.get("testConditions") or "",
        "executors": executors_str,
        "executors_list": system_info.get("executors", []),
        "software_list": software_list,
    }

    test_results = {
        **base,
        "critical_count": counts.get("critical", 0),
        "high_count": counts.get("high", 0),
        "medium_count": counts.get("medium", 0),
        "low_count": counts.get("low", 0),
        "info_count": counts.get("info", 0),
        "total_count": sum(counts.values()),
    }

    def _check_result(check: dict) -> str:
        label = STATUS_LABEL.get(check.get("status", ""), check.get("status", ""))
        notes = (check.get("notes") or "").strip()
        return f"{label}\n{notes}" if notes else label

    enriched_checks = [{**c, "result": _check_result(c)} for c in checklist]
    checklist_ctx = {**base, "checks": enriched_checks}

    return {
        "01_title.docx": base,
        "02_toc.docx": base,
        "03_general_info.docx": base,
        "04_test_results.docx": test_results,
        "06_threat_classification.docx": base,
        "07_checklist.docx": checklist_ctx,
    }


def _vuln_context(vuln: dict) -> dict:
    return {
        "bug_name": vuln.get("bug_name", ""),
        "bug_criticality": vuln.get("bug_criticality", ""),
        "cvss_score": vuln.get("cvss_score") or "",
        "cvss_vector": vuln.get("cvss_vector") or "",
        "bug_description": vuln.get("bug_description") or "",
        "reproduction_steps": vuln.get("reproduction_steps") or "",
        "remediation": vuln.get("remediation") or "",
        "automation_level": vuln.get("automation_level", ""),
    }


def _prepend_page_break(doc: Document) -> None:
    p = OxmlElement("w:p")
    r = OxmlElement("w:r")
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    r.append(br)
    p.append(r)
    doc.element.body.insert(0, p)


def _merge_docs(docs: list[BytesIO]) -> BytesIO:
    """Сливает список BytesIO docx в один документ."""
    if not docs:
        raise ValueError("No documents to merge")

    master = Document(docs[0])
    composer = Composer(master)
    for doc_buf in docs[1:]:
        sub = Document(doc_buf)
        _prepend_page_break(sub)
        composer.append(sub)

    result = BytesIO()
    composer.save(result)
    result.seek(0)
    return result


async def generate_report(report_id: int) -> BytesIO:
    async with httpx.AsyncClient(timeout=30, trust_env=False) as client:
        report = await _fetch(client, f"/reports/{report_id}")
        system_info = await _fetch(client, f"/reports/{report_id}/system-info")
        summary = await _fetch(client, f"/reports/{report_id}/test-summary")
        checklist = await _fetch(client, f"/reports/{report_id}/checklist")

    report_type = report.get("report_type", "web")
    template_dir = Path(settings.template_dir) / report_type

    vulnerabilities = sorted(
        summary.get("vulnerabilities", []),
        key=lambda v: SEVERITY_ORDER.get(v.get("bug_criticality", "info"), 99),
    )

    contexts = _build_contexts(report, system_info, summary, checklist)

    filled_docs: list[BytesIO] = []

    for filename in TEMPLATE_FILES:
        path = template_dir / filename
        if not path.exists():
            continue
        ctx = contexts.get(filename, {})
        filled_docs.append(fill_template(path, ctx))

        # После 04_test_results вставляем уязвимости
        if filename == "04_test_results.docx":
            vuln_path = template_dir / VULN_TEMPLATE
            if vuln_path.exists() and vulnerabilities:
                for vuln in vulnerabilities:
                    filled_docs.append(fill_template(vuln_path, _vuln_context(vuln)))

    if not filled_docs:
        raise FileNotFoundError(f"No templates found in {template_dir}")

    return _merge_docs(filled_docs)
