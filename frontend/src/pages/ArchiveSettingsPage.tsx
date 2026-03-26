import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getArchiveSettings,
  updateArchiveSettings,
  checkArchiveHealth,
  getArchiveStats,
} from "../api/archiveApi";
import type { ArchiveSettingsUpdate } from "../api/archiveApi";
import PageHeader from "../components/common/PageHeader";

export default function ArchiveSettingsPage() {
  const qc = useQueryClient();

  // ── Settings query ──────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["archive-settings"],
    queryFn: getArchiveSettings,
  });

  const [form, setForm] = useState<ArchiveSettingsUpdate>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        embedding_provider: data.embedding_provider,
        embedding_model: data.embedding_model,
        embedding_base_url: data.embedding_base_url,
        embedding_dimensions: data.embedding_dimensions,
        chunk_size: data.chunk_size,
        chunk_overlap: data.chunk_overlap,
        default_top_k: data.default_top_k,
      });
    }
  }, [data]);

  const set = (field: keyof ArchiveSettingsUpdate, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const saveMut = useMutation({
    mutationFn: (upd: ArchiveSettingsUpdate) => updateArchiveSettings(upd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archive-settings"] });
      qc.invalidateQueries({ queryKey: ["archive-stats"] });
      toast.success("Настройки сохранены");
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await checkArchiveHealth();
      if (res.status === "ok") {
        toast.success(`Соединение установлено — ${res.provider}/${res.model}`);
      } else {
        toast.error(`Ошибка: ${res.detail}`);
      }
    } catch {
      toast.error("Сервис архивов недоступен");
    } finally {
      setChecking(false);
    }
  };

  // ── Stats query (non-blocking) ─────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["archive-stats"],
    queryFn: getArchiveStats,
  });

  // ── Loading / Error gates ──────────────────────────────────────────────────
  if (isLoading) return <div className="text-sm text-base-content/40">Загрузка...</div>;
  if (isError || !data) return <div className="text-sm text-error">Сервис архивов недоступен</div>;

  return (
    <div className="max-w-4xl animate-page">
      <PageHeader title="Настройки архива" className="mb-6" />

      {/* ── Section 1: Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Документов</div>
          <div className="font-mono text-lg">{stats?.total_documents ?? "—"}</div>
        </div>
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Чанков</div>
          <div className="font-mono text-lg">{stats?.total_chunks ?? "—"}</div>
        </div>
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Провайдер</div>
          <div className="font-mono text-lg">{stats?.embedding_provider ?? "—"}</div>
        </div>
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Модель</div>
          <div className="font-mono text-lg truncate">{stats?.embedding_model ?? "—"}</div>
        </div>
      </div>

      <div className="divider" />

      {/* ── Section 2: Embedding settings ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
        <div className="form-control">
          <label className="label py-1"><span className="label-text">Провайдер</span></label>
          <select
            className="select select-bordered w-full"
            value={form.embedding_provider ?? ""}
            onChange={(e) => set("embedding_provider", e.target.value)}
          >
            {data.providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-control col-span-2">
          <label className="label py-1"><span className="label-text">Модель</span></label>
          <input
            className="input input-bordered w-full font-mono text-sm"
            value={form.embedding_model ?? ""}
            onChange={(e) => set("embedding_model", e.target.value)}
          />
        </div>

        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">Base URL</span></label>
          <input
            className="input input-bordered w-full font-mono text-sm"
            value={form.embedding_base_url ?? ""}
            onChange={(e) => set("embedding_base_url", e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Dimensions</span></label>
          <input
            type="number"
            min="1"
            className="input input-bordered w-full"
            value={form.embedding_dimensions ?? ""}
            onChange={(e) => set("embedding_dimensions", parseInt(e.target.value, 10))}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Chunk Size</span></label>
          <input
            type="number"
            min="64"
            step="64"
            className="input input-bordered w-full"
            value={form.chunk_size ?? ""}
            onChange={(e) => set("chunk_size", parseInt(e.target.value, 10))}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Chunk Overlap</span></label>
          <input
            type="number"
            min="0"
            className="input input-bordered w-full"
            value={form.chunk_overlap ?? ""}
            onChange={(e) => set("chunk_overlap", parseInt(e.target.value, 10))}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Default Top K</span></label>
          <input
            type="number"
            min="1"
            className="input input-bordered w-full"
            value={form.default_top_k ?? ""}
            onChange={(e) => set("default_top_k", parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          className="btn btn-primary font-display tracking-wider"
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
        >
          {saveMut.isPending ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          className="btn btn-outline font-display tracking-wider text-xs"
          onClick={handleCheck}
          disabled={checking}
        >
          {checking ? "Проверка…" : "Проверить соединение"}
        </button>
      </div>
    </div>
  );
}
