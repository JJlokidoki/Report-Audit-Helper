import pytest
from httpx import AsyncClient

from app.models import BZoneReport


@pytest.mark.asyncio
async def test_list_reports_empty(test_client: AsyncClient):
    resp = await test_client.get("/api/bzone/reports")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_reports(test_client: AsyncClient, test_db):
    report = BZoneReport(
        id=1001,
        name="Test XSS",
        current_stage_id=10,
        current_stage_tag="triaged",
        company="test-company",
        company_name="Test Company",
        critical_type="hg",
        cvss="7.5",
        bounty=0,
    )
    test_db.add(report)
    await test_db.commit()

    resp = await test_client.get("/api/bzone/reports")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == 1001
    assert data[0]["name"] == "Test XSS"
    assert data[0]["current_stage_tag"] == "triaged"


@pytest.mark.asyncio
async def test_get_report(test_client: AsyncClient, test_db):
    report = BZoneReport(
        id=2002,
        name="SSRF in API",
        current_stage_id=12,
        current_stage_tag="resolved",
        company="test-co",
        bounty=5000,
    )
    test_db.add(report)
    await test_db.commit()

    resp = await test_client.get("/api/bzone/reports/2002")
    assert resp.status_code == 200
    assert resp.json()["name"] == "SSRF in API"
    assert resp.json()["bounty"] == 5000


@pytest.mark.asyncio
async def test_get_report_not_found(test_client: AsyncClient):
    resp = await test_client.get("/api/bzone/reports/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_filter_by_company(test_client: AsyncClient, test_db):
    test_db.add(BZoneReport(id=1, name="A", current_stage_id=10, company="alpha", bounty=0))
    test_db.add(BZoneReport(id=2, name="B", current_stage_id=10, company="beta", bounty=0))
    await test_db.commit()

    resp = await test_client.get("/api/bzone/reports", params={"company": "alpha"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["company"] == "alpha"


@pytest.mark.asyncio
async def test_filter_by_duplicate(test_client: AsyncClient, test_db):
    test_db.add(BZoneReport(id=1, name="Original", current_stage_id=10, company="c", is_duplicate=False, bounty=0))
    test_db.add(BZoneReport(id=2, name="Dup", current_stage_id=10, company="c", is_duplicate=True, duplicate_of=1, bounty=0))
    await test_db.commit()

    resp = await test_client.get("/api/bzone/reports", params={"is_duplicate": False})
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Original"
