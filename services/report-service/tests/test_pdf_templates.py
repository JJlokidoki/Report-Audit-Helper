import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_pdf_templates_has_new_fields(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 8

    for t in templates:
        assert "label" in t
        assert "anchor" in t  # computed from section slug
        assert "is_system" in t
        assert "is_numbered" in t
        assert "is_builtin" in t
        assert t["is_builtin"] is True


@pytest.mark.asyncio
async def test_system_sections_marked(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    templates = {t["section"]: t for t in resp.json()}

    assert templates["title"]["is_system"] is True
    assert templates["toc"]["is_system"] is True
    assert templates["styles"]["is_system"] is True
    assert templates["general_info"]["is_system"] is False
    assert templates["vulnerability"]["is_system"] is False


@pytest.mark.asyncio
async def test_create_user_section(client: AsyncClient):
    resp = await client.post(
        "/api/pdf-templates",
        json={"report_type": "web", "label": "My Custom Section", "content": "<h1>test</h1>"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["section"] == "my_custom_section"
    assert data["label"] == "My Custom Section"
    assert data["anchor"] == "my-custom-section"  # computed from section slug
    assert data["is_system"] is False
    assert data["is_builtin"] is False
    assert data["is_numbered"] is True


@pytest.mark.asyncio
async def test_create_section_slug_collision(client: AsyncClient):
    # First user section
    resp = await client.post(
        "/api/pdf-templates",
        json={"report_type": "web", "label": "Custom"},
    )
    assert resp.status_code == 201
    assert resp.json()["section"] == "custom"

    # Collision — should get suffix
    resp = await client.post(
        "/api/pdf-templates",
        json={"report_type": "web", "label": "Custom"},
    )
    assert resp.status_code == 201
    assert resp.json()["section"] == "custom_2"


@pytest.mark.asyncio
async def test_delete_user_section(client: AsyncClient):
    resp = await client.post(
        "/api/pdf-templates",
        json={"report_type": "web", "label": "Deletable"},
    )
    sid = resp.json()["id"]

    resp = await client.delete(f"/api/pdf-templates/{sid}")
    assert resp.status_code == 204

    # Verify gone
    resp = await client.get(f"/api/pdf-templates/{sid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_system_section_forbidden(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    title_id = next(t["id"] for t in resp.json() if t["section"] == "title")

    resp = await client.delete(f"/api/pdf-templates/{title_id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_label_system_section_allowed(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    title_id = next(t["id"] for t in resp.json() if t["section"] == "title")

    resp = await client.put(
        f"/api/pdf-templates/{title_id}",
        json={"label": "Новый заголовок"},
    )
    assert resp.status_code == 200
    assert resp.json()["label"] == "Новый заголовок"


@pytest.mark.asyncio
async def test_reset_user_section_forbidden(client: AsyncClient):
    resp = await client.post(
        "/api/pdf-templates",
        json={"report_type": "web", "label": "NoReset"},
    )
    sid = resp.json()["id"]

    resp = await client.post(f"/api/pdf-templates/{sid}/reset")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_version_created_on_content_change(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    general_id = next(t["id"] for t in resp.json() if t["section"] == "general_info")

    # Initial versions count
    resp = await client.get(f"/api/pdf-templates/{general_id}/versions")
    initial_count = len(resp.json())

    # Update content
    await client.put(f"/api/pdf-templates/{general_id}", json={"content": "<h1>V2</h1>"})
    await client.put(f"/api/pdf-templates/{general_id}", json={"content": "<h1>V3</h1>"})

    resp = await client.get(f"/api/pdf-templates/{general_id}/versions")
    versions = resp.json()
    assert len(versions) == initial_count + 2


@pytest.mark.asyncio
async def test_version_not_created_on_non_content_change(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    general_id = next(t["id"] for t in resp.json() if t["section"] == "general_info")

    resp = await client.get(f"/api/pdf-templates/{general_id}/versions")
    initial_count = len(resp.json())

    # Update only label — no version should be created
    await client.put(f"/api/pdf-templates/{general_id}", json={"label": "Новый label"})

    resp = await client.get(f"/api/pdf-templates/{general_id}/versions")
    assert len(resp.json()) == initial_count


@pytest.mark.asyncio
async def test_restore_version(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    general_id = next(t["id"] for t in resp.json() if t["section"] == "general_info")
    original_content = next(t["content"] for t in resp.json() if t["section"] == "general_info")

    # Change content
    await client.put(f"/api/pdf-templates/{general_id}", json={"content": "<h1>Modified</h1>"})

    # Get version with original content
    resp = await client.get(f"/api/pdf-templates/{general_id}/versions")
    versions = resp.json()
    version_with_original = next(v for v in versions if v["content"] == original_content)

    # Restore
    resp = await client.post(
        f"/api/pdf-templates/{general_id}/versions/{version_with_original['id']}/restore"
    )
    assert resp.status_code == 200
    assert resp.json()["content"] == original_content


@pytest.mark.asyncio
async def test_version_limit_20(client: AsyncClient):
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    general_id = next(t["id"] for t in resp.json() if t["section"] == "general_info")

    # Make 25 content changes
    for i in range(25):
        await client.put(
            f"/api/pdf-templates/{general_id}",
            json={"content": f"<h1>V{i}</h1>"},
        )

    resp = await client.get(f"/api/pdf-templates/{general_id}/versions")
    versions = resp.json()
    # Should be capped at 20
    assert len(versions) <= 20


@pytest.mark.asyncio
async def test_versions_cascade_on_delete(client: AsyncClient):
    # Create user section and add versions
    resp = await client.post(
        "/api/pdf-templates",
        json={"report_type": "web", "label": "WillBeDeleted", "content": "v1"},
    )
    sid = resp.json()["id"]

    await client.put(f"/api/pdf-templates/{sid}", json={"content": "v2"})
    await client.put(f"/api/pdf-templates/{sid}", json={"content": "v3"})

    resp = await client.get(f"/api/pdf-templates/{sid}/versions")
    assert len(resp.json()) >= 2

    # Delete section — versions should go too
    await client.delete(f"/api/pdf-templates/{sid}")

    resp = await client.get(f"/api/pdf-templates/{sid}/versions")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_styles_version_created_on_content_change(client: AsyncClient):
    """Styles section uses content field — versioning works the same as other sections."""
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    styles_id = next(t["id"] for t in resp.json() if t["section"] == "styles")

    resp = await client.get(f"/api/pdf-templates/{styles_id}/versions")
    initial_count = len(resp.json())

    await client.put(f"/api/pdf-templates/{styles_id}", json={"content": "body { color: red; }"})
    await client.put(f"/api/pdf-templates/{styles_id}", json={"content": "body { color: blue; }"})

    resp = await client.get(f"/api/pdf-templates/{styles_id}/versions")
    assert len(resp.json()) == initial_count + 2


@pytest.mark.asyncio
async def test_styles_restore_version(client: AsyncClient):
    """Restoring a version on styles section works via content field."""
    resp = await client.get("/api/pdf-templates", params={"report_type": "web"})
    styles = next(t for t in resp.json() if t["section"] == "styles")
    styles_id = styles["id"]
    original_content = styles["content"]

    await client.put(f"/api/pdf-templates/{styles_id}", json={"content": "body { font-size: 99px; }"})

    resp = await client.get(f"/api/pdf-templates/{styles_id}/versions")
    versions = resp.json()
    version_with_original = next(v for v in versions if v["content"] == original_content)

    resp = await client.post(
        f"/api/pdf-templates/{styles_id}/versions/{version_with_original['id']}/restore"
    )
    assert resp.status_code == 200
    assert resp.json()["content"] == original_content
