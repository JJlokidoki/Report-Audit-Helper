import asyncio

import pytest
from io import BytesIO

from docx import Document


def _make_docx(text: str) -> bytes:
    doc = Document()
    doc.add_paragraph(text)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


async def _wait_indexed(client, doc_id: str, timeout: float = 5.0) -> dict:
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        resp = await client.get("/api/archive/documents")
        for d in resp.json():
            if d["doc_id"] == doc_id and d["status"] != "processing":
                return d
        await asyncio.sleep(0.1)
    raise TimeoutError(f"Document {doc_id} not indexed in {timeout}s")


@pytest.mark.asyncio
async def test_upload_returns_processing(client):
    content = _make_docx("## Test Vulnerability\nКритичность: Высокий\nОписание тестовой уязвимости")
    resp = await client.post(
        "/api/archive/documents/upload",
        files={"file": ("test.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"report_type": "web"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "processing"
    assert data["doc_id"]
    assert data["system_name"] is None
    assert data["vulnerability_count"] is None
    assert data["completion_date"] is None


@pytest.mark.asyncio
async def test_upload_becomes_indexed(client):
    content = _make_docx(
        "Система: Тест-Банк\n"
        "Дата завершения: 15.03.2026\n\n"
        "## SQL Injection\nКритичность: Высокий\nОписание\n\n"
        "## XSS\nКритичность: Средний\nОписание"
    )
    resp = await client.post(
        "/api/archive/documents/upload",
        files={"file": ("test.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    doc_id = resp.json()["doc_id"]

    doc = await _wait_indexed(client, doc_id)
    assert doc["status"] == "indexed"
    assert doc["chunk_count"] > 0
    assert doc["system_name"] == "Тест-Банк"
    assert doc["vulnerability_count"] == 2
    assert doc["completion_date"] == "15.03.2026"


@pytest.mark.asyncio
async def test_upload_unsupported_format(client):
    resp = await client.post(
        "/api/archive/documents/upload",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_documents_empty(client):
    resp = await client.get("/api/archive/documents")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_upload_and_list(client):
    content = _make_docx("Some vulnerability description for testing")
    resp = await client.post(
        "/api/archive/documents/upload",
        files={"file": ("report.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    doc_id = resp.json()["doc_id"]
    await _wait_indexed(client, doc_id)

    resp = await client.get("/api/archive/documents")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert "created_at" in docs[0]


@pytest.mark.asyncio
async def test_upload_and_delete(client):
    content = _make_docx("Vulnerability to delete")
    upload_resp = await client.post(
        "/api/archive/documents/upload",
        files={"file": ("del.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    doc_id = upload_resp.json()["doc_id"]
    await _wait_indexed(client, doc_id)

    del_resp = await client.delete(f"/api/archive/documents/{doc_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    resp = await client.get("/api/archive/documents")
    assert all(d["doc_id"] != doc_id for d in resp.json())


@pytest.mark.asyncio
async def test_search_after_upload(client):
    content = _make_docx("## SQL Injection в Keycloak\nКритичность: Высокий\nОбнаружена SQL-инъекция в модуле авторизации Keycloak")
    resp = await client.post(
        "/api/archive/documents/upload",
        files={"file": ("kc.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"technology": "keycloak", "report_type": "web"},
    )
    doc_id = resp.json()["doc_id"]
    await _wait_indexed(client, doc_id)

    resp = await client.post("/api/archive/search", json={"query": "keycloak", "top_k": 5})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] > 0


@pytest.mark.asyncio
async def test_settings_get(client):
    resp = await client.get("/api/archive/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "embedding_provider" in data
    assert "providers" in data


@pytest.mark.asyncio
async def test_stats(client):
    resp = await client.get("/api/archive/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_documents" in data
    assert "total_chunks" in data
