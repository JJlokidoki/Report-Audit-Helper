import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_report(client: AsyncClient):
    resp = await client.post("/api/reports", json={"name": "Test", "report_type": "web"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test"
    assert data["report_type"] == "web"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_report_creates_checklist(client: AsyncClient):
    resp = await client.post("/api/reports", json={"name": "Test", "report_type": "web"})
    report_id = resp.json()["id"]
    checks = await client.get(f"/api/reports/{report_id}/checklist")
    assert checks.status_code == 200
    assert len(checks.json()) > 0


@pytest.mark.asyncio
async def test_list_reports(client: AsyncClient):
    await client.post("/api/reports", json={"name": "R1", "report_type": "web"})
    await client.post("/api/reports", json={"name": "R2", "report_type": "ios"})
    resp = await client.get("/api/reports")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_list_reports_filter(client: AsyncClient):
    await client.post("/api/reports", json={"name": "R1", "report_type": "web"})
    await client.post("/api/reports", json={"name": "R2", "report_type": "ios"})
    resp = await client.get("/api/reports", params={"report_type": "web"})
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_report(client: AsyncClient):
    create = await client.post("/api/reports", json={"name": "Test", "report_type": "web"})
    rid = create.json()["id"]
    resp = await client.get(f"/api/reports/{rid}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test"


@pytest.mark.asyncio
async def test_get_report_not_found(client: AsyncClient):
    resp = await client.get("/api/reports/999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_report(client: AsyncClient):
    create = await client.post("/api/reports", json={"name": "Old", "report_type": "web"})
    rid = create.json()["id"]
    resp = await client.put(f"/api/reports/{rid}", json={"name": "New"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New"


@pytest.mark.asyncio
async def test_delete_report(client: AsyncClient):
    create = await client.post("/api/reports", json={"name": "Del", "report_type": "web"})
    rid = create.json()["id"]
    resp = await client.delete(f"/api/reports/{rid}")
    assert resp.status_code == 204
    resp = await client.get(f"/api/reports/{rid}")
    assert resp.status_code == 404
