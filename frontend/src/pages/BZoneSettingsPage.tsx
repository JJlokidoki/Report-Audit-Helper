import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getBZoneSettings,
  updateBZoneSettings,
  checkBZoneHealth,
  getBZoneStats,
  refreshBZoneToken,
} from "../api/bzoneApi";
import type { BZoneSettingsUpdate } from "../api/bzoneApi";
import PageHeader from "../components/common/PageHeader";

export default function BZoneSettingsPage() {
  const qc = useQueryClient();

  // ── Settings query ──────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bzone-settings"],
    queryFn: getBZoneSettings,
  });

  const [form, setForm] = useState<BZoneSettingsUpdate>({});
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        bz_token: data.bz_token,
        bz_base_url: data.bz_base_url,
        bz_target_stages: data.bz_target_stages,
        llm_provider: data.llm_provider,
        llm_model: data.llm_model,
        llm_base_url: data.llm_base_url,
        llm_temperature: data.llm_temperature,
        llm_max_tokens: data.llm_max_tokens,
      });
    }
  }, [data]);

  const set = (field: keyof BZoneSettingsUpdate, value: string | number | number[]) =>
    setForm((p) => ({ ...p, [field]: value }));

  const saveMut = useMutation({
    mutationFn: (upd: BZoneSettingsUpdate) => updateBZoneSettings(upd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bzone-settings"] });
      qc.invalidateQueries({ queryKey: ["bzone-stats"] });
      toast.success("Настройки сохранены");
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await checkBZoneHealth();
      if (res.status === "ok") {
        toast.success(`Соединение установлено — ${res.provider}/${res.model}`);
      } else {
        toast.error(`Ошибка: ${res.detail}`);
      }
    } catch {
      toast.error("BZone-сервис недоступен");
    } finally {
      setChecking(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const res = await refreshBZoneToken();
      if (res.status === "ok") {
        toast.success("Токен обновлён");
      } else {
        toast.error(`Ошибка: ${res.detail}`);
      }
    } catch {
      toast.error("BZone-сервис недоступен");
    } finally {
      setRefreshing(false);
    }
  };

  // ── Stats query (non-blocking) ─────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["bzone-stats"],
    queryFn: getBZoneStats,
  });

  // ── Loading / Error gates ──────────────────────────────────────────────────
  if (isLoading) return <div className="text-sm text-base-content/40">Загрузка...</div>;
  if (isError || !data) return <div className="text-sm text-error">BZone-сервис недоступен</div>;

  const formatSyncTime = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stagesStr = (form.bz_target_stages ?? []).join(", ");

  return (
    <div className="max-w-4xl animate-page">
      <PageHeader title="Настройки BZone" className="mb-6" />

      {/* ── Section 1: Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Всего репортов</div>
          <div className="font-mono text-lg">{stats?.total_reports ?? "—"}</div>
        </div>
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">С CWE</div>
          <div className="font-mono text-lg">{stats?.with_cwe ?? "—"}</div>
        </div>
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Дубликатов</div>
          <div className="font-mono text-lg">{stats?.duplicates ?? "—"}</div>
        </div>
        <div className="border border-base-300 bg-base-200/30 px-3 py-2">
          <div className="label-section mb-1">Посл. синхронизация</div>
          <div className="font-mono text-lg truncate">{formatSyncTime(stats?.last_sync?.finished_at)}</div>
        </div>
      </div>

      <div className="divider" />

      {/* ── Section 2: BZone API ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">Токен</span></label>
          <input
            type="password"
            className="input input-bordered w-full font-mono text-sm"
            value={form.bz_token ?? ""}
            onChange={(e) => set("bz_token", e.target.value)}
            placeholder={data.has_token ? "••••••••" : "Введите токен BZ API"}
          />
        </div>

        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">Base URL</span></label>
          <input
            className="input input-bordered w-full font-mono text-sm"
            value={form.bz_base_url ?? ""}
            onChange={(e) => set("bz_base_url", e.target.value)}
          />
        </div>

        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">Компании</span></label>
          <div className="border border-base-300 bg-base-200/30 px-3 py-2 font-mono text-sm text-base-content/60 min-h-10">
            {data.bz_companies.length > 0 ? data.bz_companies.join(", ") : "—"}
          </div>
        </div>

        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">Фильтр стадий</span></label>
          <input
            className="input input-bordered w-full font-mono text-sm"
            value={stagesStr}
            onChange={(e) => {
              const ids = e.target.value
                .split(",")
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));
              set("bz_target_stages", ids);
            }}
            placeholder="Через запятую: 2, 3, 5"
          />
        </div>
      </div>

      <div className="divider" />

      {/* ── Section 3: LLM Settings ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
        <div className="form-control">
          <label className="label py-1"><span className="label-text">Провайдер</span></label>
          <select
            className="select select-bordered w-full"
            value={form.llm_provider ?? ""}
            onChange={(e) => set("llm_provider", e.target.value)}
          >
            {data.providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-control col-span-2">
          <label className="label py-1"><span className="label-text">Модель</span></label>
          <input
            className="input input-bordered w-full font-mono text-sm"
            value={form.llm_model ?? ""}
            onChange={(e) => set("llm_model", e.target.value)}
          />
        </div>

        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">Base URL (LLM)</span></label>
          <input
            className="input input-bordered w-full font-mono text-sm"
            value={form.llm_base_url ?? ""}
            onChange={(e) => set("llm_base_url", e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Temperature</span></label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="2"
            className="input input-bordered w-full"
            value={form.llm_temperature ?? 0.1}
            onChange={(e) => set("llm_temperature", parseFloat(e.target.value))}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text">Max Tokens</span></label>
          <input
            type="number"
            step="256"
            min="256"
            className="input input-bordered w-full"
            value={form.llm_max_tokens ?? 2048}
            onChange={(e) => set("llm_max_tokens", parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
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
          {checking ? "Проверка…" : "Проверить LLM"}
        </button>
        <button
          className="btn btn-outline font-display tracking-wider text-xs"
          onClick={handleRefreshToken}
          disabled={refreshing}
        >
          {refreshing ? "Обновление…" : "Обновить токен"}
        </button>
      </div>
    </div>
  );
}
