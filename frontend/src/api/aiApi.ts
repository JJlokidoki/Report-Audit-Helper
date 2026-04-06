const AI_BASE_URL = import.meta.env.VITE_AI_API_URL ?? "http://127.0.0.1:8004";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GenerateRequest {
  history: ChatMessage[];
  images?: string[];    // base64 data URLs
  filenames?: string[];
}

export interface VulnFields {
  bug_name?: string;
  bug_description?: string;
  reproduction_steps?: string;
  remediation?: string;
  cvss_score?: number;
  cvss_vector?: string;
  bug_criticality?: string;
}

export interface GenerateResponse {
  markdown: string;
  raw: string;
  fields?: VulnFields;
}

export interface SummaryResponse {
  summary_markdown: string;
}

async function postJSON(path: string, body: unknown): Promise<Response> {
  const resp = await fetch(`${AI_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp;
}

async function* readStream(resp: Response): AsyncGenerator<string> {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

interface SSEResult {
  fields: VulnFields | null;
}

async function readSSE(
  resp: Response,
  onChunk: (text: string) => void,
): Promise<SSEResult> {
  let fields: VulnFields | null = null;
  let buffer = "";

  for await (const raw of readStream(resp)) {
    buffer += raw;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      let event = "";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (event === "chunk") {
        try { onChunk(JSON.parse(data)); } catch { onChunk(data); }
      } else if (event === "done") {
        try { fields = JSON.parse(data); } catch { /* ignore */ }
      }
    }
  }
  return { fields };
}

export async function generateVuln(req: GenerateRequest): Promise<GenerateResponse> {
  const resp = await postJSON("/api/ai/generate", req);
  return resp.json();
}

export async function streamVuln(
  req: GenerateRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<VulnFields | null> {
  const resp = await fetch(`${AI_BASE_URL}/api/ai/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const { fields } = await readSSE(resp, onChunk);
  return fields;
}

export async function streamKillchain(
  req: GenerateRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const resp = await fetch(`${AI_BASE_URL}/api/ai/generate/killchain/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  for await (const chunk of readStream(resp)) onChunk(chunk);
}

export async function generateSummary(vulnerabilities_markdown: string): Promise<string> {
  const resp = await postJSON("/api/ai/results/summary", { vulnerabilities_markdown });
  const data: SummaryResponse = await resp.json();
  return data.summary_markdown;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AISettings {
  llm_provider: string;
  llm_model: string;
  llm_base_url: string;
  llm_api_key: string;
  llm_temperature: number;
  llm_max_tokens: number;
  providers: string[];
}

export type AISettingsUpdate = Partial<Omit<AISettings, "providers">>;

export async function getAiSettings(): Promise<AISettings> {
  const resp = await fetch(`${AI_BASE_URL}/api/ai/settings`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function updateAiSettings(data: AISettingsUpdate): Promise<AISettings> {
  const resp = await fetch(`${AI_BASE_URL}/api/ai/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export interface AIHealthResult {
  status: "ok" | "error";
  provider: string;
  model: string;
  reply?: string;
  detail?: string;
}

export async function checkAiHealth(): Promise<AIHealthResult> {
  const resp = await fetch(`${AI_BASE_URL}/api/ai/health`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export interface TokenRefreshResult {
  status: "ok" | "error";
  detail: string;
}

export async function refreshAiToken(): Promise<TokenRefreshResult> {
  const resp = await fetch(`${AI_BASE_URL}/api/ai/refresh-token`, { method: "POST" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
