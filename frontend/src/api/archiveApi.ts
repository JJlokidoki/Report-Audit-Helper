const BASE = import.meta.env.VITE_ARCHIVE_API_URL || "";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ArchiveSettings {
  embedding_provider: string;
  embedding_model: string;
  embedding_base_url: string;
  embedding_api_key: string;
  embedding_dimensions: number;
  chunk_size: number;
  chunk_overlap: number;
  default_top_k: number;
  providers: string[];
}

export interface ArchiveSettingsUpdate {
  embedding_provider?: string;
  embedding_model?: string;
  embedding_base_url?: string;
  embedding_api_key?: string;
  embedding_dimensions?: number;
  chunk_size?: number;
  chunk_overlap?: number;
  default_top_k?: number;
}

export interface ArchiveStats {
  total_documents: number;
  total_chunks: number;
  embedding_provider: string;
  embedding_model: string;
}

export interface ArchiveHealthResponse {
  status: "ok" | "error";
  provider: string;
  model: string;
  detail?: string;
}

export interface ArchiveDocument {
  doc_id: string;
  doc_name: string;
  source: "upload" | "report_service";
  report_type: string;
  status: "indexed" | "processing" | "error";
  chunk_count: number;
  system_name: string | null;
  vulnerability_count: number | null;
  completion_date: string | null;
  error: string | null;
  created_at: string;
}

export interface DocumentUploadResponse {
  doc_id: string;
  doc_name: string;
  status: string;
  chunk_count: number;
  system_name: string | null;
  vulnerability_count: number | null;
  completion_date: string | null;
}

// ── Search ──────────────────────────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  top_k?: number;
  filters?: { severity?: string; report_type?: string; technology?: string; doc_id?: string };
}

export interface SearchResult {
  text: string;
  doc_name: string;
  source: string;
  section: string;
  severity: string;
  technology: string;
  report_type: string;
  score: number;
  doc_id: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  query: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE}${path}`);
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

// ── Settings ─────────────────────────────────────────────────────────────────

export const getArchiveSettings = () => get<ArchiveSettings>("/api/archive/settings");

export const updateArchiveSettings = (data: ArchiveSettingsUpdate) =>
  putJSON<ArchiveSettings>("/api/archive/settings", data);

export const checkArchiveHealth = () => get<ArchiveHealthResponse>("/api/archive/health");

export const getArchiveStats = () => get<ArchiveStats>("/api/archive/stats");

export interface TokenRefreshResult {
  status: "ok" | "error";
  detail: string;
}

export async function refreshArchiveToken(): Promise<TokenRefreshResult> {
  const resp = await fetch(`${BASE}/api/archive/refresh-token`, { method: "POST" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ── Documents ────────────────────────────────────────────────────────────────

export const getDocuments = () => get<ArchiveDocument[]>("/api/archive/documents");

export async function deleteDocument(docId: string): Promise<void> {
  const resp = await fetch(`${BASE}/api/archive/documents/${docId}`, { method: "DELETE" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

export async function uploadDocument(
  file: File,
  opts?: { doc_name?: string; report_type?: string; technology?: string },
): Promise<DocumentUploadResponse> {
  const params = new URLSearchParams();
  if (opts?.doc_name) params.set("doc_name", opts.doc_name);
  if (opts?.report_type) params.set("report_type", opts.report_type);
  if (opts?.technology) params.set("technology", opts.technology);

  const form = new FormData();
  form.append("file", file);

  const qs = params.toString() ? `?${params}` : "";
  const resp = await fetch(`${BASE}/api/archive/documents/upload${qs}`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function importReport(reportId: number): Promise<DocumentUploadResponse> {
  const resp = await fetch(`${BASE}/api/archive/documents/import/${reportId}`, { method: "POST" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function searchDocuments(req: SearchRequest): Promise<SearchResponse> {
  const resp = await fetch(`${BASE}/api/archive/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
