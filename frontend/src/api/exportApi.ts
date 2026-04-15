import axios from "axios";

const exportClient = axios.create({
  baseURL: import.meta.env.VITE_EXPORT_API_URL || "",
  headers: { "Content-Type": "application/json" },
});

export type ExportEngine = "docx" | "pdf" | "both";

export async function getExportConfig(): Promise<{ engine: ExportEngine }> {
  const resp = await exportClient.get("/api/export/config");
  return resp.data;
}

export async function downloadWord(reportId: number): Promise<void> {
  const resp = await exportClient.get(`/api/export/${reportId}/word`, {
    responseType: "arraybuffer",
  });
  const blob = new Blob([resp.data], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  triggerDownload(blob, `report_${reportId}.docx`);
}

export async function downloadPdf(reportId: number): Promise<void> {
  const resp = await exportClient.get(`/api/export/${reportId}/pdf`, {
    responseType: "arraybuffer",
  });
  const blob = new Blob([resp.data], { type: "application/pdf" });
  triggerDownload(blob, `report_${reportId}.pdf`);
}

export async function previewPdf(reportId: number): Promise<string> {
  const resp = await exportClient.get(`/api/export/${reportId}/pdf`, {
    responseType: "arraybuffer",
  });
  const blob = new Blob([resp.data], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

/** @deprecated Use downloadWord instead */
export const downloadReport = downloadWord;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
