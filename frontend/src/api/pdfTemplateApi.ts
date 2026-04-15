import client from "./client";

const EXPORT_BASE = import.meta.env.VITE_EXPORT_API_URL || "";

export interface PdfTemplate {
  id: number;
  report_type: string;
  section: string;
  label: string;
  anchor: string;
  content: string;
  sort_order: number;
  is_system: boolean;
  is_numbered: boolean;
  is_builtin: boolean;
  updated_at: string;
}

export interface PdfTemplateUpdate {
  content?: string;
  label?: string;
  is_numbered?: boolean;
}

export interface PdfTemplateCreate {
  report_type: string;
  label: string;
  section?: string;
  content?: string;
  is_numbered?: boolean;
}

export interface PdfTemplateVersion {
  id: number;
  template_id: number;
  content: string;
  created_at: string;
}

export interface SectionMeta {
  section: string;
  anchor: string;
  isNumbered: boolean;
  hasBuiltin: boolean;
}

// ── CRUD (via report-service) ───────────────────────────────────────────────

export const getPdfTemplates = (reportType?: string) =>
  client
    .get<PdfTemplate[]>("/pdf-templates", { params: reportType ? { report_type: reportType } : {} })
    .then((r) => r.data);

export const getPdfTemplate = (id: number) =>
  client.get<PdfTemplate>(`/pdf-templates/${id}`).then((r) => r.data);

export const updatePdfTemplate = (id: number, data: PdfTemplateUpdate) =>
  client.put<PdfTemplate>(`/pdf-templates/${id}`, data).then((r) => r.data);

export const resetPdfTemplate = (id: number) =>
  client.post<PdfTemplate>(`/pdf-templates/${id}/reset`).then((r) => r.data);

export const reorderPdfTemplates = (orders: { id: number; sort_order: number }[]) =>
  client.put("/pdf-templates/reorder", { orders }).then((r) => r.data);

export const createPdfTemplateSection = (data: PdfTemplateCreate) =>
  client.post<PdfTemplate>("/pdf-templates", data).then((r) => r.data);

export const deletePdfTemplateSection = (id: number) =>
  client.delete(`/pdf-templates/${id}`).then((r) => r.data);

export const getPdfTemplateVersions = (id: number) =>
  client.get<PdfTemplateVersion[]>(`/pdf-templates/${id}/versions`).then((r) => r.data);

export const restorePdfTemplateVersion = (templateId: number, versionId: number) =>
  client
    .post<PdfTemplate>(`/pdf-templates/${templateId}/versions/${versionId}/restore`)
    .then((r) => r.data);

// ── Preview (via export-service) ────────────────────────────────────────────

export interface PreviewRequest {
  report_type: string;
  section?: string;
  content?: string;
  css?: string;
  sections?: SectionMeta[];
}

export async function previewPdfTemplate(req: PreviewRequest): Promise<string> {
  const resp = await fetch(`${EXPORT_BASE}/api/pdf-templates/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.html;
}

export async function previewPdfTemplateAsPdf(req: PreviewRequest): Promise<string> {
  const resp = await fetch(`${EXPORT_BASE}/api/pdf-templates/preview-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}
