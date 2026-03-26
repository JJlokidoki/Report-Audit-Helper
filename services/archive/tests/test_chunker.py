from app.chunker import Chunk, chunk_document


def test_single_section_small():
    text = "Простой текст без заголовков"
    chunks = chunk_document(text, "doc1", "upload", chunk_size=1000)
    assert len(chunks) == 1
    assert chunks[0].text == text
    assert chunks[0].metadata["doc_name"] == "doc1"
    assert chunks[0].metadata["source"] == "upload"


def test_multiple_sections():
    text = (
        "# Отчёт\nВводная часть\n\n"
        "## SQL Injection\nКритичность: Высокий\nОписание уязвимости\n\n"
        "## XSS\nКритичность: Средний\nОписание XSS"
    )
    chunks = chunk_document(text, "doc2", "upload", chunk_size=1000)
    assert len(chunks) == 3
    assert chunks[1].metadata["section"] == "SQL Injection"
    assert chunks[1].metadata["severity"] == "high"
    assert chunks[2].metadata["section"] == "XSS"
    assert chunks[2].metadata["severity"] == "medium"


def test_large_section_split():
    text = "## Big Section\n" + "\n\n".join(f"Paragraph {i} " * 30 for i in range(10))
    chunks = chunk_document(text, "doc3", "upload", chunk_size=200, chunk_overlap=20)
    assert len(chunks) > 1
    for c in chunks:
        assert c.metadata["section"] == "Big Section"


def test_extra_metadata():
    text = "Some content"
    chunks = chunk_document(
        text, "doc4", "report_service",
        extra_metadata={"report_type": "web", "technology": "nginx"},
    )
    assert chunks[0].metadata["report_type"] == "web"
    assert chunks[0].metadata["technology"] == "nginx"


def test_empty_text():
    chunks = chunk_document("", "empty", "upload")
    assert len(chunks) == 0 or all(c.text.strip() == "" for c in chunks)


def test_severity_extraction_variants():
    text = "## Vuln1\nКритичность: критический\nТекст"
    chunks = chunk_document(text, "d", "upload", chunk_size=1000)
    assert chunks[0].metadata["severity"] == "critical"

    text2 = "## Vuln2\nКритичность: low\nТекст"
    chunks2 = chunk_document(text2, "d", "upload", chunk_size=1000)
    assert chunks2[0].metadata["severity"] == "low"
