import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getTemplates, downloadTemplate, uploadTemplate, type TemplateFile } from "../api/templateApi";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

const TYPE_LABELS: Record<string, string> = {
  web: "WEB",
  ios: "iOS",
  android: "Android",
  ai: "AI",
  iot: "IoT",
};
const TYPES = Object.keys(TYPE_LABELS);

export default function TemplatesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["templates"], queryFn: getTemplates });
  const [activeTab, setActiveTab] = useState("web");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<{ type: string; name: string } | null>(null);

  const handleDownload = async (type: string, name: string) => {
    try {
      await downloadTemplate(type, name);
    } catch {
      toast.error("Ошибка скачивания");
    }
  };

  const handleReplace = (type: string, name: string) => {
    replaceTarget.current = { type, name };
    fileRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = replaceTarget.current;
    if (!file || !target) return;
    e.target.value = "";
    setUploading(target.name);
    try {
      await uploadTemplate(target.type, target.name, file);
      toast.success(`Шаблон ${target.name} обновлён`);
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) return <div className="text-sm text-base-content/40">Загрузка...</div>;
  if (isError) return <div className="text-sm text-error">Export-сервис недоступен</div>;

  const files = data?.[activeTab] ?? [];

  return (
    <div className="max-w-4xl">
      <PageHeader title="Шаблоны отчётов" className="mb-6" />

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-4">
        {TYPES.map((t) => (
          <button
            key={t}
            role="tab"
            className={`tab font-display text-xs tracking-wider ${activeTab === t ? "tab-active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {TYPE_LABELS[t]}
            {data?.[t]?.length ? (
              <span className="ml-1.5 font-mono text-[10px] text-base-content/40">
                {data[t].filter((f: TemplateFile) => f.exists).length}/{data[t].length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <EmptyState message="шаблоны не найдены" />
      ) : (
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th className="label-section">Файл</th>
              <th className="label-section w-48 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.filename} className={f.exists ? "" : "opacity-40"}>
                <td className="font-mono text-sm">
                  {f.filename}
                  {!f.exists && (
                    <span className="ml-2 font-mono text-[10px] tracking-widest uppercase text-warning">
                      отсутствует
                    </span>
                  )}
                </td>
                <td className="text-right">
                  <div className="flex gap-1 justify-end">
                    <button
                      className="btn btn-ghost btn-xs font-display tracking-wider"
                      onClick={() => handleDownload(activeTab, f.filename)}
                      disabled={!f.exists}
                    >
                      Скачать
                    </button>
                    <button
                      className="btn btn-ghost btn-xs font-display tracking-wider"
                      onClick={() => handleReplace(activeTab, f.filename)}
                      disabled={uploading === f.filename}
                    >
                      {uploading === f.filename ? "Загрузка…" : "Заменить"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
