import json

import pytest

pytestmark = pytest.mark.asyncio


# ── Sync endpoint ────────────────────────────────────────────────────────────

async def test_generate_sync(client):
    resp = await client.post("/api/ai/generate", json={"history": [{"role": "user", "content": "test"}]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["markdown"] == "mocked AI response"
    assert data["raw"] == "mocked AI response"


async def test_generate_sync_returns_fields(realistic_client):
    resp = await realistic_client.post(
        "/api/ai/generate",
        json={"history": [{"role": "user", "content": "test"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    fields = data["fields"]
    assert fields is not None
    assert fields["bug_name"] == "Cross-Site Scripting (XSS)"
    assert fields["cvss_score"] == 6.1
    assert fields["cvss_vector"].startswith("CVSS:4.0/")
    assert fields["bug_criticality"] == "medium"
    assert "XSS" in fields["bug_description"]
    assert "экранирование" in fields["remediation"]


async def test_generate_empty_history(client):
    resp = await client.post("/api/ai/generate", json={})
    assert resp.status_code == 200
    assert resp.json()["markdown"] == "mocked AI response"


# ── SSE streaming endpoint ───────────────────────────────────────────────────

def _parse_sse(text: str) -> list[tuple[str, str]]:
    """Parse SSE text into (event, decoded_data) pairs.

    Chunk data is JSON-encoded on the wire; this helper decodes it.
    """
    events = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        event, data = "", ""
        for line in block.split("\n"):
            if line.startswith("event: "):
                event = line[7:]
            elif line.startswith("data: "):
                data = line[6:]
        if event:
            # chunk data is JSON-encoded string, decode it
            if event == "chunk":
                try:
                    data = json.loads(data)
                except (json.JSONDecodeError, TypeError):
                    pass
            events.append((event, data))
    return events


async def test_stream_returns_sse_format(client):
    resp = await client.post(
        "/api/ai/generate/stream",
        json={"history": [{"role": "user", "content": "test"}]},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse(resp.text)
    chunk_events = [(e, d) for e, d in events if e == "chunk"]
    done_events = [(e, d) for e, d in events if e == "done"]

    # Should have chunk events with text content
    assert len(chunk_events) >= 1
    chunks_text = "".join(d for _, d in chunk_events)
    assert "mocked" in chunks_text

    # Should end with exactly one done event
    assert len(done_events) == 1


async def test_stream_sse_done_contains_parsed_fields(realistic_client):
    resp = await realistic_client.post(
        "/api/ai/generate/stream",
        json={"history": [{"role": "user", "content": "test"}]},
    )
    assert resp.status_code == 200

    events = _parse_sse(resp.text)
    done_events = [(e, d) for e, d in events if e == "done"]
    assert len(done_events) == 1

    fields = json.loads(done_events[0][1])
    assert fields["bug_name"] == "Cross-Site Scripting (XSS)"
    assert fields["cvss_score"] == 6.1
    assert fields["bug_criticality"] == "medium"
    assert "XSS" in fields["bug_description"]


async def test_stream_chunks_reconstruct_full_text(realistic_client):
    """Chunks (including ones with newlines) must reconstruct the original markdown."""
    resp = await realistic_client.post(
        "/api/ai/generate/stream",
        json={"history": [{"role": "user", "content": "test"}]},
    )
    events = _parse_sse(resp.text)
    chunks_text = "".join(d for e, d in events if e == "chunk")
    assert "Cross-Site Scripting" in chunks_text
    assert "Рекомендации" in chunks_text
    # Newlines must be preserved — markdown sections are separated by blank lines
    assert "\n\n###" in chunks_text


# ── Killchain (remains text/plain) ──────────────────────────────────────────

async def test_generate_killchain_stream(client):
    resp = await client.post(
        "/api/ai/generate/killchain/stream",
        json={"history": [{"role": "user", "content": "attack steps"}]},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    assert "mocked" in resp.text


# ── Summary ──────────────────────────────────────────────────────────────────

async def test_summary(client):
    resp = await client.post(
        "/api/ai/results/summary",
        json={"vulnerabilities_markdown": "## SQLi\nSQL injection in login form"},
    )
    assert resp.status_code == 200
    assert "summary_markdown" in resp.json()
