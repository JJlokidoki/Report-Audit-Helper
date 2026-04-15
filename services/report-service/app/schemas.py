from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ReportCreate(BaseModel):
    name: str
    report_type: str


class ReportUpdate(BaseModel):
    name: str | None = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    report_type: str
    created_at: datetime
    updated_at: datetime


class ReportListResponse(ReportResponse):
    vulnerability_count: int = 0


class ExecutorCreate(BaseModel):
    name: str
    email: str | None = None


class ExecutorUpdate(BaseModel):
    name: str | None = None
    email: str | None = None


class ExecutorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None = None


class SoftwareCreate(BaseModel):
    name: str
    description: str | None = None
    is_preset: bool = False
    labels: list[str] = []


class SoftwareUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    labels: list[str] | None = None


class SoftwareResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_preset: bool
    labels: list[str]


class SystemInfoUpdate(BaseModel):
    asName: str | None = None
    keId: str | None = None
    url: str | None = None
    dateStart: date | None = None
    dateEnd: date | None = None
    segment: str | None = None
    description: str | None = None
    goal: str | None = None
    qualificationLevel: str | None = None
    accessLevel: str | None = None
    knowledgeLevel: str | None = None
    testConditions: str | None = None


class SystemInfoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    asName: str | None
    keId: str | None
    url: str | None
    dateStart: date | None
    dateEnd: date | None
    segment: str | None
    description: str | None
    goal: str | None
    qualificationLevel: str | None
    accessLevel: str | None
    knowledgeLevel: str | None
    testConditions: str | None
    executors: list["ExecutorResponse"] = []
    software: list["SoftwareResponse"] = []


class VulnerabilityTemplateCreate(BaseModel):
    bug_name: str
    bug_criticality: str = "info"
    bug_description: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    automation_level: str = "no"
    is_preset: bool = False
    labels: list[str] = []


class VulnerabilityTemplateUpdate(BaseModel):
    bug_name: str | None = None
    bug_criticality: str | None = None
    bug_description: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    automation_level: str | None = None
    labels: list[str] | None = None


class VulnerabilityTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bug_name: str
    bug_criticality: str
    bug_description: str | None
    cvss_score: float | None
    cvss_vector: str | None
    reproduction_steps: str | None
    remediation: str | None
    automation_level: str
    is_preset: bool
    labels: list[str]


class VulnerabilityCreate(BaseModel):
    bug_name: str
    bug_criticality: str = "info"
    bug_description: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    automation_level: str = "no"


class VulnerabilityUpdate(BaseModel):
    bug_name: str | None = None
    bug_criticality: str | None = None
    bug_description: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    automation_level: str | None = None


class VulnerabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    bug_name: str
    bug_criticality: str
    bug_description: str | None
    cvss_score: float | None
    cvss_vector: str | None
    reproduction_steps: str | None
    remediation: str | None
    automation_level: str
    sort_order: int


class VulnerabilityReorder(BaseModel):
    orders: list[dict]


class SecurityCheckUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


class SecurityCheckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    checklist_type: str
    check_id: str
    category: str
    name: str
    short_description: str | None
    goal: str | None
    status: str
    notes: str | None


class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class TestSummaryResponse(BaseModel):
    counts: SeverityCounts
    vulnerabilities: list[VulnerabilityResponse]


class ExecutorIds(BaseModel):
    executor_ids: list[int]


class SoftwareIds(BaseModel):
    software_ids: list[int]


SystemInfoResponse.model_rebuild()


# ── PDF Templates ──────────────────────────────────────────────────────────────

class PdfTemplateCreate(BaseModel):
    report_type: str
    label: str
    section: str | None = None   # slug; auto-generated from label if omitted
    content: str = ""
    is_numbered: bool = True


class PdfTemplateUpdate(BaseModel):
    content: str | None = None
    label: str | None = None
    is_numbered: bool | None = None


class PdfTemplateReorder(BaseModel):
    orders: list[dict]  # [{id: int, sort_order: int}]


class PdfTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_type: str
    section: str
    label: str
    anchor: str
    content: str
    sort_order: int
    is_system: bool
    is_numbered: bool
    is_builtin: bool
    updated_at: datetime


class PdfTemplateVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    content: str
    created_at: datetime
