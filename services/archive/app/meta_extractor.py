import re
from dataclasses import dataclass


@dataclass
class DocumentMeta:
    system_name: str | None = None
    vulnerability_count: int | None = None
    completion_date: str | None = None


_SYSTEM_PATTERNS = [
    re.compile(r"(?:Система|Тестируемая система|Наименование АС|Наименование системы|asName)\s*[:：]\s*(.+)", re.IGNORECASE),
    re.compile(r"^#\s+Отчёт\s*[:：]\s*(.+)", re.MULTILINE),
    re.compile(r"^#\s+Отчет\s*[:：]\s*(.+)", re.MULTILINE),
]

_DATE_PATTERNS = [
    re.compile(r"(?:Дата завершения|Дата окончания|dateEnd|Окончание тестирования)\s*[:：]\s*(.+)", re.IGNORECASE),
]

_DATE_RE = re.compile(r"\d{2}[./]\d{2}[./]\d{4}")

_VULN_SECTION_RE = re.compile(r"^#{2,3}\s+.+", re.MULTILINE)

_SEVERITY_MARKER_RE = re.compile(
    r"[Кк]ритичность\s*[:：]|CVSS|cvss_score|bug_criticality",
    re.IGNORECASE,
)


def extract_metadata(text: str) -> DocumentMeta:
    meta = DocumentMeta()

    for pat in _SYSTEM_PATTERNS:
        m = pat.search(text)
        if m:
            meta.system_name = m.group(1).strip().rstrip(".,;:")
            break

    for pat in _DATE_PATTERNS:
        m = pat.search(text)
        if m:
            raw = m.group(1).strip()
            dm = _DATE_RE.search(raw)
            meta.completion_date = dm.group(0) if dm else raw.split()[0] if raw else None
            break

    if meta.completion_date is None:
        dates = _DATE_RE.findall(text)
        if dates:
            meta.completion_date = dates[-1]

    sections = _VULN_SECTION_RE.findall(text)
    vuln_count = 0
    for section_start in sections:
        idx = text.index(section_start)
        section_end = len(text)
        next_match = _VULN_SECTION_RE.search(text, idx + len(section_start))
        if next_match:
            section_end = next_match.start()
        section_text = text[idx:section_end]
        if _SEVERITY_MARKER_RE.search(section_text):
            vuln_count += 1

    meta.vulnerability_count = vuln_count if vuln_count > 0 else None

    return meta
