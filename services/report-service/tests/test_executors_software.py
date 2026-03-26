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


@pytest.mark.asyncio
async def test_create_software_with_labels(client: AsyncClient):
    resp = await client.post("/api/software", json={"name": "Burp", "labels": ["web"]})
    assert resp.status_code == 201
    data = resp.json()
    assert data["labels"] == ["web"]


@pytest.mark.asyncio
async def test_update_software_labels(client: AsyncClient):
    resp = await client.post("/api/software", json={"name": "Nmap"})
    sid = resp.json()["id"]
    assert resp.json()["labels"] == []

    resp = await client.put(f"/api/software/{sid}", json={"labels": ["network", "general"]})
    assert resp.json()["labels"] == ["network", "general"]


@pytest.mark.asyncio
async def test_filter_software_by_labels(client: AsyncClient):
    await client.post("/api/software", json={"name": "WebTool", "labels": ["web"]})
    await client.post("/api/software", json={"name": "MobileTool", "labels": ["mobile"]})
    await client.post("/api/software", json={"name": "General", "labels": ["web", "general"]})

    resp = await client.get("/api/software", params={"labels": "web"})
    names = {s["name"] for s in resp.json()}
    assert "WebTool" in names
    assert "General" in names
    assert "MobileTool" not in names

    resp = await client.get("/api/software", params={"labels": "mobile,general"})
    names = {s["name"] for s in resp.json()}
    assert "MobileTool" in names
    assert "General" in names


@pytest.mark.asyncio
async def test_software_default_empty_labels(client: AsyncClient):
    resp = await client.post("/api/software", json={"name": "NoLabels"})
    assert resp.json()["labels"] == []


@pytest.mark.asyncio
async def test_auto_assign_software_on_report_create(client: AsyncClient):
    await client.post("/api/software", json={"name": "BurpAuto", "labels": ["web"]})
    await client.post("/api/software", json={"name": "FridaAuto", "labels": ["mobile"]})
    await client.post("/api/software", json={"name": "NmapAuto", "labels": ["network", "general"]})

    resp = await client.post("/api/reports", json={"name": "Web Test", "report_type": "web"})
    report_id = resp.json()["id"]

    resp = await client.get(f"/api/reports/{report_id}/system-info")
    sw_names = {s["name"] for s in resp.json()["software"]}
    assert "BurpAuto" in sw_names
    assert "NmapAuto" in sw_names
    assert "FridaAuto" not in sw_names
