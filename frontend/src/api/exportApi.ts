import axios from "axios";

const exportClient = axios.create({
  baseURL: import.meta.env.VITE_EXPORT_API_URL || "http://127.0.0.1:8002",
  headers: { "Content-Type": "application/json" },
});

export async function downloadReport(reportId: number): Promise<void> {
  const resp = await exportClient.get(`/api/export/${reportId}/word`, {
    responseType: "arraybuffer",
  });
  const blob = new Blob([resp.data], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report_${reportId}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
