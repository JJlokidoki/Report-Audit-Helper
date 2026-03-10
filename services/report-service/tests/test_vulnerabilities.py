import pytest
from httpx import AsyncClient


async def _create_report(client: AsyncClient) -> int:
    resp = await client.post("/api/reports", json={"name": "R", "report_type": "web"})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_vulnerability(client: AsyncClient):
    rid = await _create_report(client)
    resp = await client.post(f"/api/reports/{rid}/vulnerabilities", json={
        "bug_name": "XSS", "bug_criticality": "high"
    })
    assert resp.status_code == 201
    assert resp.json()["bug_name"] == "XSS"
    assert resp.json()["sort_order"] == 0


@pytest.mark.asyncio
async def test_list_vulnerabilities(client: AsyncClient):
    rid = await _create_report(client)
    await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "V1"})
    await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "V2"})
    resp = await client.get(f"/api/reports/{rid}/vulnerabilities")
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_update_vulnerability(client: AsyncClient):
    rid = await _create_report(client)
    create = await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "Old"})
    vid = create.json()["id"]
    resp = await client.put(f"/api/reports/{rid}/vulnerabilities/{vid}", json={"bug_name": "New"})
    assert resp.status_code == 200
    assert resp.json()["bug_name"] == "New"


@pytest.mark.asyncio
async def test_delete_vulnerability(client: AsyncClient):
    rid = await _create_report(client)
    create = await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "Del"})
    vid = create.json()["id"]
    resp = await client.delete(f"/api/reports/{rid}/vulnerabilities/{vid}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_test_summary(client: AsyncClient):
    rid = await _create_report(client)
    await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "V1", "bug_criticality": "high"})
    await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "V2", "bug_criticality": "high"})
    await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "V3", "bug_criticality": "low"})
    resp = await client.get(f"/api/reports/{rid}/test-summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["counts"]["high"] == 2
    assert data["counts"]["low"] == 1
    assert len(data["vulnerabilities"]) == 3


@pytest.mark.asyncio
async def test_reorder_vulnerabilities(client: AsyncClient):
    rid = await _create_report(client)
    v1 = (await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "A"})).json()
    v2 = (await client.post(f"/api/reports/{rid}/vulnerabilities", json={"bug_name": "B"})).json()
    resp = await client.put(f"/api/reports/{rid}/vulnerabilities/reorder", json={
        "orders": [{"id": v1["id"], "sort_order": 10}, {"id": v2["id"], "sort_order": 5}]
    })
    assert resp.status_code == 200
    vulns = (await client.get(f"/api/reports/{rid}/vulnerabilities")).json()
    assert vulns[0]["bug_name"] == "B"
    assert vulns[1]["bug_name"] == "A"
