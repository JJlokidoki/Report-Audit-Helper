import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sync_status_empty(test_client: AsyncClient):
    resp = await test_client.get("/api/bzone/sync/status")
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_settings_get(test_client: AsyncClient):
    resp = await test_client.get("/api/bzone/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "providers" in data
    assert "has_token" in data
    assert isinstance(data["bz_companies"], list)


@pytest.mark.asyncio
async def test_settings_update(test_client: AsyncClient):
    resp = await test_client.put(
        "/api/bzone/settings",
        json={"llm_temperature": 0.5},
    )
    assert resp.status_code == 200
    assert resp.json()["llm_temperature"] == 0.5


@pytest.mark.asyncio
async def test_stats_empty(test_client: AsyncClient):
    resp = await test_client.get("/api/bzone/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_reports"] == 0
    assert data["by_company"] == {}
    assert data["last_sync"] is None
