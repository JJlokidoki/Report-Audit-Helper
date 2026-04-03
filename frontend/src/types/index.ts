export interface Report {
  id: number;
  name: string;
  report_type: ReportType;
  created_at: string;
  updated_at: string;
}

export interface ReportListItem extends Report {
  vulnerability_count: number;
}

export type ReportType = "web" | "ios" | "android" | "ai" | "iot";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AutomationLevel = "fully" | "partially" | "no" | "impossible";

export type CheckStatus = "passed" | "failed" | "not_tested";

export interface SystemInfo {
  id: number;
  report_id: number;
  asName: string | null;
  keId: string | null;
  url: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  segment: string | null;
  description: string | null;
  goal: string | null;
  qualificationLevel: string | null;
  accessLevel: string | null;
  knowledgeLevel: string | null;
  testConditions: string | null;
  executors: Executor[];
  software: Software[];
}

export interface Executor {
  id: number;
  name: string;
}

export type SoftwareLabel = "web" | "mobile" | "network" | "ai" | "iot" | "general";

export interface Software {
  id: number;
  name: string;
  description: string | null;
  is_preset: boolean;
  labels: SoftwareLabel[];
}

export type VulnTemplateLabel = "web" | "mobile" | "network" | "api" | "auth" | "crypto" | "config" | "general";

export interface VulnerabilityTemplate {
  id: number;
  bug_name: string;
  bug_criticality: Severity;
  bug_description: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  reproduction_steps: string | null;
  remediation: string | null;
  automation_level: AutomationLevel;
  is_preset: boolean;
  labels: VulnTemplateLabel[];
}

export interface Vulnerability {
  id: number;
  report_id: number;
  bug_name: string;
  bug_criticality: Severity;
  bug_description: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  reproduction_steps: string | null;
  remediation: string | null;
  automation_level: AutomationLevel;
  sort_order: number;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface TestSummary {
  counts: SeverityCounts;
  vulnerabilities: Vulnerability[];
}

export interface SecurityCheck {
  id: number;
  report_id: number;
  checklist_type: string;
  check_id: string;
  category: string;
  name: string;
  short_description: string | null;
  goal: string | null;
  status: CheckStatus;
  notes: string | null;
}
