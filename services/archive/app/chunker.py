import re
from dataclasses import dataclass, field


@dataclass
class Chunk:
    text: str
    metadata: dict = field(default_factory=dict)


_SEVERITY_MAP = {
    "критический": "critical",
    "критичный": "critical",
    "critical": "critical",
    "высокий": "high",
    "высокая": "high",
    "high": "high",
    "средний": "medium",
    "средняя": "medium",
    "medium": "medium",
    "низкий": "low",
    "низкая": "low",
    "low": "low",
    "информационный": "info",
    "информационная": "info",
    "info": "info",
}

_SEVERITY_RE = re.compile(
    r"[Кк]ритичность:\s*(\S+)", re.IGNORECASE
)


def _extract_severity(text: str) -> str:
    m = _SEVERITY_RE.search(text)
    if m:
        raw = m.group(1).lower().rstrip(".,;:")
        return _SEVERITY_MAP.get(raw, raw)
    return ""


def _split_by_sections(text: str) -> list[dict]:
    pattern = re.compile(r"^(#{2,3})\s+(.+)$", re.MULTILINE)
    matches = list(pattern.finditer(text))

    if not matches:
        return [{"text": text.strip(), "metadata": {}}]

    sections: list[dict] = []

    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            sections.append({"text": preamble, "metadata": {}})

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[start:end].strip()
        section_name = match.group(2).strip()
        severity = _extract_severity(section_text)
        sections.append({
            "text": section_text,
            "metadata": {"section": section_name, "severity": severity},
        })

    return sections


def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if current and len(current) + len(para) + 2 > chunk_size:
            chunks.append(current.strip())
            if overlap > 0:
                current = current[-overlap:] + "\n\n" + para
            else:
                current = para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    return chunks


def chunk_document(
    text: str,
    doc_name: str,
    source_type: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    extra_metadata: dict | None = None,
) -> list[Chunk]:
    base_meta = {
        "source": source_type,
        "doc_name": doc_name,
        **(extra_metadata or {}),
    }

    sections = _split_by_sections(text)
    chunks: list[Chunk] = []

    for section in sections:
        section_meta = {**base_meta, **section.get("metadata", {})}
        section_text = section["text"]

        if len(section_text) <= chunk_size:
            chunks.append(Chunk(text=section_text, metadata=section_meta))
        else:
            for sub in _split_text(section_text, chunk_size, chunk_overlap):
                chunks.append(Chunk(text=sub, metadata=section_meta))

    return chunks
