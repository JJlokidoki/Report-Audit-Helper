import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getExecutors, createExecutor, updateExecutor, deleteExecutor,
  getSoftwareList, createSoftware, updateSoftware, deleteSoftware,
} from "../api/reportApi";
import type { Executor, Software, SoftwareLabel } from "../types";
import { SOFTWARE_LABEL_STYLES, SOFTWARE_LABEL_LIST } from "../utils/labelConfig";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";
import Tag from "../components/common/Tag";
import ModalShell from "../components/common/ModalShell";

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
            <tr><td colSpan={2}><EmptyState message="нет исполнителей" className="py-4" /></td></tr>
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

      <ModalShell
        open={!!confirm.pending}
        onClose={confirm.cancel}
        title="Подтверждение"
        maxWidth="max-w-sm"
        actions={
          <>
            <button className="btn btn-sm" onClick={confirm.cancel}>Отмена</button>
            <button className="btn btn-sm btn-error" onClick={confirm.confirm}>Удалить</button>
          </>
        }
      >
        <p className="text-sm">Удалить исполнителя?</p>
      </ModalShell>
    </div>
  );
}

// ─── Software ────────────────────────────────────────────────────────────────


function LabelToggles({ selected, onChange }: { selected: SoftwareLabel[]; onChange: (labels: SoftwareLabel[]) => void }) {
  const toggle = (val: SoftwareLabel) => {
    onChange(selected.includes(val) ? selected.filter((l) => l !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {SOFTWARE_LABEL_LIST.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`cursor-pointer transition-opacity ${
            selected.includes(opt.value) ? "" : "opacity-50"
          }`}
          onClick={() => toggle(opt.value)}
        >
          <Tag
            colorClass={selected.includes(opt.value) ? opt.style : "bg-base-content/5 text-base-content/30 border-base-content/15"}
            size="sm"
          >
            {opt.text}
          </Tag>
        </button>
      ))}
    </div>
  );
}

function SoftwareLabels({ labels }: { labels: SoftwareLabel[] }) {
  if (!labels.length) return null;
  return (
    <>
      {labels.map((l) => {
        const opt = SOFTWARE_LABEL_STYLES[l];
        if (!opt) return null;
        return (
          <Tag key={l} colorClass={opt.style} size="xs">{opt.text}</Tag>
        );
      })}
    </>
  );
}

function SoftwareRow({ sw, onSaved, onDelete }: { sw: Software; onSaved: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: sw.name, description: sw.description ?? "" });
  const [editLabels, setEditLabels] = useState<SoftwareLabel[]>(sw.labels ?? []);
  const qc = useQueryClient();

  const upd = useMutation({
    mutationFn: () => updateSoftware(sw.id, {
      name: form.name,
      description: form.description || undefined,
      labels: editLabels,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["software"] }); setEditing(false); onSaved(); },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const startEdit = () => {
    setForm({ name: sw.name, description: sw.description ?? "" });
    setEditLabels(sw.labels ?? []);
    setEditing(true);
  };

  if (editing) {
    return (
      <tr>
        <td><input className="input input-bordered input-sm w-full" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus /></td>
        <td><input className="input input-bordered input-sm w-full" value={form.description} placeholder="—" onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></td>
        <td><LabelToggles selected={editLabels} onChange={setEditLabels} /></td>
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {sw.name}
          {sw.is_preset && <Tag colorClass="bg-base-content/8 text-base-content/50 border-base-content/20" size="xs">preset</Tag>}
          <SoftwareLabels labels={sw.labels ?? []} />
        </div>
      </td>
      <td className="text-base-content/60 text-sm">{sw.description ?? "—"}</td>
      <td />
      <td className="text-right whitespace-nowrap">
        <button className="btn btn-xs btn-ghost mr-1" onClick={startEdit}>Изменить</button>
        <button className="btn btn-xs btn-ghost text-error/70 hover:text-error" onClick={onDelete}>Удалить</button>
      </td>
    </tr>
  );
}

function SoftwareSection() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", description: "" });
  const [newLabels, setNewLabels] = useState<SoftwareLabel[]>([]);
  const [filterLabel, setFilterLabel] = useState<SoftwareLabel | null>(null);

  const { data: swList = [] } = useQuery({ queryKey: ["software"], queryFn: getSoftwareList });

  const filtered = filterLabel ? swList.filter((sw) => (sw.labels ?? []).includes(filterLabel)) : swList;

  const addMut = useMutation({
    mutationFn: () => createSoftware({
      name: form.name.trim(),
      description: form.description || undefined,
      labels: newLabels.length ? newLabels : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["software"] }); setForm({ name: "", description: "" }); setNewLabels([]); },
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

      {/* Filter row */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="label-section mr-1">Фильтр</span>
        <button
          className={`cursor-pointer transition-opacity ${
            filterLabel === null ? "" : "opacity-50"
          }`}
          onClick={() => setFilterLabel(null)}
        >
          <Tag
            colorClass={filterLabel === null ? "bg-primary/15 text-primary border-primary/50" : "bg-base-content/5 text-base-content/30 border-base-content/15"}
            size="sm"
          >
            Все
          </Tag>
        </button>
        {SOFTWARE_LABEL_LIST.map((opt) => (
          <button
            key={opt.value}
            className={`cursor-pointer transition-opacity ${
              filterLabel === opt.value ? "" : "opacity-50"
            }`}
            onClick={() => setFilterLabel(filterLabel === opt.value ? null : opt.value)}
          >
            <Tag
              colorClass={filterLabel === opt.value ? opt.style : "bg-base-content/5 text-base-content/30 border-base-content/15"}
              size="sm"
            >
              {opt.text}
            </Tag>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm w-full mb-3">
          <thead><tr><th>Название</th><th>Описание</th><th>Метки</th><th /></tr></thead>
          <tbody>
            {filtered.map((sw) => (
              <SoftwareRow
                key={sw.id}
                sw={sw}
                onSaved={() => toast.success("Сохранено")}
                onDelete={() => confirm.ask(() => delMut.mutate(sw.id))}
              />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4}><EmptyState message={filterLabel ? "нет ПО с такой меткой" : "нет записей"} className="py-4" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      <div className="flex gap-2 flex-wrap items-end">
        <input className="input input-bordered input-sm w-48" placeholder="Название" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <input className="input input-bordered input-sm w-64" placeholder="Описание" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <LabelToggles selected={newLabels} onChange={setNewLabels} />
        <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={addMut.isPending}>Добавить</button>
      </div>

      <ModalShell
        open={!!confirm.pending}
        onClose={confirm.cancel}
        title="Подтверждение"
        maxWidth="max-w-sm"
        actions={
          <>
            <button className="btn btn-sm" onClick={confirm.cancel}>Отмена</button>
            <button className="btn btn-sm btn-error" onClick={confirm.confirm}>Удалить</button>
          </>
        }
      >
        <p className="text-sm">Удалить инструмент?</p>
      </ModalShell>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DirectoriesPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Справочники" />
      <ExecutorsSection />
      <div className="divider" />
      <SoftwareSection />
    </div>
  );
}
