import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Editor, { type Monaco } from "@monaco-editor/react";
import { registerSnippets } from "./monacoTypes";
import toast from "react-hot-toast";
import {
  getPdfTemplates,
  updatePdfTemplate,
  resetPdfTemplate,
  reorderPdfTemplates,
  previewPdfTemplate,
  previewPdfTemplateAsPdf,
  type PdfTemplate,
} from "../../api/pdfTemplateApi";
import { useTheme } from "../../hooks/useTheme";
import ConfirmModal from "../common/ConfirmModal";
import PageHeader from "../common/PageHeader";
import EmptyState from "../common/EmptyState";
import type { ReportType } from "../../types";
import { REPORT_TYPE_STYLES } from "../../utils/labelConfig";

const REPORT_TYPES: ReportType[] = ["web", "ios", "android", "ai", "iot"];

const SECTION_LABELS: Record<string, string> = {
  title: "Титульная страница",
  toc: "Оглавление",
  general_info: "Общая информация",
  test_results: "Результаты тестирования",
  vulnerability: "Уязвимости",
  threat_classification: "Классификация угроз",
  checklist: "Чеклист",
  styles: "CSS стили",
};

const SECTION_ANCHORS: Record<string, string> = {
  title: "title-page",
  toc: "toc",
  general_info: "general-info",
  test_results: "test-results",
  vulnerability: "vulnerabilities",
  threat_classification: "threat-class",
  checklist: "checklist",
  styles: "",
};

type VarGroup = { group: string };
type VarEntry = { v: string; d: string; t: string };
const VAR_REFERENCE: (VarGroup | VarEntry)[] = [
  { group: "Отчёт" },
  { v: "data.report.name", d: "Название отчёта", t: "string" },
  { v: "data.report.report_type", d: "Тип (web, ios, android, ai, iot)", t: "string" },
  { v: "data.report.id", d: "ID отчёта", t: "number" },
  { group: "Системная информация" },
  { v: "data.systemInfo.asName", d: "Название АС", t: "string | null" },
  { v: "data.systemInfo.keId", d: "КЕ идентификатор", t: "string | null" },
  { v: "data.systemInfo.url", d: "URL тестового стенда", t: "string | null" },
  { v: "data.systemInfo.dateStart", d: "Дата начала", t: "string | null" },
  { v: "data.systemInfo.dateEnd", d: "Дата окончания", t: "string | null" },
  { v: "data.systemInfo.segment", d: "Сегмент сети", t: "string | null" },
  { v: "data.systemInfo.description", d: "Описание (HTML)", t: "string | null" },
  { v: "data.systemInfo.goal", d: "Цель тестирования", t: "string | null" },
  { v: "data.systemInfo.qualificationLevel", d: "Уровень квалификации", t: "string | null" },
  { v: "data.systemInfo.accessLevel", d: "Уровень доступа", t: "string | null" },
  { v: "data.systemInfo.knowledgeLevel", d: "Уровень осведомлённости", t: "string | null" },
  { v: "data.systemInfo.testConditions", d: "Условия тестирования", t: "string | null" },
  { v: "data.systemInfo.executors", d: "Исполнители", t: "{ name }[]" },
  { v: "data.systemInfo.software", d: "Используемое ПО", t: "{ name, description }[]" },
  { group: "Уязвимости" },
  { v: "data.summary.counts.critical", d: "Кол-во критических", t: "number" },
  { v: "data.summary.counts.high", d: "Кол-во высоких", t: "number" },
  { v: "data.summary.counts.medium", d: "Кол-во средних", t: "number" },
  { v: "data.summary.counts.low", d: "Кол-во низких", t: "number" },
  { v: "data.summary.counts.info", d: "Кол-во информационных", t: "number" },
  { v: "data.summary.vulnerabilities", d: "Массив уязвимостей", t: "Vulnerability[]" },
  { group: "Уязвимость (шаблон vulnerability)" },
  { v: "vuln.bug_name", d: "Название", t: "string" },
  { v: "vuln.bug_criticality", d: "Критичность", t: "string" },
  { v: "vuln.bug_description", d: "Описание (HTML)", t: "string | null" },
  { v: "vuln.cvss_score", d: "CVSS Score", t: "number | null" },
  { v: "vuln.cvss_vector", d: "CVSS Vector", t: "string | null" },
  { v: "vuln.reproduction_steps", d: "Шаги воспроизведения (HTML)", t: "string | null" },
  { v: "vuln.remediation", d: "Рекомендации (HTML)", t: "string | null" },
  { v: "vuln.automation_level", d: "Уровень автоматизации", t: "string" },
  { v: "index", d: "Порядковый номер уязвимости (с 0)", t: "number" },
  { group: "Чеклист" },
  { v: "data.checklist", d: "Массив проверок", t: "SecurityCheck[]" },
  { v: "check.check_id", d: "ID проверки", t: "string" },
  { v: "check.category", d: "Категория", t: "string" },
  { v: "check.name", d: "Название", t: "string" },
  { v: "check.status", d: "Статус (passed, failed, not_tested)", t: "string" },
  { v: "check.notes", d: "Заметки", t: "string | null" },
  { group: "Служебные" },
  { v: "headings", d: "Массив заголовков для оглавления", t: "{ id, title, level }[]" },
];

const PAGE_BREAK_STYLES = `
  <style>
    .page-break + .page-break, .checklist-section {
      border-top: 2px dashed #bbb;
      margin-top: 2em;
      padding-top: 2.5em;
      position: relative;
    }
    .page-break + .page-break::before, .checklist-section::before {
      content: "— page break —";
      position: absolute;
      top: -0.7em;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 1em;
      color: #aaa;
      font-size: 10px;
      font-family: monospace;
      letter-spacing: 0.1em;
      white-space: nowrap;
    }
  </style>`;

function SortableSectionItem({
  section,
  isActive,
  onClick,
}: {
  section: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-l-2 transition-colors ${
        isDragging ? "opacity-50" : ""
      } ${
        isActive
          ? "border-primary text-primary bg-primary/6 font-medium"
          : "border-transparent text-base-content/55 hover:text-base-content hover:border-base-content/20 hover:bg-base-300/30"
      }`}
      {...attributes}
      {...listeners}
    >
      <span className={`font-mono text-[10px] ${isActive ? "text-primary" : "text-base-content/30"}`}>
        {isActive ? "▶" : "☰"}
      </span>
      <span className="leading-tight">{SECTION_LABELS[section] ?? section}</span>
    </button>
  );
}

export default function PdfTemplateEditor() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const [activeType, setActiveType] = useState<ReportType>("web");
  const [activeSection, setActiveSection] = useState("title");
  const [editorContent, setEditorContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"html" | "pdf">("html");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlIframeRef = useRef<HTMLIFrameElement>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  const previewRenderedRef = useRef(false);
  const editorRef = useRef<Parameters<NonNullable<Parameters<typeof Editor>[0]["onMount"]>>[0] | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["pdf-templates", activeType],
    queryFn: () => getPdfTemplates(activeType),
  });

  // Split templates into sortable sections and fixed styles
  const contentSections = (templates ?? []).filter((t) => t.section !== "styles");
  const stylesTemplate = templates?.find((t) => t.section === "styles");
  const activeTemplate = templates?.find((t) => t.section === activeSection);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const reorderMut = useMutation({
    mutationFn: (orders: { id: number; sort_order: number }[]) => reorderPdfTemplates(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
      previewRenderedRef.current = false;
      fetchPreview(editorContent);
    },
    onError: () => toast.error("Ошибка сохранения порядка"),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = contentSections.findIndex((t) => t.section === active.id);
    const newIdx = contentSections.findIndex((t) => t.section === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...contentSections];
    const [moved] = reordered.splice(oldIdx, 1);
    if (!moved) return;
    reordered.splice(newIdx, 0, moved);
    reorderMut.mutate(reordered.map((t, i) => ({ id: t.id, sort_order: i })));
  };

  const scrollToSection = (section: string) => {
    const anchor = SECTION_ANCHORS[section];
    if (!anchor) return;
    // HTML iframe
    try {
      const doc = htmlIframeRef.current?.contentDocument;
      const el = doc?.getElementById(anchor) ?? doc?.querySelector(`.${anchor}`);
      el?.scrollIntoView({ behavior: "smooth" });
    } catch { /* cross-origin or not loaded */ }
  };

  // Sync editor content when template or section changes
  useEffect(() => {
    if (activeTemplate) {
      setEditorContent(activeTemplate.content);
      setIsDirty(false);
    }
  }, [activeTemplate?.id, activeTemplate?.updated_at]);

  // Fetch initial preview on first load or type change; scroll on section change
  useEffect(() => {
    if (!activeTemplate) return;
    if (previewRenderedRef.current) {
      // Already rendered — just scroll to section anchor
      scrollToSection(activeSection);
    } else {
      fetchPreview(activeTemplate.content);
      previewRenderedRef.current = true;
    }
  }, [activeTemplate?.id]);

  const fetchPreview = useCallback(
    async (content: string, mode?: "html" | "pdf") => {
      const m = mode ?? previewMode;
      setPreviewLoading(true);
      const req = {
        report_type: activeType,
        section: activeSection,
        content,
        css: stylesTemplate?.content,
        section_order: contentSections.map((t) => t.section),
      };
      try {
        if (m === "pdf") {
          if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
          const url = await previewPdfTemplateAsPdf(req);
          setPreviewPdfUrl(url);
        } else {
          let html = await previewPdfTemplate(req);
          html = html.replace("</head>", `${PAGE_BREAK_STYLES}</head>`);
          setPreviewHtml(html);
        }
      } catch {
        if (m === "html") {
          setPreviewHtml(
            "<p style='color:#e55;font-family:monospace;padding:1em'>Ошибка рендеринга предпросмотра</p>"
          );
        } else {
          setPreviewPdfUrl(null);
          toast.error("Ошибка генерации PDF предпросмотра");
        }
      } finally {
        setPreviewLoading(false);
      }
    },
    [activeType, activeSection, stylesTemplate?.content, previewMode, previewPdfUrl, contentSections]
  );

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value ?? "";
    setEditorContent(newContent);
    setIsDirty(newContent !== (activeTemplate?.content ?? ""));

    // Debounced preview
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      fetchPreview(newContent);
    }, 1500);
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!activeTemplate) throw new Error("No template");
      const payload =
        activeSection === "styles"
          ? { css: editorContent, content: editorContent }
          : { content: editorContent };
      return updatePdfTemplate(activeTemplate.id, payload);
    },
    onSuccess: () => {
      toast.success("Шаблон сохранён");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
    },
    onError: () => toast.error("Ошибка сохранения шаблона"),
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!activeTemplate) throw new Error("No template");
      return resetPdfTemplate(activeTemplate.id);
    },
    onSuccess: (data: PdfTemplate) => {
      toast.success("Шаблон сброшен к дефолту");
      setEditorContent(data.content);
      setIsDirty(false);
      setResetConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
      fetchPreview(data.content);
    },
    onError: () => {
      toast.error("Ошибка сброса шаблона");
      setResetConfirmOpen(false);
    },
  });

  const handleSectionChange = (section: string) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setActiveSection(section);
    // Don't clear preview — scroll to section instead
    scrollToSection(section);
  };

  const handleTypeChange = (type: ReportType) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setActiveType(type);
    setActiveSection("title");
    setPreviewHtml("");
    if (previewPdfUrl) { URL.revokeObjectURL(previewPdfUrl); setPreviewPdfUrl(null); }
    previewRenderedRef.current = false;
    setIsDirty(false);
  };

  const editorLanguage = activeSection === "styles" ? "css" : "html";

  const insertAtCursor = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (!selection) return;
    editor.executeEdits("variable-ref", [{
      range: selection,
      text,
      forceMoveMarkers: true,
    }]);
    editor.focus();
  };

  const handleEditorMount = (editor: Parameters<NonNullable<Parameters<typeof Editor>[0]["onMount"]>>[0], monaco: Monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme("pah-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "tag", foreground: "56d4cf" },
        { token: "attribute.name", foreground: "c4a6f5" },
        { token: "attribute.value", foreground: "e5c07b" },
        { token: "delimiter", foreground: "6b7280" },
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "string", foreground: "e5c07b" },
        { token: "keyword", foreground: "c678dd" },
        { token: "number", foreground: "d19a66" },
      ],
      colors: {
        "editor.background": "#1a1d2e",
        "editor.foreground": "#c8ccd4",
        "editor.lineHighlightBackground": "#1f2335",
        "editor.selectionBackground": "#3d4f6f80",
        "editorLineNumber.foreground": "#4b5263",
        "editorLineNumber.activeForeground": "#737a8c",
        "editorCursor.foreground": "#56d4cf",
        "editor.inactiveSelectionBackground": "#2c3347",
      },
    });
    if (theme === "dark") monaco.editor.setTheme("pah-dark");

    registerSnippets(monaco);
  };

  return (
    <div className="flex flex-col gap-0" style={{ height: "calc(100vh - 6rem)" }}>
      <PageHeader title="PDF-шаблоны" subtitle="редактирование шаблонов отчётов" className="mb-4" />

      {/* Report type tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-3 shrink-0">
        {REPORT_TYPES.map((t) => {
          const cfg = REPORT_TYPE_STYLES[t];
          return (
            <button
              key={t}
              role="tab"
              className={`tab font-display text-xs tracking-wider ${activeType === t ? "tab-active" : ""}`}
              onClick={() => handleTypeChange(t)}
            >
              {cfg.text}
            </button>
          );
        })}
      </div>

      {/* Variable reference */}
      <details className="mb-2 shrink-0">
        <summary className="label-section cursor-pointer select-none py-1 hover:text-base-content/50 transition-colors">
          Справочник переменных ‹клик для вставки›
        </summary>
        <div className="overflow-x-auto border border-base-300 bg-base-200/30 mt-1 max-h-64 overflow-y-auto">
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th className="label-section">Переменная</th>
                <th className="label-section">Описание</th>
                <th className="label-section">Тип</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {VAR_REFERENCE.map((item, i) =>
                "group" in item ? (
                  <tr key={i}><td colSpan={3} className="label-section pt-3">{item.group}</td></tr>
                ) : (
                  <tr key={i} className="cursor-pointer hover:bg-primary/5" onClick={() => insertAtCursor(`{${item.v}}`)}>
                    <td className="font-mono text-primary/70 hover:text-primary">{item.v}</td>
                    <td>{item.d}</td>
                    <td className="font-mono text-base-content/40">{item.t}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </details>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState message="шаблоны не найдены для данного типа" />
      ) : (
        <div className="flex flex-1 gap-0 overflow-hidden border border-base-300 rounded-sm">
          {/* Section sidebar */}
          <div className="w-52 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto flex flex-col">
            <div className="px-3 py-2 label-section">Секции</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={contentSections.map((t) => t.section)} strategy={verticalListSortingStrategy}>
                {contentSections.map((t) => (
                  <SortableSectionItem
                    key={t.section}
                    section={t.section}
                    isActive={activeSection === t.section}
                    onClick={() => handleSectionChange(t.section)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {stylesTemplate && (
              <>
                <div className="mx-3 my-1 border-t border-base-300/60" />
                <button
                  onClick={() => handleSectionChange("styles")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-l-2 transition-colors ${
                    activeSection === "styles"
                      ? "border-primary text-primary bg-primary/6 font-medium"
                      : "border-transparent text-base-content/55 hover:text-base-content hover:border-base-content/20 hover:bg-base-300/30"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${activeSection === "styles" ? "text-primary" : "text-base-content/30"}`}>
                    {activeSection === "styles" ? "▶" : "◇"}
                  </span>
                  <span className="leading-tight font-mono text-xs">CSS стили</span>
                </button>
              </>
            )}
          </div>

          {/* Main content: editor (left) + preview (right) side by side */}
          <div className="flex flex-1 min-w-0">
            {/* Editor pane */}
            <div className="flex flex-col w-1/2 min-w-0 border-r border-base-300">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 border-b border-base-300 shrink-0">
                <span className="label-section">Редактор</span>
                <span className="font-mono text-[10px] text-base-content/30 tracking-wider">
                  {editorLanguage === "css" ? "CSS" : "HTML"}
                </span>
                {isDirty && (
                  <span className="font-mono text-[10px] tracking-widest text-warning/70">
                    НЕСОХРАНЕНО
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  language={editorLanguage}
                  theme={theme === "dark" ? "pah-dark" : "light"}
                  value={editorContent}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    tabSize: 2,
                    padding: { top: 8 },
                  }}
                />
              </div>
              {/* Action bar */}
              <div className="flex items-center gap-2 px-3 py-2 bg-base-200 border-t border-base-300 shrink-0">
                <button
                  type="button"
                  className="btn btn-primary btn-sm font-display tracking-wider"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !isDirty}
                >
                  {saveMutation.isPending ? "Сохранение..." : "›_ Сохранить"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm font-display tracking-wider text-xs"
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={resetMutation.isPending}
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm font-display tracking-wider text-xs"
                  onClick={() => fetchPreview(editorContent)}
                  disabled={previewLoading}
                >
                  Обновить
                </button>
                <div className="flex-1" />
                {activeTemplate && (
                  <span className="font-mono text-[10px] text-base-content/30">
                    id:{activeTemplate.id}
                  </span>
                )}
              </div>
            </div>

            {/* Preview pane */}
            <div className="flex flex-col w-1/2 min-w-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 border-b border-base-300 shrink-0">
                <span className="label-section">Предпросмотр</span>
                <div className="flex gap-0 border border-base-300 rounded-sm overflow-hidden">
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[10px] font-mono tracking-wider transition-colors ${
                      previewMode === "html"
                        ? "bg-primary text-primary-content"
                        : "bg-base-300/50 text-base-content/50 hover:text-base-content"
                    }`}
                    onClick={() => { setPreviewMode("html"); if (activeTemplate) fetchPreview(editorContent, "html"); }}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[10px] font-mono tracking-wider transition-colors ${
                      previewMode === "pdf"
                        ? "bg-primary text-primary-content"
                        : "bg-base-300/50 text-base-content/50 hover:text-base-content"
                    }`}
                    onClick={() => { setPreviewMode("pdf"); if (activeTemplate) fetchPreview(editorContent, "pdf"); }}
                  >
                    PDF
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-white relative">
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <span className="loading loading-spinner loading-md text-primary" />
                  </div>
                )}
                {previewMode === "html" ? (
                  <iframe
                    ref={htmlIframeRef}
                    title="HTML Preview"
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                    style={{ background: "#fff" }}
                    onLoad={() => scrollToSection(activeSection)}
                  />
                ) : (
                  <iframe
                    ref={pdfIframeRef}
                    title="PDF Preview"
                    src={previewPdfUrl ?? "about:blank"}
                    className="w-full h-full border-0"
                    style={{ background: "#fff" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={resetConfirmOpen}
        title="Сброс шаблона"
        message={`Сбросить секцию "${SECTION_LABELS[activeSection]}" к значению по умолчанию? Текущие изменения будут потеряны.`}
        onConfirm={() => resetMutation.mutate()}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
