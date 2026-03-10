import pytest
from httpx import AsyncClient


async def _create_report(client: AsyncClient) -> int:
    resp = await client.post("/api/reports", json={"name": "R", "report_type": "web"})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_get_checklist(client: AsyncClient):
    rid = await _create_report(client)
    resp = await client.get(f"/api/reports/{rid}/checklist")
    assert resp.status_code == 200
    checks = resp.json()
    assert len(checks) > 50


@pytest.mark.asyncio
async def test_filter_checklist_by_category(client: AsyncClient):
    rid = await _create_report(client)
    resp = await client.get(f"/api/reports/{rid}/checklist", params={"category": "Information Gathering"})
    checks = resp.json()
    assert all(c["category"] == "Information Gathering" for c in checks)


@pytest.mark.asyncio
async def test_update_check(client: AsyncClient):
    rid = await _create_report(client)
    resp = await client.put(
        f"/api/reports/{rid}/checklist/WSTG-INFO-01",
        json={"status": "passed", "notes": "ok"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "passed"
    assert resp.json()["notes"] == "ok"
