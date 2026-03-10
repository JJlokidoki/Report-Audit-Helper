import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_crud_executor(client: AsyncClient):
    resp = await client.post("/api/executors", json={"name": "Alice", "position": "Lead"})
    assert resp.status_code == 201
    eid = resp.json()["id"]

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
    resp = await client.post("/api/software", json={"name": "Nmap", "version": "7.94"})
    assert resp.status_code == 201
    sid = resp.json()["id"]

    resp = await client.get("/api/software")
    assert len(resp.json()) == 1

    resp = await client.put(f"/api/software/{sid}", json={"version": "7.95"})
    assert resp.json()["version"] == "7.95"

    resp = await client.delete(f"/api/software/{sid}")
    assert resp.status_code == 204
