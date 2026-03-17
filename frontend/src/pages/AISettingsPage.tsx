import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getAiSettings, updateAiSettings } from "../api/aiApi";
import type { AISettingsUpdate } from "../api/aiApi";

export default function AISettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["ai-settings"], queryFn: getAiSettings });

  const [form, setForm] = useState<AISettingsUpdate>({});
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        llm_provider: data.llm_provider,
        llm_model: data.llm_model,
        llm_base_url: data.llm_base_url,
        llm_api_key: data.llm_api_key,
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

  if (isLoading) return <div className="text-sm text-base-content/40">Загрузка...</div>;
  if (isError || !data) return <div className="text-sm text-error">AI-сервис недоступен</div>;

  const set = (field: keyof AISettingsUpdate, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-semibold tracking-wide mb-6">Настройки AI</h1>

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

        <div className="form-control col-span-3">
          <label className="label py-1"><span className="label-text">API Key</span></label>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              className="input input-bordered w-full font-mono text-sm"
              value={form.llm_api_key ?? ""}
              onChange={(e) => set("llm_api_key", e.target.value)}
            />
            <button
              className="btn btn-ghost btn-square"
              onClick={() => setShowKey((v) => !v)}
              title={showKey ? "Скрыть" : "Показать"}
            >
              {showKey ? "◇" : "◈"}
            </button>
          </div>
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

      <div className="pt-4">
        <button
          className="btn btn-primary font-display tracking-wider"
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
        >
          {saveMut.isPending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
