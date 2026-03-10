import pytest
from httpx import AsyncClient


async def _create_report(client: AsyncClient) -> int:
    resp = await client.post("/api/reports", json={"name": "R", "report_type": "web"})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_get_system_info_auto_creates(client: AsyncClient):
    rid = await _create_report(client)
    resp = await client.get(f"/api/reports/{rid}/system-info")
    assert resp.status_code == 200
    assert resp.json()["report_id"] == rid


@pytest.mark.asyncio
async def test_update_system_info(client: AsyncClient):
    rid = await _create_report(client)
    resp = await client.put(f"/api/reports/{rid}/system-info", json={
        "asName": "TestApp", "url": "https://test.com"
    })
    assert resp.status_code == 200
    assert resp.json()["asName"] == "TestApp"
    assert resp.json()["url"] == "https://test.com"


@pytest.mark.asyncio
async def test_set_executors(client: AsyncClient):
    rid = await _create_report(client)
    e1 = (await client.post("/api/executors", json={"name": "Alice"})).json()
    e2 = (await client.post("/api/executors", json={"name": "Bob"})).json()
    resp = await client.put(
        f"/api/reports/{rid}/system-info/executors",
        json={"executor_ids": [e1["id"], e2["id"]]}
    )
    assert resp.status_code == 200
    assert len(resp.json()["executors"]) == 2


@pytest.mark.asyncio
async def test_set_software(client: AsyncClient):
    rid = await _create_report(client)
    s1 = (await client.post("/api/software", json={"name": "Burp", "version": "2024.1"})).json()
    resp = await client.put(
        f"/api/reports/{rid}/system-info/software",
        json={"software_ids": [s1["id"]]}
    )
    assert resp.status_code == 200
    assert len(resp.json()["software"]) == 1
