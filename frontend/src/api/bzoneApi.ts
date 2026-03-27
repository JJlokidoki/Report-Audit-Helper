const BASE = import.meta.env.VITE_BZONE_API_URL || "";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BZoneSettings {
  bz_token: string;
  bz_base_url: string;
  bz_companies: string[];
  bz_target_stages: number[];
  llm_provider: string;
  llm_model: string;
  llm_base_url: string;
  llm_api_key: string;
  llm_temperature: number;
  llm_max_tokens: number;
  providers: string[];
  has_token: boolean;
}

export type BZoneSettingsUpdate = Partial<Omit<BZoneSettings, "providers" | "has_token" | "bz_companies">>;

export interface BZoneHealthResult {
  status: "ok" | "error";
  provider: string;
  model: string;
  reply?: string;
  detail?: string;
}

export interface TokenRefreshResult {
  status: "ok" | "error";
  detail: string;
}

export interface BZoneReport {
  id: number;
  name: string;
  assignee: string | null;
  current_stage_id: number;
  current_stage_tag: string | null;
  company: string;
  company_name: string | null;
  critical_type: string | null;
  cvss: string | null;
  description: string | null;
  researcher: string | null;
  bounty: number;
  creation_date: string | null;
  modification_date: string | null;
  cwe_id: string | null;
  cwe_name: string | null;
  is_duplicate: boolean;
  duplicate_of: number | null;
  ai_notes: string | null;
  synced_at: string | null;
}

export interface BZoneSyncStatus {
  id: number;
  started_at: string | null;
  finished_at: string | null;
  status: "running" | "success" | "failed";
  total_fetched: number;
  new_reports: number;
  updated_reports: number;
  error: string | null;
}

export interface BZoneStats {
  total_reports: number;
  by_company: Record<string, number>;
  by_stage: Record<string, number>;
  with_cwe: number;
  duplicates: number;
  last_sync: BZoneSyncStatus | null;
}

export interface BZoneAnalyzeRequest {
  report_ids?: number[];
  all?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE}${path}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function putJSON<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ── Reports ─────────────────────────────────────────────────────────────────

export function getBZoneReports(params?: {
  company?: string;
  stage_id?: number;
  critical_type?: string;
  is_duplicate?: boolean;
  has_cwe?: boolean;
}): Promise<BZoneReport[]> {
  const qs = new URLSearchParams();
  if (params?.company) qs.set("company", params.company);
  if (params?.stage_id !== undefined) qs.set("stage_id", String(params.stage_id));
  if (params?.critical_type) qs.set("critical_type", params.critical_type);
  if (params?.is_duplicate !== undefined) qs.set("is_duplicate", String(params.is_duplicate));
  if (params?.has_cwe !== undefined) qs.set("has_cwe", String(params.has_cwe));
  const suffix = qs.toString() ? `?${qs}` : "";
  return get<BZoneReport[]>(`/api/bzone/reports${suffix}`);
}

export const getBZoneReport = (id: number) => get<BZoneReport>(`/api/bzone/reports/${id}`);

// ── Sync ────────────────────────────────────────────────────────────────────

export const syncBZone = () => postJSON<BZoneSyncStatus>("/api/bzone/sync", {});

export const getSyncStatus = () => get<BZoneSyncStatus>("/api/bzone/sync/status");

// ── Analyze ─────────────────────────────────────────────────────────────────

export const analyzeBZone = (data: BZoneAnalyzeRequest) =>
  postJSON<{ status: string }>("/api/bzone/analyze", data);

// ── Settings ────────────────────────────────────────────────────────────────

export const getBZoneSettings = () => get<BZoneSettings>("/api/bzone/settings");

export const updateBZoneSettings = (data: BZoneSettingsUpdate) =>
  putJSON<BZoneSettings>("/api/bzone/settings", data);

// ── Health / Token ──────────────────────────────────────────────────────────

export const checkBZoneHealth = () => get<BZoneHealthResult>("/api/bzone/health");

export async function refreshBZoneToken(): Promise<TokenRefreshResult> {
  const resp = await fetch(`${BASE}/api/bzone/refresh-token`, { method: "POST" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ── Stats ───────────────────────────────────────────────────────────────────

export const getBZoneStats = () => get<BZoneStats>("/api/bzone/stats");
