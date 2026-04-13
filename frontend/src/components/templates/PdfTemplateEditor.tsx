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
  createPdfTemplateSection,
  deletePdfTemplateSection,
  getPdfTemplateVersions,
  restorePdfTemplateVersion,
  type PdfTemplate,
  type PdfTemplateVersion,
  type SectionMeta,
} from "../../api/pdfTemplateApi";
import { useTheme } from "../../hooks/useTheme";
import ConfirmModal from "../common/ConfirmModal";
import ModalShell from "../common/ModalShell";
import PageHeader from "../common/PageHeader";
import EmptyState from "../common/EmptyState";
import type { ReportType } from "../../types";
import { REPORT_TYPE_STYLES } from "../../utils/labelConfig";

const REPORT_TYPES: ReportType[] = ["web", "ios", "android", "ai", "iot"];

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

interface SortableSectionItemProps {
  template: PdfTemplate;
  isActive: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  onRequestDelete: () => void;
}

function SortableSectionItem({
  template,
  isActive,
  onSelect,
  onRename,
  onRequestDelete,
}: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: template.section,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(template.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) setDraft(template.label);
  }, [template.label, renaming]);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== template.label) {
      onRename(trimmed);
    } else {
      setDraft(template.label);
    }
    setRenaming(false);
  };

  const cancel = () => {
    setDraft(template.label);
    setRenaming(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-l-2 transition-colors ${
        isDragging ? "opacity-50" : ""
      } ${
        isActive
          ? "border-primary text-primary bg-primary/6 font-medium"
          : "border-transparent text-base-content/55 hover:text-base-content hover:border-base-content/20 hover:bg-base-300/30"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="cursor-grab active:cursor-grabbing flex items-center"
        {...attributes}
        {...listeners}
        aria-label="Перетащить"
      >
        <span className={`font-mono text-[10px] ${isActive ? "text-primary" : "text-base-content/30"}`}>
          {isActive ? "▶" : "☰"}
        </span>
      </button>
      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="input input-xs input-bordered flex-1 min-w-0 h-6 px-1 text-sm"
        />
      ) : (
        <span
          className="leading-tight flex-1 min-w-0 truncate cursor-text"
          onClick={(e) => {
            e.stopPropagation();
            if (isActive) {
              setRenaming(true);
            } else {
              onSelect();
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
          }}
          title={template.label}
        >
          {template.label}
        </span>
      )}
      {!renaming && (
        <>
          {template.is_system ? (
            <span
              className="font-mono text-[10px] text-base-content/25 shrink-0"
              title="Системная секция — нельзя удалить"
            >
              ◈
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete();
              }}
              className="font-mono text-xs text-base-content/30 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Удалить секцию"
              aria-label="Удалить секцию"
            >
              ✕
            </button>
          )}
        </>
      )}
    </div>
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

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIsNumbered, setNewIsNumbered] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<PdfTemplate | null>(null);

  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<PdfTemplateVersion | null>(null);

  // Version navigation: null = HEAD (current content), 0..N-1 = versions[] index
  const [viewingVersionIdx, setViewingVersionIdx] = useState<number | null>(null);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState<"prev" | "next" | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const scrollToSection = useCallback((section: string) => {
    const target = (templates ?? []).find((t) => t.section === section);
    const anchor = target?.anchor;
    if (!anchor) return;
    try {
      const doc = htmlIframeRef.current?.contentDocument;
      const el = doc?.getElementById(anchor) ?? doc?.querySelector(`.${anchor}`);
      el?.scrollIntoView({ behavior: "smooth" });
    } catch {
      /* cross-origin or not loaded */
    }
  }, [templates]);

  const fetchPreview = useCallback(
    async (content: string, mode?: "html" | "pdf") => {
      const m = mode ?? previewMode;
      setPreviewLoading(true);
      const sectionMetas: SectionMeta[] = contentSections.map((t) => ({
        section: t.section,
        anchor: t.anchor,
        isNumbered: t.is_numbered,
        hasBuiltin: t.is_builtin,
      }));
      const req = {
        report_type: activeType,
        section: activeSection,
        content,
        css: stylesTemplate?.content,
        sections: sectionMetas,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeType, activeSection, stylesTemplate?.content, previewMode, previewPdfUrl, contentSections]
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
      scrollToSection(activeSection);
    } else {
      fetchPreview(activeTemplate.content);
      previewRenderedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate?.id]);

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value ?? "";
    setEditorContent(newContent);
    setIsDirty(newContent !== (activeTemplate?.content ?? ""));

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      fetchPreview(newContent);
    }, 1500);
  };

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

  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      updatePdfTemplate(id, { label }),
    onSuccess: () => {
      toast.success("Название обновлено");
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
    },
    onError: () => toast.error("Ошибка переименования"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { label: string; is_numbered: boolean }) =>
      createPdfTemplateSection({
        report_type: activeType,
        label: payload.label,
        is_numbered: payload.is_numbered,
      }),
    onSuccess: (data: PdfTemplate) => {
      toast.success("Секция создана");
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
      setCreateModalOpen(false);
      setNewLabel("");
      setNewIsNumbered(true);
      setActiveSection(data.section);
      previewRenderedRef.current = false;
    },
    onError: () => toast.error("Ошибка создания секции"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePdfTemplateSection(id),
    onSuccess: (_data, deletedId) => {
      toast.success("Секция удалена");
      const wasActive = activeTemplate?.id === deletedId;
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
      setDeleteTarget(null);
      if (wasActive) {
        const remaining = (templates ?? []).filter(
          (t) => t.id !== deletedId && t.section !== "styles",
        );
        if (remaining.length > 0 && remaining[0]) {
          setActiveSection(remaining[0].section);
        }
        previewRenderedRef.current = false;
      }
    },
    onError: () => {
      toast.error("Ошибка удаления секции");
      setDeleteTarget(null);
    },
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["pdf-template-versions", activeTemplate?.id],
    queryFn: () => getPdfTemplateVersions(activeTemplate!.id),
    enabled: !!activeTemplate && activeSection !== "styles",
  });

  const restoreMutation = useMutation({
    mutationFn: ({ templateId, versionId }: { templateId: number; versionId: number }) =>
      restorePdfTemplateVersion(templateId, versionId),
    onSuccess: () => {
      toast.success("Восстановлено");
      queryClient.invalidateQueries({ queryKey: ["pdf-templates", activeType] });
      queryClient.invalidateQueries({ queryKey: ["pdf-template-versions", activeTemplate?.id] });
      setRestoreTarget(null);
      setShowVersionsModal(false);
    },
    onError: () => {
      toast.error("Ошибка восстановления");
      setRestoreTarget(null);
    },
  });

  // ── Version navigation ─────────────────────────────────────────────────────
  // HEAD = null = текущее содержимое activeTemplate.content
  // idx 0 = самая свежая из versions[] (предыдущая версия)
  // idx versions.length - 1 = самая старая
  // "Номер" для отображения: HEAD → versions.length + 1, versions[idx] → versions.length - idx

  const totalVersions = versions.length + 1; // +1 for HEAD
  const currentVersionNumber = viewingVersionIdx === null ? totalVersions : versions.length - viewingVersionIdx;

  // Reset viewing version when switching template
  useEffect(() => {
    setViewingVersionIdx(null);
  }, [activeTemplate?.id]);

  const navigateVersion = (direction: "prev" | "next") => {
    if (isDirty) {
      toast.error("Сначала сохраните изменения");
      return;
    }
    if (!activeTemplate) return;

    if (direction === "prev") {
      // Prev = older version
      if (viewingVersionIdx === null) {
        if (versions.length === 0) return;
        setViewingVersionIdx(0);
        setEditorContent(versions[0]!.content);
        fetchPreview(versions[0]!.content);
      } else if (viewingVersionIdx < versions.length - 1) {
        const nextIdx = viewingVersionIdx + 1;
        setViewingVersionIdx(nextIdx);
        setEditorContent(versions[nextIdx]!.content);
        fetchPreview(versions[nextIdx]!.content);
      }
    } else {
      // Next = newer version
      if (viewingVersionIdx === null) return;
      if (viewingVersionIdx === 0) {
        setViewingVersionIdx(null);
        setEditorContent(activeTemplate.content);
        fetchPreview(activeTemplate.content);
      } else {
        const nextIdx = viewingVersionIdx - 1;
        setViewingVersionIdx(nextIdx);
        setEditorContent(versions[nextIdx]!.content);
        fetchPreview(versions[nextIdx]!.content);
      }
    }
  };

  const jumpToVersion = (idx: number | null) => {
    if (isDirty) {
      toast.error("Сначала сохраните изменения");
      return;
    }
    if (!activeTemplate) return;
    setViewingVersionIdx(idx);
    const content = idx === null ? activeTemplate.content : versions[idx]!.content;
    setEditorContent(content);
    fetchPreview(content);
    setVersionDropdownOpen(null);
  };

  const startLongPress = (direction: "prev" | "next") => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setVersionDropdownOpen(direction);
    }, 400);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const canGoPrev = versions.length > 0 && (viewingVersionIdx === null || viewingVersionIdx < versions.length - 1);
  const canGoNext = viewingVersionIdx !== null;

  const handleSectionChange = (section: string) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setActiveSection(section);
    scrollToSection(section);
  };

  const handleTypeChange = (type: ReportType) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setActiveType(type);
    setActiveSection("title");
    setPreviewHtml("");
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    previewRenderedRef.current = false;
    setIsDirty(false);
  };

  const editorLanguage = activeSection === "styles" ? "css" : "html";

  const insertAtCursor = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (!selection) return;
    editor.executeEdits("variable-ref", [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
  };

  const handleEditorMount = (
    editor: Parameters<NonNullable<Parameters<typeof Editor>[0]["onMount"]>>[0],
    monaco: Monaco,
  ) => {
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

  const formatVersionDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const canReset = !!activeTemplate?.is_builtin;
  const canShowVersions = !!activeTemplate && activeSection !== "styles";

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
          <div className="w-56 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto flex flex-col">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-base-300/60">
              <span className="label-section">Секции</span>
              <div className="flex-1" />
              <button
                type="button"
                className="font-mono text-[11px] tracking-wider text-base-content/50 hover:text-primary transition-colors"
                onClick={() => {
                  setNewLabel("");
                  setNewIsNumbered(true);
                  setCreateModalOpen(true);
                }}
                title="Добавить секцию"
              >
                + новая
              </button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={contentSections.map((t) => t.section)} strategy={verticalListSortingStrategy}>
                {contentSections.map((t) => (
                  <SortableSectionItem
                    key={t.section}
                    template={t}
                    isActive={activeSection === t.section}
                    onSelect={() => handleSectionChange(t.section)}
                    onRename={(label) => renameMutation.mutate({ id: t.id, label })}
                    onRequestDelete={() => setDeleteTarget(t)}
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
                    {activeSection === "styles" ? "▶" : "◈"}
                  </span>
                  <span className="leading-tight font-mono text-xs">{stylesTemplate.label}</span>
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
                <span className="font-mono text-[10px] tracking-widest px-1.5 py-0.5 border border-base-content/20 bg-base-content/5 text-base-content/50">
                  {editorLanguage === "css" ? "CSS" : "HTML"}
                </span>
                {isDirty && (
                  <span className="font-mono text-[10px] tracking-widest px-1.5 py-0.5 border border-warning/50 bg-warning/10 text-warning">
                    НЕСОХРАНЕНО
                  </span>
                )}
                {activeTemplate && !activeTemplate.is_builtin && !activeTemplate.is_system && (
                  <span className="font-mono text-[10px] tracking-widest px-1.5 py-0.5 border border-secondary/40 bg-secondary/8 text-secondary">
                    ПОЛЬЗ.
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
                  className="btn btn-outline btn-sm font-display tracking-wider"
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={resetMutation.isPending || !canReset}
                  title={canReset ? undefined : "Недоступно для пользовательских секций"}
                >
                  Сбросить
                </button>
                {canShowVersions && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm font-display tracking-wider"
                    onClick={() => setShowVersionsModal(true)}
                  >
                    История
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm font-display tracking-wider"
                  onClick={() => fetchPreview(editorContent)}
                  disabled={previewLoading}
                >
                  Обновить
                </button>
                <div className="flex-1" />
                {activeTemplate && activeSection !== "styles" && (
                  <div className="flex items-center gap-1 relative">
                    <button
                      type="button"
                      className="font-mono text-sm px-1.5 py-0.5 border border-base-300 text-base-content/60 hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:hover:text-base-content/60 disabled:hover:border-base-300 transition-colors"
                      onClick={() => navigateVersion("prev")}
                      onMouseDown={() => startLongPress("prev")}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => startLongPress("prev")}
                      onTouchEnd={cancelLongPress}
                      disabled={!canGoPrev}
                      title="Предыдущая версия (зажать — список)"
                      aria-label="Предыдущая версия"
                    >
                      ‹
                    </button>
                    <span
                      className={`font-mono text-[10px] tracking-widest px-1.5 py-0.5 border select-none ${
                        viewingVersionIdx === null
                          ? "border-base-content/20 bg-base-content/5 text-base-content/50"
                          : "border-warning/50 bg-warning/10 text-warning"
                      }`}
                      title={viewingVersionIdx === null ? "Текущая версия" : "Просмотр старой версии"}
                    >
                      v{currentVersionNumber}/{totalVersions}
                    </span>
                    <button
                      type="button"
                      className="font-mono text-sm px-1.5 py-0.5 border border-base-300 text-base-content/60 hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:hover:text-base-content/60 disabled:hover:border-base-300 transition-colors"
                      onClick={() => navigateVersion("next")}
                      onMouseDown={() => startLongPress("next")}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => startLongPress("next")}
                      onTouchEnd={cancelLongPress}
                      disabled={!canGoNext}
                      title="Следующая версия (зажать — список)"
                      aria-label="Следующая версия"
                    >
                      ›
                    </button>

                    {versionDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setVersionDropdownOpen(null)}
                        />
                        <div className="absolute bottom-full right-0 mb-1 z-50 w-72 max-h-64 overflow-y-auto bg-base-200 border border-base-300 shadow-lg">
                          <div className="label-section px-3 py-1.5 border-b border-base-300 sticky top-0 bg-base-200">
                            Версии секции
                          </div>
                          {versionsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <span className="loading loading-spinner loading-xs" />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => jumpToVersion(null)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs font-mono hover:bg-primary/10 transition-colors border-l-2 ${
                                  viewingVersionIdx === null
                                    ? "border-primary bg-primary/8 text-primary"
                                    : "border-transparent text-base-content/70"
                                }`}
                              >
                                <span className="w-10 text-[10px] tracking-widest">v{totalVersions}</span>
                                <span className="flex-1">HEAD — текущая</span>
                              </button>
                              {versions.map((v, i) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => jumpToVersion(i)}
                                  className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs font-mono hover:bg-primary/10 transition-colors border-l-2 ${
                                    viewingVersionIdx === i
                                      ? "border-primary bg-primary/8 text-primary"
                                      : "border-transparent text-base-content/70"
                                  }`}
                                >
                                  <span className="w-10 text-[10px] tracking-widest text-base-content/40">
                                    v{versions.length - i}
                                  </span>
                                  <span className="flex-1 truncate">{formatVersionDate(v.created_at)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Preview pane */}
            <div className="flex flex-col w-1/2 min-w-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 border-b border-base-300 shrink-0">
                <span className="label-section">Предпросмотр</span>
                <div className="flex gap-0 border border-base-300 overflow-hidden">
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[10px] font-mono tracking-widest transition-colors ${
                      previewMode === "html"
                        ? "bg-primary/15 text-primary border-r border-primary/40"
                        : "bg-transparent text-base-content/40 hover:text-base-content border-r border-base-300"
                    }`}
                    onClick={() => { setPreviewMode("html"); if (activeTemplate) fetchPreview(editorContent, "html"); }}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[10px] font-mono tracking-widest transition-colors ${
                      previewMode === "pdf"
                        ? "bg-primary/15 text-primary"
                        : "bg-transparent text-base-content/40 hover:text-base-content"
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
        message={`Сбросить секцию "${activeTemplate?.label ?? ""}" к значению по умолчанию? Текущие изменения будут потеряны.`}
        onConfirm={() => resetMutation.mutate()}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Create section modal */}
      <ModalShell
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Новая секция"
        maxWidth="max-w-sm"
        actions={
          <>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary font-display tracking-wider"
              onClick={() => {
                const trimmed = newLabel.trim();
                if (!trimmed) {
                  toast.error("Введите название секции");
                  return;
                }
                createMutation.mutate({ label: trimmed, is_numbered: newIsNumbered });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Создание..." : "›_ Создать"}
            </button>
          </>
        }
      >
        <div className="form-control">
          <label className="label py-1"><span className="label-text">Название секции</span></label>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="например: Выводы"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = newLabel.trim();
                if (trimmed) {
                  createMutation.mutate({ label: trimmed, is_numbered: newIsNumbered });
                }
              }
            }}
          />
          <label className="flex items-center gap-2 cursor-pointer mt-3 select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={newIsNumbered}
              onChange={(e) => setNewIsNumbered(e.target.checked)}
            />
            <span className="text-sm">Включить в нумерацию глав</span>
          </label>
        </div>
      </ModalShell>

      {/* Delete section confirm — extended modal with warning */}
      <ModalShell
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить секцию"
        maxWidth="max-w-md"
        actions={
          <>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-sm btn-error font-display tracking-wider"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest px-1.5 py-0.5 border bg-error/15 text-error border-error/50">
                ОПАСНО
              </span>
              <span className="text-sm text-base-content/70">Необратимое действие</span>
            </div>

            <p className="text-sm">
              Секция{" "}
              <span className="font-mono text-primary">«{deleteTarget.label}»</span>{" "}
              будет удалена навсегда.
            </p>

            <div className="border border-warning/40 bg-warning/8 px-3 py-2 flex flex-col gap-1">
              <div className="label-section text-warning/80">Будет удалено</div>
              <ul className="text-xs text-base-content/70 font-mono space-y-0.5">
                <li>— содержимое шаблона ({deleteTarget.content.length} симв.)</li>
                <li>— вся история версий</li>
                <li>— порядок секций будет пересчитан</li>
              </ul>
            </div>

            <p className="text-xs text-base-content/50 font-mono">
              // восстановление невозможно
            </p>
          </div>
        )}
      </ModalShell>

      {/* Versions modal */}
      <ModalShell
        open={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        title={`История: ${activeTemplate?.label ?? ""}`}
        maxWidth="max-w-2xl"
        actions={
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowVersionsModal(false)}
          >
            Закрыть
          </button>
        }
      >
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {!versions ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : versions.length === 0 ? (
            <EmptyState message="история пуста" />
          ) : (
            versions.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center gap-3 px-3 py-2 border border-base-300 bg-base-100/40 hover:bg-primary/5 transition-colors"
              >
                <span className="font-mono text-[10px] tracking-widest text-base-content/30 w-8">
                  #{versions.length - i}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-base-content/70">
                    {formatVersionDate(v.created_at)}
                  </div>
                  <div className="text-[11px] text-base-content/40 truncate font-mono">
                    {v.content.slice(0, 70).replace(/\s+/g, " ")}
                    {v.content.length > 70 ? "…" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="font-mono text-[11px] tracking-wider text-primary/60 hover:text-primary transition-colors"
                  onClick={() => setRestoreTarget(v)}
                >
                  восстановить
                </button>
              </div>
            ))
          )}
        </div>
      </ModalShell>

      {/* Restore confirm */}
      <ConfirmModal
        open={!!restoreTarget}
        title="Восстановить версию"
        message={
          restoreTarget
            ? `Восстановить версию от ${formatVersionDate(restoreTarget.created_at)}? Текущее содержимое будет заменено.`
            : ""
        }
        onConfirm={() => {
          if (restoreTarget && activeTemplate) {
            restoreMutation.mutate({
              templateId: activeTemplate.id,
              versionId: restoreTarget.id,
            });
          }
        }}
        onCancel={() => setRestoreTarget(null)}
      />
    </div>
  );
}
