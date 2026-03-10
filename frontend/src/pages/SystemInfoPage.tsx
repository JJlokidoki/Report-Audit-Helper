import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getSystemInfo,
  updateSystemInfo,
  getExecutors,
  createExecutor,
  setExecutors,
  getSoftwareList,
  createSoftware,
  setSoftware,
} from "../api/reportApi";
import type { SystemInfo, Executor, Software } from "../types";

const QUAL_OPTIONS = [
  ["Базовый", "Базовый"],
  ["Средний", "Средний"],
  ["Высокий", "Высокий"],
] as const;
const ACCESS_OPTIONS = [
  ["Внешний", "Внешний"],
  ["Внутренний", "Внутренний"],
] as const;
const KNOWLEDGE_OPTIONS = [
  ["Чёрный ящик", "Чёрный ящик"],
  ["Серый ящик", "Серый ящик"],
  ["Белый ящик", "Белый ящик"],
] as const;

type FormState = Pick<
  SystemInfo,
  | "asName"
  | "keId"
  | "url"
  | "dateStart"
  | "dateEnd"
  | "segment"
  | "goal"
  | "testConditions"
  | "qualificationLevel"
  | "accessLevel"
  | "knowledgeLevel"
>;

const toDateStr = (v: string | null): string => (v ? v.slice(0, 10) : "");

export default function SystemInfoPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = id ? parseInt(id, 10) : NaN;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    asName: null,
    keId: null,
    url: null,
    dateStart: null,
    dateEnd: null,
    segment: null,
    goal: null,
    testConditions: null,
    qualificationLevel: null,
    accessLevel: null,
    knowledgeLevel: null,
  });
  const [executors, setExecutorsLocal] = useState<Executor[]>([]);
  const [software, setSoftwareLocal] = useState<Software[]>([]);
  const [addExecutorMode, setAddExecutorMode] = useState(false);
  const [newExecutor, setNewExecutor] = useState({ name: "", position: "" });
  const [newSoftware, setNewSoftware] = useState({ name: "", version: "" });
  const [selectedExecutorId, setSelectedExecutorId] = useState<string>("");
  const [selectedSoftwareId, setSelectedSoftwareId] = useState<string>("");

  const { data: systemInfo, isLoading } = useQuery({
    queryKey: ["system-info", reportId],
    queryFn: () => getSystemInfo(reportId),
    enabled: !isNaN(reportId),
  });
  const { data: allExecutors = [] } = useQuery({
    queryKey: ["executors"],
    queryFn: getExecutors,
  });
  const { data: allSoftware = [] } = useQuery({
    queryKey: ["software"],
    queryFn: getSoftwareList,
  });

  useEffect(() => {
    if (!systemInfo) return;
    setForm({
      asName: systemInfo.asName,
      keId: systemInfo.keId,
      url: systemInfo.url,
      dateStart: systemInfo.dateStart,
      dateEnd: systemInfo.dateEnd,
      segment: systemInfo.segment,
      goal: systemInfo.goal,
      testConditions: systemInfo.testConditions,
      qualificationLevel: systemInfo.qualificationLevel,
      accessLevel: systemInfo.accessLevel,
      knowledgeLevel: systemInfo.knowledgeLevel,
    });
    setExecutorsLocal(systemInfo.executors ?? []);
    setSoftwareLocal(systemInfo.software ?? []);
  }, [systemInfo]);

  const updateForm = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateSystemInfo(reportId, form);
      await setExecutors(reportId, executors.map((e) => e.id));
      await setSoftware(reportId, software.map((s) => s.id));
    },
    onSuccess: () => {
      toast.success("Сохранено");
      queryClient.invalidateQueries({ queryKey: ["system-info", reportId] });
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const createExecutorMutation = useMutation({
    mutationFn: createExecutor,
    onSuccess: (created) => {
      setExecutorsLocal((prev) => [...prev, created]);
      setNewExecutor({ name: "", position: "" });
      setAddExecutorMode(false);
    },
    onError: () => toast.error("Ошибка создания исполнителя"),
  });

  const createSoftwareMutation = useMutation({
    mutationFn: createSoftware,
    onSuccess: (created) => {
      setSoftwareLocal((prev) => [...prev, created]);
      setNewSoftware({ name: "", version: "" });
    },
    onError: () => toast.error("Ошибка добавления ПО"),
  });

  const availableExecutors = allExecutors.filter((e) => !executors.some((a) => a.id === e.id));
  const availableSoftware = allSoftware.filter((s) => !software.some((a) => a.id === s.id));

  const handleAddExecutor = () => {
    const eid = parseInt(selectedExecutorId, 10);
    if (!isNaN(eid)) {
      const ex = allExecutors.find((e) => e.id === eid);
      if (ex) setExecutorsLocal((prev) => [...prev, ex]);
      setSelectedExecutorId("");
    }
  };

  const handleAddSoftware = () => {
    const sid = parseInt(selectedSoftwareId, 10);
    if (!isNaN(sid)) {
      const sw = allSoftware.find((s) => s.id === sid);
      if (sw) setSoftwareLocal((prev) => [...prev, sw]);
      setSelectedSoftwareId("");
    }
  };

  const handleAddNewExecutor = () => {
    if (!newExecutor.name.trim()) {
      toast.error("Введите имя");
      return;
    }
    createExecutorMutation.mutate({
      name: newExecutor.name.trim(),
      position: newExecutor.position.trim() || undefined,
    });
  };

  const handleAddNewSoftware = () => {
    if (!newSoftware.name.trim()) {
      toast.error("Введите название");
      return;
    }
    createSoftwareMutation.mutate({
      name: newSoftware.name.trim(),
      version: newSoftware.version.trim() || undefined,
    });
  };

  if (isNaN(reportId) || isLoading) {
    return (
      <div className="p-4">
        {isLoading ? <span className="loading loading-spinner loading-md" /> : "Отчёт не найден"}
      </div>
    );
  }

  return (
    <form
      className="p-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title font-medium">Описание</div>
        <div className="collapse-content">
          <p className="text-base-content/70">Будет добавлен WYSIWYG редактор</p>
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title font-medium">Данные об объекте</div>
        <div className="collapse-content space-y-2">
          <div className="form-control">
            <label className="label"><span className="label-text">Название АС</span></label>
            <input className="input input-bordered" value={form.asName ?? ""} onChange={(e) => updateForm("asName", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">КЕ идентификатор</span></label>
            <input className="input input-bordered" value={form.keId ?? ""} onChange={(e) => updateForm("keId", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">URL тестового стенда</span></label>
            <input className="input input-bordered" value={form.url ?? ""} onChange={(e) => updateForm("url", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Дата начала</span></label>
            <input type="date" className="input input-bordered" value={toDateStr(form.dateStart)} onChange={(e) => updateForm("dateStart", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Дата окончания</span></label>
            <input type="date" className="input input-bordered" value={toDateStr(form.dateEnd)} onChange={(e) => updateForm("dateEnd", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Сегмент сети</span></label>
            <input className="input input-bordered" value={form.segment ?? ""} onChange={(e) => updateForm("segment", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Цель тестирования</span></label>
            <textarea className="textarea textarea-bordered" rows={2} value={form.goal ?? ""} onChange={(e) => updateForm("goal", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Условия тестирования</span></label>
            <textarea className="textarea textarea-bordered" rows={2} value={form.testConditions ?? ""} onChange={(e) => updateForm("testConditions", e.target.value || null)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Исполнители</span></label>
            <ul className="list-disc list-inside mb-2">
              {executors.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  {e.name} {e.position && `(${e.position})`}
                  <button type="button" className="btn btn-ghost btn-error btn-xs" onClick={() => setExecutorsLocal((prev) => prev.filter((x) => x.id !== e.id))}>×</button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <select className="select select-bordered select-sm w-48" value={selectedExecutorId} onChange={(e) => setSelectedExecutorId(e.target.value)}>
                <option value="">Выбрать...</option>
                {availableExecutors.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddExecutor}>Добавить</button>
              {!addExecutorMode ? (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAddExecutorMode(true)}>Добавить нового</button>
              ) : (
                <div className="flex gap-2 items-end">
                  <input className="input input-bordered input-sm w-32" placeholder="Имя" value={newExecutor.name} onChange={(e) => setNewExecutor((p) => ({ ...p, name: e.target.value }))} />
                  <input className="input input-bordered input-sm w-32" placeholder="Должность" value={newExecutor.position} onChange={(e) => setNewExecutor((p) => ({ ...p, position: e.target.value }))} />
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleAddNewExecutor} disabled={createExecutorMutation.isPending}>Сохранить</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAddExecutorMode(false)}>Отмена</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" />
        <div className="collapse-title font-medium">Модель нарушителя</div>
        <div className="collapse-content space-y-2">
          <div className="form-control">
            <label className="label"><span className="label-text">Уровень квалификации</span></label>
            <select className="select select-bordered" value={form.qualificationLevel ?? ""} onChange={(e) => updateForm("qualificationLevel", e.target.value || null)}>
              <option value="">—</option>
              {QUAL_OPTIONS.map(([v]) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Уровень доступа</span></label>
            <select className="select select-bordered" value={form.accessLevel ?? ""} onChange={(e) => updateForm("accessLevel", e.target.value || null)}>
              <option value="">—</option>
              {ACCESS_OPTIONS.map(([v]) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Уровень осведомлённости</span></label>
            <select className="select select-bordered" value={form.knowledgeLevel ?? ""} onChange={(e) => updateForm("knowledgeLevel", e.target.value || null)}>
              <option value="">—</option>
              {KNOWLEDGE_OPTIONS.map(([v]) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" />
        <div className="collapse-title font-medium">Используемое ПО</div>
        <div className="collapse-content">
          <table className="table table-sm">
            <thead>
              <tr><th>Название</th><th>Версия</th><th></th></tr>
            </thead>
            <tbody>
              {software.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.version ?? "—"}</td>
                  <td><button type="button" className="btn btn-ghost btn-error btn-xs" onClick={() => setSoftwareLocal((prev) => prev.filter((x) => x.id !== s.id))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2 mt-2">
            <select className="select select-bordered select-sm w-48" value={selectedSoftwareId} onChange={(e) => setSelectedSoftwareId(e.target.value)}>
              <option value="">Выбрать...</option>
              {availableSoftware.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.version ? `(${s.version})` : ""}</option>
              ))}
            </select>
            <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddSoftware}>Добавить</button>
            <div className="flex gap-2">
              <input className="input input-bordered input-sm w-28" placeholder="Название" value={newSoftware.name} onChange={(e) => setNewSoftware((p) => ({ ...p, name: e.target.value }))} />
              <input className="input input-bordered input-sm w-24" placeholder="Версия" value={newSoftware.version} onChange={(e) => setNewSoftware((p) => ({ ...p, version: e.target.value }))} />
              <button type="button" className="btn btn-sm btn-primary" onClick={handleAddNewSoftware} disabled={createSoftwareMutation.isPending}>Добавить</button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
