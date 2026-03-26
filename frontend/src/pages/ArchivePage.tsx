import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getDocuments, deleteDocument, uploadDocument, importReport, searchDocuments,
} from "../api/archiveApi";
import type { SearchResponse } from "../api/archiveApi";
import { getReports } from "../api/reportApi";
import type { ReportType, Severity } from "../types";
import { REPORT_TYPE_STYLES } from "../utils/labelConfig";
import PageHeader from "../components/common/PageHeader";
import Tag from "../components/common/Tag";
import EmptyState from "../components/common/EmptyState";
import ConfirmModal from "../components/common/ConfirmModal";
import SeverityBadge from "../components/common/SeverityBadge";

const SEVERITY_VALUES: Severity[] = ["critical", "high", "medium", "low", "info"];

function isSeverity(v: string): v is Severity {
  return (SEVERITY_VALUES as string[]).includes(v);
}

function isReportType(v: string): v is ReportType {
  return v in REPORT_TYPE_STYLES;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ArchivePage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);

  // upload
  const [uploadType, setUploadType] = useState("");
  const [uploading, setUploading] = useState(false);

  // import
  const [selectedReportId, setSelectedReportId] = useState("");
  const [importing, setImporting] = useState(false);

  // delete
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // reports for import
  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(),
  });

  // documents
  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ["archive-documents"],
    queryFn: getDocuments,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some((d) => d.status === "processing") ? 5000 : false;
    },
  });

  // ── Search ──────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchDocuments({ query: searchQuery.trim() });
      setSearchResults(res);
    } catch {
      toast.error("Ошибка поиска");
    } finally {
      setSearching(false);
    }
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["archive-documents"] });
    qc.invalidateQueries({ queryKey: ["archive-stats"] });
  };

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { invalidateAll(); setPendingDelete(null); toast.success("Документ удалён"); },
    onError: () => { setPendingDelete(null); toast.error("Ошибка удаления"); },
  });

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Выберите файл"); return; }
    setUploading(true);
    try {
      await uploadDocument(file, { report_type: uploadType || undefined });
      invalidateAll();
      toast.success("Файл загружен");
      if (fileRef.current) fileRef.current.value = "";
      setUploadType("");
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    const id = parseInt(selectedReportId, 10);
    if (isNaN(id)) { toast.error("Выберите отчёт"); return; }
    setImporting(true);
    try {
      await importReport(id);
      invalidateAll();
      toast.success("Отчёт импортирован");
      setSelectedReportId("");
    } catch {
      toast.error("Ошибка импорта");
    } finally {
      setImporting(false);
    }
  };

  // filter out already archived reports
  const archivedReportIds = new Set(
    docs.filter((d) => d.source === "report_service").map((d) => d.doc_id.replace("report-", "")),
  );
  const availableReports = reports.filter((r) => !archivedReportIds.has(String(r.id)));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-page max-w-5xl">
      <PageHeader title="Архив" subtitle="семантический поиск по документам" className="mb-5" />

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          className="input input-bordered flex-1 font-mono text-sm"
          placeholder="Поиск по архивным отчётам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          className="btn btn-primary font-display tracking-wider"
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
        >
          {searching ? <span className="loading loading-spinner loading-xs" /> : "Искать"}
        </button>
      </div>

      {searchResults && (
        <div className="space-y-2 mb-6">
          <div className="label-section">Результаты: {searchResults.total_results}</div>
          {searchResults.results.map((r, i) => (
            <div key={i} className="border border-base-300 bg-base-200/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag colorClass="bg-success/15 text-success border-success/40" size="xs">
                  {(r.score * 100).toFixed(0)}%
                </Tag>
                {r.severity && isSeverity(r.severity) && <SeverityBadge severity={r.severity} />}
                {r.report_type && isReportType(r.report_type) && (
                  <Tag colorClass={REPORT_TYPE_STYLES[r.report_type].style} size="xs">
                    {REPORT_TYPE_STYLES[r.report_type].text}
                  </Tag>
                )}
                <span className="text-xs text-base-content/40 font-mono">{r.doc_name}</span>
                {r.section && <span className="text-xs text-base-content/40">&sect; {r.section}</span>}
              </div>
              <p className="text-sm text-base-content/80 line-clamp-3">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Documents table */}
      <div className="divider" />

      {docsLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-sm" />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState message="нет документов" />
      ) : (
        <div className="border border-base-300 bg-base-200/20 overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th className="label-section">Название</th>
                <th className="label-section">Тестируемая система</th>
                <th className="label-section">Уязвимости</th>
                <th className="label-section">Дата завершения</th>
                <th className="label-section">Тип</th>
                <th className="label-section w-16" />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.doc_id}>
                  <td className="font-mono text-sm">{d.doc_name}</td>
                  <td>
                    {d.status === "processing" ? (
                      <span className="flex items-center gap-1.5 text-xs text-base-content/40">
                        <span className="loading loading-spinner loading-xs" /> Обработка&hellip;
                      </span>
                    ) : d.status === "error" ? (
                      <span className="text-xs text-error">{d.error ?? "Ошибка"}</span>
                    ) : (
                      <span className="text-sm">{d.system_name ?? "\u2014"}</span>
                    )}
                  </td>
                  <td className="font-mono text-sm">{d.vulnerability_count ?? "\u2014"}</td>
                  <td className="text-sm">{d.completion_date ? formatDate(d.completion_date) : "\u2014"}</td>
                  <td>
                    {d.report_type && isReportType(d.report_type) ? (
                      <Tag colorClass={REPORT_TYPE_STYLES[d.report_type].style} size="xs">
                        {REPORT_TYPE_STYLES[d.report_type].text}
                      </Tag>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn btn-ghost btn-xs text-error/50 hover:text-error"
                      onClick={() => setPendingDelete(d.doc_id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload / Import */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end mt-4">
        <div className="form-control">
          <label className="label py-1"><span className="label-text">Файл (DOCX/PDF)</span></label>
          <input
            type="file"
            accept=".docx,.pdf"
            className="file-input file-input-bordered file-input-sm w-full"
            ref={fileRef}
          />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text">Тип отчёта</span></label>
          <select
            className="select select-bordered select-sm"
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
          >
            <option value="">&mdash;</option>
            <option value="web">WEB</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="ai">AI</option>
            <option value="iot">IoT</option>
          </select>
        </div>
        <button className="btn btn-sm btn-primary self-end" onClick={handleUpload} disabled={uploading}>
          {uploading ? "Загрузка\u2026" : "Загрузить"}
        </button>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Импорт отчёта</span></label>
          <select
            className="select select-bordered select-sm w-full"
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
          >
            <option value="">Выбрать отчёт...</option>
            {availableReports.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div />
        <button className="btn btn-sm btn-outline self-end" onClick={handleImport} disabled={importing || !selectedReportId}>
          {importing ? "Импорт\u2026" : "Импортировать"}
        </button>
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!pendingDelete}
        message="Удалить документ из архива?"
        onConfirm={() => { if (pendingDelete) deleteMut.mutate(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
