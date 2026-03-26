import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getAiSettings, updateAiSettings, checkAiHealth, refreshAiToken } from "../api/aiApi";
import type { AISettingsUpdate } from "../api/aiApi";
import PageHeader from "../components/common/PageHeader";

export default function AISettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["ai-settings"], queryFn: getAiSettings });

  const [form, setForm] = useState<AISettingsUpdate>({});
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        llm_provider: data.llm_provider,
        llm_model: data.llm_model,
        llm_base_url: data.llm_base_url,
        llm_temperature: data.llm_temperature,
        llm_max_tokens: data.llm_max_tokens,
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (upd: AISettingsUpdate) => updateAiSettings(upd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-settings"] }); toast.success("Настройки сохранены"); },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await checkAiHealth();
      if (res.status === "ok") {
        toast.success(`Соединение установлено — ${res.provider}/${res.model}`);
      } else {
        toast.error(`Ошибка: ${res.detail}`);
      }
    } catch {
      toast.error("AI-сервис недоступен");
    } finally {
      setChecking(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const res = await refreshAiToken();
      if (res.status === "ok") {
        toast.success("Токен обновлён");
      } else {
        toast.error(`Ошибка: ${res.detail}`);
      }
    } catch {
      toast.error("AI-сервис недоступен");
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) return <div className="text-sm text-base-content/40">Загрузка...</div>;
  if (isError || !data) return <div className="text-sm text-error">AI-сервис недоступен</div>;

  const set = (field: keyof AISettingsUpdate, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="max-w-4xl">
      <PageHeader title="Настройки AI" className="mb-6" />

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
          <label className="label py-1"><span className="label-text">Base URL</span></label>
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
            onChange={(e) => set("llm_max_tokens", parseInt(e.target.value))}
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
