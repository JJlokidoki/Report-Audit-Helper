import pytest

from app.chunker import Chunk
from app.vectorstore import VectorStore


@pytest.fixture()
def store(tmp_store, mock_provider):
    from unittest.mock import patch
    with patch("app.vectorstore.settings.embedding_dimensions", 8):
        vs = VectorStore(str(tmp_store / "vs"))
        chunks = [
            Chunk(text="SQL Injection в модуле авторизации", metadata={
                "doc_name": "report-1", "source": "upload",
                "section": "SQL Injection", "severity": "critical",
                "technology": "keycloak", "report_type": "web",
            }),
            Chunk(text="XSS в поле поиска на главной странице", metadata={
                "doc_name": "report-1", "source": "upload",
                "section": "XSS", "severity": "high",
                "technology": "", "report_type": "web",
            }),
            Chunk(text="Устаревший модуль PDF viewer в браузере", metadata={
                "doc_name": "report-2", "source": "upload",
                "section": "Outdated PDF Module", "severity": "medium",
                "technology": "pdf.js", "report_type": "web",
            }),
        ]
        vs.add_chunks("doc-1", chunks[:2])
        vs.add_chunks("doc-2", chunks[2:])
        yield vs


def test_search_returns_results(store):
    results = store.search("SQL Injection", top_k=5)
    assert len(results) > 0
    assert any("SQL" in r["text"] for r in results)


def test_search_with_severity_filter(store):
    results = store.search("уязвимость", top_k=10, severity="critical")
    assert all(r["severity"] == "critical" for r in results)


def test_search_with_technology_filter(store):
    results = store.search("уязвимость", top_k=10, technology="keycloak")
    assert all("keycloak" in r["technology"] for r in results)


def test_search_empty_store(tmp_store, mock_provider):
    from unittest.mock import patch
    with patch("app.vectorstore.settings.embedding_dimensions", 8):
        vs = VectorStore(str(tmp_store / "empty_vs"))
        assert vs.total_chunks == 0


def test_list_documents(store):
    docs = store.list_documents()
    assert len(docs) == 2
    ids = {d["doc_id"] for d in docs}
    assert "doc-1" in ids
    assert "doc-2" in ids


def test_delete_document(store):
    store.delete_document("doc-1")
    docs = store.list_documents()
    ids = {d["doc_id"] for d in docs}
    assert "doc-1" not in ids
    assert "doc-2" in ids
