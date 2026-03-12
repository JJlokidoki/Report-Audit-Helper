import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_crud_executor(client: AsyncClient):
    resp = await client.post("/api/executors", json={"name": "Alice"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alice"
    assert "position" not in data
    eid = data["id"]

    resp = await client.get("/api/executors")
    assert len(resp.json()) == 1

    resp = await client.put(f"/api/executors/{eid}", json={"name": "Alice Updated"})
    assert resp.json()["name"] == "Alice Updated"

    resp = await client.delete(f"/api/executors/{eid}")
    assert resp.status_code == 204

    resp = await client.get("/api/executors")
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_crud_software(client: AsyncClient):
    resp = await client.post("/api/software", json={"name": "Custom Tool", "description": "Test tool"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Custom Tool"
    assert data["description"] == "Test tool"
    assert data["is_preset"] is False
    sid = data["id"]

    resp = await client.get("/api/software")
    assert len(resp.json()) == 1

    resp = await client.put(f"/api/software/{sid}", json={"description": "Updated"})
    assert resp.json()["description"] == "Updated"

    resp = await client.delete(f"/api/software/{sid}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_preset_software_in_list(client: AsyncClient):
    resp = await client.post("/api/software", json={"name": "Preset", "is_preset": True})
    assert resp.status_code == 201
    assert resp.json()["is_preset"] is True
