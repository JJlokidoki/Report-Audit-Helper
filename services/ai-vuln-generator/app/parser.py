"""Deterministic parser for LLM-generated vulnerability markdown."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

SEVERITY_MAP: dict[str, str] = {
    "критический": "critical",
    "высокий": "high",
    "средний": "medium",
    "низкий": "low",
    "информационный": "info",
}

_H2_RE = re.compile(r"^##\s+(.+)$", re.MULTILINE)
_H3_SPLIT_RE = re.compile(r"^###\s+", re.MULTILINE)
_H3_RE = re.compile(r"^###\s+(.+)$", re.MULTILINE)

_CVSS_SCORE_RE = re.compile(r"\*\*CVSS\*\*\s*\|\s*([\d]+(?:\.[\d]+)?)")
_CVSS_VECTOR_RE = re.compile(r"\*\*CVSS-вектор\*\*\s*\|\s*(CVSS:[^\s|]+)")
_SEVERITY_RE = re.compile(r"\*\*Уровень опасности\*\*\s*\|\s*([^\n|]+)")


@dataclass
class VulnFields:
    bug_name: str | None = None
    bug_description: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    bug_criticality: str | None = None

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}


def _extract_section(md: str, heading_keyword: str) -> str | None:
    """Extract content under an H3 section matching heading_keyword (case-insensitive)."""
    sections = _H3_SPLIT_RE.split(md)
    for section in sections[1:]:  # skip text before first H3
        first_line, _, body = section.partition("\n")
        if heading_keyword.lower() in first_line.lower():
            return body.strip() or None
    return None


def _extract_severity(md: str) -> str | None:
    m = _SEVERITY_RE.search(md)
    if not m:
        return None
    text = m.group(1).strip().lower()
    for ru, en in SEVERITY_MAP.items():
        if ru in text:
            return en
    return None


def parse_vuln_markdown(md: str) -> VulnFields:
    """Parse vulnerability markdown into structured fields."""
    fields = VulnFields()

    # Title — first H2
    h2 = _H2_RE.search(md)
    if h2:
        fields.bug_name = h2.group(1).strip()

    # CVSS score
    m = _CVSS_SCORE_RE.search(md)
    if m:
        try:
            fields.cvss_score = float(m.group(1))
        except ValueError:
            pass

    # CVSS vector
    m = _CVSS_VECTOR_RE.search(md)
    if m:
        fields.cvss_vector = m.group(1).strip()

    # Severity
    fields.bug_criticality = _extract_severity(md)

    # H3 sections
    fields.bug_description = _extract_section(md, "описание")
    fields.reproduction_steps = _extract_section(md, "шаги")
    fields.remediation = _extract_section(md, "рекомендации")

    return fields
