import { useState, useEffect } from "react";
import RichEditor from "../components/common/RichEditor";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getReport,
  getSystemInfo,
  updateSystemInfo,
  getExecutors,
  setExecutors,
  getSoftwareList,
  setSoftware,
} from "../api/reportApi";
import type { SystemInfo, Executor, Software, ReportType } from "../types";
import { SOFTWARE_LABEL_STYLES, REPORT_TYPE_RECOMMENDED_LABELS } from "../utils/labelConfig";
import Tag from "../components/common/Tag";

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
  | "description"
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
    description: null,
    goal: null,
    testConditions: null,
    qualificationLevel: null,
    accessLevel: null,
    knowledgeLevel: null,
  });
  const [executors, setExecutorsLocal] = useState<Executor[]>([]);
  const [software, setSoftwareLocal] = useState<Software[]>([]);
  const [selectedExecutorId, setSelectedExecutorId] = useState<string>("");
  const [selectedSoftwareId, setSelectedSoftwareId] = useState<string>("");

  const { data: report } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReport(reportId),
    enabled: !isNaN(reportId),
  });
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
      description: systemInfo.description,
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

  const availableExecutors = allExecutors.filter((e) => !executors.some((a) => a.id === e.id));
  const availableSoftware = allSoftware.filter((s) => !software.some((a) => a.id === s.id)).sort((a, b) => a.name.localeCompare(b.name));

  const reportLabels = new Set(report?.report_type ? REPORT_TYPE_RECOMMENDED_LABELS[report.report_type as ReportType] : []);
  const matchesType = (sw: Software) => sw.labels?.some((l) => reportLabels.has(l));
  const recommended = availableSoftware.filter(matchesType);
  const other = availableSoftware.filter((s) => !matchesType(s));

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

  const handleAddAllRecommended = () => {
    setSoftwareLocal((prev) => {
      const existing = new Set(prev.map((s) => s.id));
      const toAdd = recommended.filter((s) => !existing.has(s.id));
      return [...prev, ...toAdd];
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
      className="space-y-2 max-w-4xl"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title font-medium">Описание</div>
        <div className="collapse-content pt-2">
          <RichEditor
            value={form.description}
            onChange={(v) => updateForm("description", v)}
            placeholder="Общее описание объекта тестирования..."
          />
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title font-medium">Данные об объекте</div>
        <div className="collapse-content">
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">

            <div className="form-control col-span-2">
              <label className="label py-1"><span className="label-text">Название АС</span></label>
              <input className="input input-bordered w-full" value={form.asName ?? ""} onChange={(e) => updateForm("asName", e.target.value || null)} />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text">КЕ идентификатор</span></label>
              <input className="input input-bordered w-full" value={form.keId ?? ""} onChange={(e) => updateForm("keId", e.target.value || null)} />
            </div>

            <div className="form-control col-span-3">
              <label className="label py-1"><span className="label-text">URL тестового стенда</span></label>
              <input className="input input-bordered w-full font-mono text-sm" value={form.url ?? ""} onChange={(e) => updateForm("url", e.target.value || null)} />
            </div>

            <div className="form-control">
              <label className="label py-1"><span className="label-text">Дата начала</span></label>
              <input type="date" className="input input-bordered w-full" value={toDateStr(form.dateStart)} onChange={(e) => updateForm("dateStart", e.target.value || null)} />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Дата окончания</span></label>
              <input type="date" className="input input-bordered w-full" value={toDateStr(form.dateEnd)} onChange={(e) => updateForm("dateEnd", e.target.value || null)} />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Сегмент сети</span></label>
              <input className="input input-bordered w-full" value={form.segment ?? ""} onChange={(e) => updateForm("segment", e.target.value || null)} />
            </div>

            <div className="form-control col-span-3">
              <label className="label py-1"><span className="label-text">Цель тестирования</span></label>
              <textarea
                className="input input-bordered w-full min-h-20"
                value={form.goal ?? ""}
                onChange={(e) => updateForm("goal", e.target.value || null)}
                placeholder="Цель тестирования"
                rows={2}
              />
            </div>
            <div className="form-control col-span-3">
              <label className="label py-1"><span className="label-text">Условия тестирования</span></label>
              <textarea
                className="input input-bordered w-full min-h-20"
                value={form.testConditions ?? ""}
                onChange={(e) => updateForm("testConditions", e.target.value || null)}
                placeholder="Условия тестирования"
                rows={2}
              />
            </div>

            <div className="form-control col-span-3">
              <label className="label py-1"><span className="label-text">Исполнители</span></label>
              <div className="flex flex-wrap gap-2 mb-2">
                {executors.map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-base-300 border border-base-300 text-sm">
                    {e.name}
                    <button type="button" className="text-error/60 hover:text-error leading-none" onClick={() => setExecutorsLocal((prev) => prev.filter((x) => x.id !== e.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select className="select select-bordered select-sm w-56" value={selectedExecutorId} onChange={(e) => setSelectedExecutorId(e.target.value)}>
                  <option value="">Выбрать из справочника...</option>
                  {availableExecutors.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddExecutor}>Добавить</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" />
        <div className="collapse-title font-medium">Модель нарушителя</div>
        <div className="collapse-content">
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Уровень квалификации</span></label>
              <select className="select select-bordered w-full" value={form.qualificationLevel ?? ""} onChange={(e) => updateForm("qualificationLevel", e.target.value || null)}>
                <option value="">—</option>
                {QUAL_OPTIONS.map(([v]) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Уровень доступа</span></label>
              <select className="select select-bordered w-full" value={form.accessLevel ?? ""} onChange={(e) => updateForm("accessLevel", e.target.value || null)}>
                <option value="">—</option>
                {ACCESS_OPTIONS.map(([v]) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Уровень осведомлённости</span></label>
              <select className="select select-bordered w-full" value={form.knowledgeLevel ?? ""} onChange={(e) => updateForm("knowledgeLevel", e.target.value || null)}>
                <option value="">—</option>
                {KNOWLEDGE_OPTIONS.map(([v]) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" />
        <div className="collapse-title font-medium">Используемое ПО</div>
        <div className="collapse-content">
          <table className="table table-sm mb-3">
            <thead>
              <tr><th>Название</th><th>Метки</th><th /></tr>
            </thead>
            <tbody>
              {software.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <div className="flex gap-1">
                      {(s.labels ?? []).map((l) => {
                        const d = SOFTWARE_LABEL_STYLES[l];
                        return d ? <Tag key={l} colorClass={d.style} size="xs">{d.text}</Tag> : null;
                      })}
                    </div>
                  </td>
                  <td className="text-right w-10">
                    <button type="button" className="btn btn-ghost btn-sm btn-square text-error/50 hover:text-error text-base" onClick={() => setSoftwareLocal((prev) => prev.filter((x) => x.id !== s.id))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 items-center">
            <select className="select select-bordered select-sm w-64" value={selectedSoftwareId} onChange={(e) => setSelectedSoftwareId(e.target.value)}>
              <option value="">Выбрать из справочника...</option>
              {recommended.length > 0 && (
                <optgroup label="Рекомендуемые">
                  {recommended.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{(s.labels ?? []).length > 0 ? ` [${(s.labels ?? []).map(l => SOFTWARE_LABEL_STYLES[l]?.text ?? l).join(", ")}]` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {other.length > 0 && (
                <optgroup label="Остальные">
                  {other.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{(s.labels ?? []).length > 0 ? ` [${(s.labels ?? []).map(l => SOFTWARE_LABEL_STYLES[l]?.text ?? l).join(", ")}]` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddSoftware}>Добавить</button>
            {recommended.length > 0 && (
              <button type="button" className="btn btn-sm btn-outline btn-secondary font-mono text-[11px] tracking-wider" onClick={handleAddAllRecommended}>
                + все рекомендуемые
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button type="submit" className="btn btn-primary font-display tracking-wider" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
