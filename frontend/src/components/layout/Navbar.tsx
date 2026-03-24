import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getReport, getSystemInfo } from "../../api/reportApi";
import { downloadWord, downloadPdf, previewPdf } from "../../api/exportApi";
import type { SystemInfo } from "../../types";

const TYPE_LABELS: Record<string, string> = {
  web: "WEB",
  ios: "iOS",
  android: "Android",
  ai: "AI",
  iot: "IoT",
};

const REQUIRED_FIELDS: { key: keyof SystemInfo; label: string }[] = [
  { key: "asName", label: "Название АС" },
  { key: "keId", label: "КЕ идентификатор" },
  { key: "url", label: "URL стенда" },
  { key: "dateStart", label: "Дата начала" },
  { key: "dateEnd", label: "Дата окончания" },
  { key: "segment", label: "Сегмент сети" },
  { key: "goal", label: "Цель тестирования" },
  { key: "qualificationLevel", label: "Уровень квалификации" },
  { key: "accessLevel", label: "Уровень доступа" },
  { key: "knowledgeLevel", label: "Уровень осведомлённости" },
  { key: "testConditions", label: "Условия тестирования" },
  { key: "executors", label: "Исполнители" },
  { key: "software", label: "Используемое ПО" },
];

function getMissingFields(info: SystemInfo): string[] {
  return REQUIRED_FIELDS
    .filter(({ key }) => {
      const val = info[key];
      if (Array.isArray(val)) return val.length === 0;
      return !val;
    })
    .map(({ label }) => label);
}

interface NavbarProps {
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export default function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const { id } = useParams();
  const reportId = id ? Number(id) : null;

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  type ExportAction = "preview-pdf" | "download-pdf" | "download-word";
  const [pendingAction, setPendingAction] = useState<ExportAction | null>(null);

  const { data: report } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReport(reportId!),
    enabled: !!reportId,
  });

  const { data: systemInfo } = useQuery({
    queryKey: ["system-info", reportId],
    queryFn: () => getSystemInfo(reportId!),
    enabled: !!reportId,
  });

  const closePdfPreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const runExport = async (action: ExportAction) => {
    if (!reportId) return;
    setMissingFields([]);
    setExporting(true);
    try {
      if (action === "preview-pdf") {
        const url = await previewPdf(reportId);
        setPdfUrl(url);
      } else if (action === "download-pdf") {
        await downloadPdf(reportId);
      } else {
        await downloadWord(reportId);
      }
      if (action !== "preview-pdf") toast.success("Отчёт скачан");
    } catch {
      toast.error("Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  };

  const handleExport = (action: ExportAction) => {
    if (!reportId) return;
    const missing = systemInfo ? getMissingFields(systemInfo) : [];
    if (missing.length > 0) {
      setPendingAction(action);
      setMissingFields(missing);
      return;
    }
    runExport(action);
  };

  return (
    <>
      <header className="h-13 bg-base-200 border-b border-base-300 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display font-bold text-primary text-lg leading-none tracking-tight select-none">
              &gt;_
              <span className="cursor-blink text-primary/80">▎</span>
            </span>
            <span className="font-display font-semibold text-sm tracking-[0.15em] uppercase text-base-content group-hover:text-primary transition-colors duration-200">
              Pentest Audit
            </span>
          </Link>

          {report && (
            <div className="flex items-center gap-2 ml-1">
              <span className="text-base-300 font-mono select-none">/</span>
              <span className="text-sm text-base-content/70 font-medium max-w-56 truncate">
                {report.name}
              </span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 border border-primary/40 text-primary bg-primary/8 tracking-widest uppercase">
                {TYPE_LABELS[report.report_type] ?? report.report_type}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-base-content"
            title="Справочники"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={onThemeToggle}
            className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-base-content"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            aria-label="Переключить тему"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
              </svg>
            )}
          </button>
          {report && (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-sm btn-outline btn-primary font-display tracking-wider text-xs"
              >
                {exporting ? <span className="loading loading-spinner loading-xs" /> : "Экспорт \u25BE"}
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-200 border border-base-300 rounded-sm z-50 w-52 p-1 mt-1">
                <li>
                  <button onClick={() => { handleExport("preview-pdf"); (document.activeElement as HTMLElement)?.blur(); }} disabled={exporting}>
                    Просмотр PDF
                  </button>
                </li>
                <li>
                  <button onClick={() => { handleExport("download-pdf"); (document.activeElement as HTMLElement)?.blur(); }} disabled={exporting}>
                    Экспорт PDF
                  </button>
                </li>
                <li>
                  <button onClick={() => { handleExport("download-word"); (document.activeElement as HTMLElement)?.blur(); }} disabled={exporting}>
                    Экспорт Word
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {pdfUrl && (
        <dialog open className="modal modal-open">
          <div
            className="modal-box bg-base-200 border border-base-300 rounded-sm p-0 flex flex-col"
            style={{ width: "95vw", maxWidth: "95vw", height: "90vh" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300 shrink-0">
              <span className="font-mono text-primary text-sm">›_</span>
              <span className="font-display font-semibold tracking-wide text-sm">
                Просмотр PDF
              </span>
              <div className="flex-1" />
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square text-base-content/50"
                onClick={closePdfPreview}
              >
                ✕
              </button>
            </div>
            <iframe
              src={pdfUrl}
              className="flex-1 w-full border-0"
              title="PDF Preview"
            />
          </div>
          <div className="modal-backdrop" onClick={closePdfPreview} />
        </dialog>
      )}

      {missingFields.length > 0 && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-base mb-3">Незаполненные поля</h3>
            <p className="text-sm text-base-content/70 mb-3">
              Следующие поля не заполнены, произвести экспорт отчёта?
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              {missingFields.map((f) => (
                <li key={f} className="text-sm text-warning">{f}</li>
              ))}
            </ul>
            <div className="modal-action mt-0">
              <button className="btn btn-sm" onClick={() => { setMissingFields([]); setPendingAction(null); }}>
                Отмена
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => { if (pendingAction) runExport(pendingAction); }}
                disabled={exporting}
              >
                {exporting ? <span className="loading loading-spinner loading-xs" /> : "Экспортировать"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setMissingFields([]); setPendingAction(null); }} />
        </dialog>
      )}
    </>
  );
}
