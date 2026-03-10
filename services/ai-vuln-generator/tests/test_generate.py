import pytest

pytestmark = pytest.mark.asyncio


async def test_generate_sync(client):
    resp = await client.post("/api/ai/generate", json={"history": [{"role": "user", "content": "test"}]})
    assert resp.status_code == 200
    data = resp.json()
    assert "markdown" in data
    assert "raw" in data
    assert data["markdown"] == "mocked AI response"


async def test_generate_stream(client):
    resp = await client.post("/api/ai/generate/stream", json={"history": [{"role": "user", "content": "test"}]})
    assert resp.status_code == 200
    assert "mocked" in resp.text


async def test_generate_killchain_stream(client):
    resp = await client.post(
        "/api/ai/generate/killchain/stream",
        json={"history": [{"role": "user", "content": "attack steps"}]},
    )
    assert resp.status_code == 200
    assert "mocked" in resp.text


async def test_generate_empty_history(client):
    resp = await client.post("/api/ai/generate", json={})
    assert resp.status_code == 200
    assert resp.json()["markdown"] == "mocked AI response"



async def test_summary(client):
    resp = await client.post(
        "/api/ai/results/summary",
        json={"vulnerabilities_markdown": "## SQLi\nSQL injection in login form"},
    )
    assert resp.status_code == 200
    assert "summary_markdown" in resp.json()
