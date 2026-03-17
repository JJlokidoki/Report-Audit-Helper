import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getExecutors, createExecutor, updateExecutor, deleteExecutor,
  getSoftwareList, createSoftware, updateSoftware, deleteSoftware,
} from "../api/reportApi";
import { getAiSettings, updateAiSettings } from "../api/aiApi";
import type { Executor, Software } from "../types";
import type { AISettingsUpdate } from "../api/aiApi";

function useConfirm() {
  const [pending, setPending] = useState<(() => void) | null>(null);
  const ask = (fn: () => void) => setPending(() => fn);
  const confirm = () => { pending?.(); setPending(null); };
  const cancel = () => setPending(null);
  return { pending, ask, confirm, cancel };
}

// ─── Executors ──────────────────────────────────────────────────────────────

function ExecutorRow({ ex, onSaved, onDelete }: { ex: Executor; onSaved: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ex.name);
  const qc = useQueryClient();

  const upd = useMutation({
    mutationFn: () => updateExecutor(ex.id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["executors"] }); setEditing(false); onSaved(); },
    onError: () => toast.error("Ошибка сохранения"),
  });

  if (editing) {
    return (
      <tr>
        <td>
          <input
            className="input input-bordered input-sm w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && upd.mutate()}
            autoFocus
          />
        </td>
        <td className="text-right">
          <button className="btn btn-xs btn-primary mr-1" onClick={() => upd.mutate()} disabled={upd.isPending}>Сохранить</button>
          <button className="btn btn-xs btn-ghost" onClick={() => { setEditing(false); setName(ex.name); }}>Отмена</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{ex.name}</td>
      <td className="text-right">
        <button className="btn btn-xs btn-ghost mr-1" onClick={() => setEditing(true)}>Изменить</button>
        <button className="btn btn-xs btn-ghost text-error/70 hover:text-error" onClick={onDelete}>Удалить</button>
      </td>
    </tr>
  );
}

function ExecutorsSection() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");

  const { data: executors = [] } = useQuery({ queryKey: ["executors"], queryFn: getExecutors });

  const addMut = useMutation({
    mutationFn: () => createExecutor({ name: newName.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["executors"] }); setNewName(""); },
    onError: () => toast.error("Ошибка"),
  });
  const delMut = useMutation({
    mutationFn: deleteExecutor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["executors"] }),
    onError: () => toast.error("Ошибка удаления"),
  });

  const handleAdd = () => {
    if (!newName.trim()) return toast.error("Введите имя");
    addMut.mutate();
  };

  return (
    <div>
      <h2 className="font-semibold text-base mb-3">Исполнители</h2>
      <table className="table table-sm w-full mb-3">
        <thead><tr><th>Имя</th><th /></tr></thead>
        <tbody>
          {executors.map((ex) => (
            <ExecutorRow
              key={ex.id}
              ex={ex}
              onSaved={() => toast.success("Сохранено")}
              onDelete={() => confirm.ask(() => delMut.mutate(ex.id))}
            />
          ))}
          {executors.length === 0 && (
            <tr><td colSpan={2} className="text-center text-base-content/40 text-sm">Нет исполнителей</td></tr>
          )}
        </tbody>
      </table>
      <div className="flex gap-2">
        <input
          className="input input-bordered input-sm flex-1 max-w-xs"
          placeholder="Имя нового исполнителя"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={addMut.isPending}>
          Добавить
        </button>
      </div>

      {confirm.pending && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <p className="text-sm">Удалить исполнителя?</p>
            <div className="modal-action mt-3">
              <button className="btn btn-sm" onClick={confirm.cancel}>Отмена</button>
              <button className="btn btn-sm btn-error" onClick={confirm.confirm}>Удалить</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={confirm.cancel} />
        </dialog>
      )}
    </div>
  );
}

// ─── Software ────────────────────────────────────────────────────────────────

function SoftwareRow({ sw, onSaved, onDelete }: { sw: Software; onSaved: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: sw.name, description: sw.description ?? "" });
  const qc = useQueryClient();

  const upd = useMutation({
    mutationFn: () => updateSoftware(sw.id, {
      name: form.name,
      description: form.description || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["software"] }); setEditing(false); onSaved(); },
    onError: () => toast.error("Ошибка сохранения"),
  });

  if (editing) {
    return (
      <tr>
        <td><input className="input input-bordered input-sm w-full" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus /></td>
        <td><input className="input input-bordered input-sm w-full" value={form.description} placeholder="—" onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></td>
        <td className="text-right whitespace-nowrap">
          <button className="btn btn-xs btn-primary mr-1" onClick={() => upd.mutate()} disabled={upd.isPending}>Сохранить</button>
          <button className="btn btn-xs btn-ghost" onClick={() => setEditing(false)}>Отмена</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        {sw.name}
        {sw.is_preset && <span className="ml-2 badge badge-xs badge-ghost font-mono">preset</span>}
      </td>
      <td className="text-base-content/60 text-sm">{sw.description ?? "—"}</td>
      <td className="text-right whitespace-nowrap">
        <button className="btn btn-xs btn-ghost mr-1" onClick={() => setEditing(true)}>Изменить</button>
        <button className="btn btn-xs btn-ghost text-error/70 hover:text-error" onClick={onDelete}>Удалить</button>
      </td>
    </tr>
  );
}

function SoftwareSection() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: swList = [] } = useQuery({ queryKey: ["software"], queryFn: getSoftwareList });

  const addMut = useMutation({
    mutationFn: () => createSoftware({ name: form.name.trim(), description: form.description || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["software"] }); setForm({ name: "", description: "" }); },
    onError: () => toast.error("Ошибка"),
  });
  const delMut = useMutation({
    mutationFn: deleteSoftware,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["software"] }),
    onError: () => toast.error("Ошибка удаления"),
  });

  const handleAdd = () => {
    if (!form.name.trim()) return toast.error("Введите название");
    addMut.mutate();
  };

  return (
    <div>
      <h2 className="font-semibold text-base mb-3">Используемое ПО</h2>
      <div className="overflow-x-auto">
        <table className="table table-sm w-full mb-3">
          <thead><tr><th>Название</th><th>Описание</th><th /></tr></thead>
          <tbody>
            {swList.map((sw) => (
              <SoftwareRow
                key={sw.id}
                sw={sw}
                onSaved={() => toast.success("Сохранено")}
                onDelete={() => confirm.ask(() => delMut.mutate(sw.id))}
              />
            ))}
            {swList.length === 0 && (
              <tr><td colSpan={4} className="text-center text-base-content/40 text-sm">Нет записей</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 flex-wrap">
        <input className="input input-bordered input-sm w-48" placeholder="Название" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <input className="input input-bordered input-sm w-64" placeholder="Описание" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={addMut.isPending}>Добавить</button>
      </div>

      {confirm.pending && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <p className="text-sm">Удалить инструмент?</p>
            <div className="modal-action mt-3">
              <button className="btn btn-sm" onClick={confirm.cancel}>Отмена</button>
              <button className="btn btn-sm btn-error" onClick={confirm.confirm}>Удалить</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={confirm.cancel} />
        </dialog>
      )}
    </div>
  );
}

// ─── AI Settings ─────────────────────────────────────────────────────────────

function AISettingsSection() {
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
    <div>
      <h2 className="font-semibold text-base mb-3">AI-сервис</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
        <label className="form-control">
          <div className="label"><span className="label-text text-xs">Провайдер</span></div>
          <select
            className="select select-bordered select-sm"
            value={form.llm_provider ?? ""}
            onChange={(e) => set("llm_provider", e.target.value)}
          >
            {data.providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text text-xs">Модель</span></div>
          <input
            className="input input-bordered input-sm"
            value={form.llm_model ?? ""}
            onChange={(e) => set("llm_model", e.target.value)}
          />
        </label>

        <label className="form-control md:col-span-2">
          <div className="label"><span className="label-text text-xs">Base URL</span></div>
          <input
            className="input input-bordered input-sm"
            value={form.llm_base_url ?? ""}
            onChange={(e) => set("llm_base_url", e.target.value)}
          />
        </label>

        <label className="form-control md:col-span-2">
          <div className="label"><span className="label-text text-xs">API Key</span></div>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              className="input input-bordered input-sm flex-1"
              value={form.llm_api_key ?? ""}
              onChange={(e) => set("llm_api_key", e.target.value)}
            />
            <button
              className="btn btn-sm btn-ghost btn-square"
              onClick={() => setShowKey((v) => !v)}
              title={showKey ? "Скрыть" : "Показать"}
            >
              {showKey ? "🙈" : "👁"}
            </button>
          </div>
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text text-xs">Temperature</span></div>
          <input
            type="number"
            step="0.05"
            min="0"
            max="2"
            className="input input-bordered input-sm"
            value={form.llm_temperature ?? 0.1}
            onChange={(e) => set("llm_temperature", parseFloat(e.target.value))}
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text text-xs">Max Tokens</span></div>
          <input
            type="number"
            step="256"
            min="256"
            className="input input-bordered input-sm"
            value={form.llm_max_tokens ?? 2048}
            onChange={(e) => set("llm_max_tokens", parseInt(e.target.value))}
          />
        </label>
      </div>

      <button
        className="btn btn-sm btn-primary mt-4"
        onClick={() => saveMut.mutate(form)}
        disabled={saveMut.isPending}
      >
        Сохранить
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold tracking-wide">Настройки</h1>
      <AISettingsSection />
      <div className="divider" />
      <ExecutorsSection />
      <div className="divider" />
      <SoftwareSection />
    </div>
  );
}
