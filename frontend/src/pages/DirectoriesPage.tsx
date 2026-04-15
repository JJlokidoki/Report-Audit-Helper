import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getExecutors, createExecutor, updateExecutor, deleteExecutor,
  getSoftwareList, createSoftware, updateSoftware, deleteSoftware,
  getVulnerabilityTemplates, createVulnerabilityTemplate, updateVulnerabilityTemplate, deleteVulnerabilityTemplate,
} from "../api/reportApi";
import type { Executor, Software, SoftwareLabel, VulnerabilityTemplate, VulnTemplateLabel, Severity, AutomationLevel } from "../types";
import { SOFTWARE_LABEL_STYLES, SOFTWARE_LABEL_LIST, VULN_TEMPLATE_LABEL_STYLES, VULN_TEMPLATE_LABEL_LIST } from "../utils/labelConfig";
import SeverityBadge from "../components/common/SeverityBadge";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";
import Tag from "../components/common/Tag";
import ModalShell from "../components/common/ModalShell";
import RichEditor from "../components/common/RichEditor";
import CVSSCalculatorModal from "../components/common/CVSSCalculatorModal";
import { useTheme } from "../hooks/useTheme";

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
  const [email, setEmail] = useState(ex.email ?? "");
  const qc = useQueryClient();

  const upd = useMutation({
    mutationFn: () => updateExecutor(ex.id, { name, email: email.trim() || null }),
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
            autoFocus
          />
        </td>
        <td>
          <input
            className="input input-bordered input-sm w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            onKeyDown={(e) => e.key === "Enter" && upd.mutate()}
          />
        </td>
        <td className="text-right">
          <button className="btn btn-xs btn-primary mr-1" onClick={() => upd.mutate()} disabled={upd.isPending}>Сохранить</button>
          <button className="btn btn-xs btn-ghost" onClick={() => { setEditing(false); setName(ex.name); setEmail(ex.email ?? ""); }}>Отмена</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{ex.name}</td>
      <td className="text-muted">{ex.email ?? ""}</td>
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
  const [newEmail, setNewEmail] = useState("");

  const { data: executors = [] } = useQuery({ queryKey: ["executors"], queryFn: getExecutors });

  const addMut = useMutation({
    mutationFn: () => createExecutor({ name: newName.trim(), email: newEmail.trim() || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["executors"] }); setNewName(""); setNewEmail(""); },
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
        <thead><tr><th>Имя</th><th>Email</th><th /></tr></thead>
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
            <tr><td colSpan={3}><EmptyState message="нет исполнителей" className="py-4" /></td></tr>
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
        <input
          className="input input-bordered input-sm flex-1 max-w-xs"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
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

// ─── Vulnerability Templates ─────────────────────────────────────────────────

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "critical", label: "Критический" },
  { value: "high", label: "Высокий" },
  { value: "medium", label: "Средний" },
  { value: "low", label: "Низкий" },
  { value: "info", label: "Информационный" },
];

function VulnTemplateLabelToggles({ selected, onChange }: { selected: VulnTemplateLabel[]; onChange: (labels: VulnTemplateLabel[]) => void }) {
  const toggle = (val: VulnTemplateLabel) => {
    onChange(selected.includes(val) ? selected.filter((l) => l !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {VULN_TEMPLATE_LABEL_LIST.map((opt) => (
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

function VulnTemplateLabels({ labels }: { labels: VulnTemplateLabel[] }) {
  if (!labels.length) return null;
  return (
    <>
      {labels.map((l) => {
        const opt = VULN_TEMPLATE_LABEL_STYLES[l];
        if (!opt) return null;
        return (
          <Tag key={l} colorClass={opt.style} size="xs">{opt.text}</Tag>
        );
      })}
    </>
  );
}

function VulnTemplateRow({ tpl, onEdit, onDelete }: { tpl: VulnerabilityTemplate; onEdit: () => void; onDelete: () => void }) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tpl.bug_name}
          {tpl.is_preset && <Tag colorClass="bg-base-content/8 text-base-content/50 border-base-content/20" size="xs">preset</Tag>}
        </div>
      </td>
      <td><SeverityBadge severity={tpl.bug_criticality} /></td>
      <td className="font-mono text-sm text-base-content/50">{tpl.cvss_score ?? "—"}</td>
      <td>
        <div className="flex items-center gap-1 flex-wrap">
          <VulnTemplateLabels labels={tpl.labels ?? []} />
        </div>
      </td>
      <td className="text-right whitespace-nowrap">
        <button className="btn btn-xs btn-ghost mr-1" onClick={onEdit}>Изменить</button>
        <button className="btn btn-xs btn-ghost text-error/70 hover:text-error" onClick={onDelete}>Удалить</button>
      </td>
    </tr>
  );
}

const CREATE_FORM_INITIAL = {
  bug_name: "",
  bug_criticality: "medium" as Severity,
  cvss_score: null as number | null,
  cvss_vector: null as string | null,
  automation_level: "no" as AutomationLevel,
  bug_description: null as string | null,
  reproduction_steps: null as string | null,
  remediation: null as string | null,
  labels: [] as VulnTemplateLabel[],
};

function VulnerabilityTemplatesSection() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cvssOpen, setCvssOpen] = useState(false);
  const [form, setForm] = useState(CREATE_FORM_INITIAL);
  const { theme } = useTheme();
  const [filterLabel, setFilterLabel] = useState<VulnTemplateLabel | null>(null);

  const { data: templates = [] } = useQuery({ queryKey: ["vulnerability-templates"], queryFn: getVulnerabilityTemplates });

  const filtered = filterLabel ? templates.filter((t) => (t.labels ?? []).includes(filterLabel)) : templates;

  const updateField = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const openCreate = () => {
    setEditingId(null);
    setForm(CREATE_FORM_INITIAL);
    setModalOpen(true);
  };

  const openEdit = (tpl: VulnerabilityTemplate) => {
    setEditingId(tpl.id);
    setForm({
      bug_name: tpl.bug_name,
      bug_criticality: tpl.bug_criticality,
      cvss_score: tpl.cvss_score,
      cvss_vector: tpl.cvss_vector,
      automation_level: tpl.automation_level,
      bug_description: tpl.bug_description,
      reproduction_steps: tpl.reproduction_steps,
      remediation: tpl.remediation,
      labels: tpl.labels ?? [],
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); };

  const saveMut = useMutation({
    mutationFn: () => {
      const data = {
        bug_name: form.bug_name.trim(),
        bug_criticality: form.bug_criticality,
        cvss_score: form.cvss_score,
        cvss_vector: form.cvss_vector,
        automation_level: form.automation_level,
        bug_description: form.bug_description,
        reproduction_steps: form.reproduction_steps,
        remediation: form.remediation,
        labels: form.labels.length ? form.labels : undefined,
      };
      return editingId
        ? updateVulnerabilityTemplate(editingId, data)
        : createVulnerabilityTemplate(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vulnerability-templates"] });
      closeModal();
      toast.success(editingId ? "Сохранено" : "Создано");
    },
    onError: () => toast.error("Ошибка"),
  });
  const delMut = useMutation({
    mutationFn: deleteVulnerabilityTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vulnerability-templates"] }),
    onError: () => toast.error("Ошибка удаления"),
  });

  const handleSave = () => {
    if (!form.bug_name.trim()) return toast.error("Введите название");
    saveMut.mutate();
  };

  return (
    <div>
      <h2 className="font-semibold text-base mb-3">Типовые уязвимости</h2>

      {/* Filter row */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
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
        {VULN_TEMPLATE_LABEL_LIST.map((opt) => (
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
          <thead><tr><th>Название</th><th>Критичность</th><th>CVSS</th><th>Метки</th><th /></tr></thead>
          <tbody>
            {filtered.map((tpl) => (
              <VulnTemplateRow
                key={tpl.id}
                tpl={tpl}
                onEdit={() => openEdit(tpl)}
                onDelete={() => confirm.ask(() => delMut.mutate(tpl.id))}
              />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5}><EmptyState message={filterLabel ? "нет шаблонов с такой меткой" : "нет типовых уязвимостей"} className="py-4" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>+ Добавить</button>

      {/* Create / Edit modal */}
      <ModalShell
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Редактирование типовой уязвимости" : "Новая типовая уязвимость"}
        maxWidth="max-w-3xl"
        className="max-h-[85vh] overflow-y-auto"
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={closeModal}>Отмена</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Сохранение\u2026" : editingId ? "Сохранить" : "\u203A_ Создать"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <div className="form-control col-span-3">
            <label className="label py-1"><span className="label-text">Название</span></label>
            <input type="text" className="input input-bordered w-full" value={form.bug_name} onChange={(e) => updateField("bug_name", e.target.value)} />
          </div>

          <div className="form-control">
            <label className="label py-1"><span className="label-text">Критичность</span></label>
            <select className="select select-bordered w-full" value={form.bug_criticality} onChange={(e) => updateField("bug_criticality", e.target.value as Severity)}>
              {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="form-control">
            <label className="label py-1"><span className="label-text">CVSS Score</span></label>
            <input type="number" step={0.1} min={0} max={10} className="input input-bordered w-full font-mono" placeholder="0.0 \u2013 10.0" value={form.cvss_score ?? ""} onChange={(e) => updateField("cvss_score", e.target.value === "" ? null : parseFloat(e.target.value))} />
          </div>

          <div className="form-control">
            <label className="label py-1"><span className="label-text">Автоматизация</span></label>
            <select className="select select-bordered w-full" value={form.automation_level} onChange={(e) => updateField("automation_level", e.target.value as AutomationLevel)}>
              <option value="fully">Полная</option>
              <option value="partially">Частичная</option>
              <option value="no">Нет</option>
              <option value="impossible">Невозможна</option>
            </select>
          </div>

          <div className="form-control col-span-2">
            <label className="label py-1"><span className="label-text">CVSS Vector</span></label>
            <input type="text" className="input input-bordered w-full font-mono text-sm" placeholder="CVSS:4.0/AV:N/AC:L/..." value={form.cvss_vector ?? ""} onChange={(e) => updateField("cvss_vector", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label py-1 opacity-0 select-none"><span className="label-text">—</span></label>
            <button type="button" className="btn btn-outline btn-primary w-full font-display tracking-wider text-xs" onClick={() => setCvssOpen(true)}>
              ›_ CVSS 4.0
            </button>
          </div>

          <div className="form-control col-span-3">
            <label className="label py-1"><span className="label-text">Описание</span></label>
            <RichEditor
              value={form.bug_description}
              onChange={(v) => updateField("bug_description", v)}
              placeholder="Описание уязвимости"
            />
          </div>

          <div className="form-control col-span-3">
            <label className="label py-1"><span className="label-text">Шаги воспроизведения</span></label>
            <RichEditor
              value={form.reproduction_steps}
              onChange={(v) => updateField("reproduction_steps", v)}
              placeholder="Шаги для воспроизведения"
            />
          </div>

          <div className="form-control col-span-3">
            <label className="label py-1"><span className="label-text">Рекомендации</span></label>
            <RichEditor
              value={form.remediation}
              onChange={(v) => updateField("remediation", v)}
              placeholder="Рекомендации по устранению"
            />
          </div>

          <div className="form-control col-span-3">
            <label className="label py-1"><span className="label-text">Метки</span></label>
            <VulnTemplateLabelToggles selected={form.labels} onChange={(labels) => updateField("labels", labels)} />
          </div>
        </div>
      </ModalShell>

      <CVSSCalculatorModal
        open={cvssOpen}
        onClose={() => setCvssOpen(false)}
        initialVector={form.cvss_vector}
        theme={theme}
        onApply={({ vector, score, severity }) => {
          updateField("cvss_vector", vector);
          updateField("cvss_score", score);
          updateField("bug_criticality", severity);
          setCvssOpen(false);
        }}
      />

      {/* Delete confirmation */}
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
        <p className="text-sm">Удалить типовую уязвимость?</p>
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
      <div className="divider" />
      <VulnerabilityTemplatesSection />
    </div>
  );
}
