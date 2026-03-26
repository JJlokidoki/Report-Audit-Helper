from datetime import datetime

from pydantic import BaseModel


# ── BZoneReport ──────────────────────────────────────────────────────────────

class BZoneReportResponse(BaseModel):
    id: int
    name: str
    assignee: str | None
    current_stage_id: int
    current_stage_tag: str | None
    company: str
    company_name: str | None
    critical_type: str | None
    cvss: str | None
    description: str | None
    researcher: str | None
    bounty: int
    creation_date: datetime | None
    modification_date: datetime | None
    cwe_id: str | None
    cwe_name: str | None
    is_duplicate: bool
    duplicate_of: int | None
    ai_notes: str | None
    synced_at: datetime | None

    model_config = {"from_attributes": True}


# ── SyncLog ──────────────────────────────────────────────────────────────────

class SyncStatusResponse(BaseModel):
    id: int
    started_at: datetime | None
    finished_at: datetime | None
    status: str
    total_fetched: int
    new_reports: int
    updated_reports: int
    error: str | None

    model_config = {"from_attributes": True}


# ── Stats ────────────────────────────────────────────────────────────────────

class BZoneStatsResponse(BaseModel):
    total_reports: int
    by_company: dict[str, int]
    by_stage: dict[str, int]
    with_cwe: int
    duplicates: int
    last_sync: SyncStatusResponse | None


# ── Analyze ──────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    report_ids: list[int] | None = None
    all: bool = False


class AnalyzeResultItem(BaseModel):
    report_id: int
    cwe_id: str | None
    cwe_name: str | None
    is_duplicate: bool
    duplicate_of: int | None
    ai_notes: str | None


class AnalyzeResponse(BaseModel):
    results: list[AnalyzeResultItem]
