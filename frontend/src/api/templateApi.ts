const EXPORT_BASE = import.meta.env.VITE_EXPORT_API_URL ?? "http://127.0.0.1:8002";

export type TemplateMap = Record<string, string[]>;

export async function getTemplates(): Promise<TemplateMap> {
  const resp = await fetch(`${EXPORT_BASE}/api/templates`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function downloadTemplate(reportType: string, filename: string): Promise<void> {
  const resp = await fetch(`${EXPORT_BASE}/api/templates/${reportType}/${filename}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadTemplate(reportType: string, filename: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${EXPORT_BASE}/api/templates/${reportType}/${filename}`, {
    method: "PUT",
    body: form,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}
