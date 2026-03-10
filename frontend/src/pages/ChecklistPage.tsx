import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChecklist, updateCheck } from "../api/reportApi";
import type { SecurityCheck, CheckStatus } from "../types";

const STATUS_OPTIONS: CheckStatus[] = ["passed", "failed", "not_applicable", "not_tested"];
const STATUS_LABEL: Record<CheckStatus, string> = {
  passed: "Выполнено",
  failed: "Сломано",
  not_applicable: "Не применимо",
  not_tested: "Не выполнено",
};
const STATUS_CLASS: Record<CheckStatus, string> = {
  passed: "select-success",
  failed: "select-error",
  not_applicable: "select-ghost",
  not_tested: "",
};

const DEBOUNCE_MS = 500;

function groupByCategory(checks: SecurityCheck[]): Map<string, SecurityCheck[]> {
  const map = new Map<string, SecurityCheck[]>();
  for (const c of checks) {
    const cat = c.category || "Без категории";
    map.set(cat, [...(map.get(cat) ?? []), c]);
  }
  return map;
}

function CheckRow({
  check,
  onSave,
}: {
  check: SecurityCheck;
  onSave: (status: string, notes: string | null) => void;
}) {
  const [status, setStatus] = useState(check.status);
  const [notes, setNotes] = useState(check.notes ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus(check.status);
    setNotes(check.notes ?? "");
  }, [check.status, check.notes]);

  const scheduleSave = useCallback(
    (newStatus: string, newNotes: string | null) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(newStatus, newNotes);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [onSave]
  );

  const handleStatusChange = (v: CheckStatus) => {
    setStatus(v);
    scheduleSave(v, notes || null);
  };

  const handleNotesChange = (v: string) => {
    setNotes(v);
    scheduleSave(status, v || null);
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      onSave(status, notes || null);
      timerRef.current = null;
    }
  };

  return (
    <tr>
      <td className="font-mono text-sm whitespace-nowrap">{check.check_id}</td>
      <td>
        <span title={check.short_description ?? undefined}>{check.name}</span>
      </td>
      <td className="max-w-xs">
        {check.goal ? (
          <ul className="list-none space-y-0.5 text-xs text-base-content/70">
            {check.goal.split("\n").map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : null}
      </td>
      <td>
        <select
          className={`select select-bordered select-sm ${STATUS_CLASS[status]}`}
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as CheckStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </td>
      <td>
        <textarea
          className="textarea textarea-bordered textarea-sm w-full min-h-[2rem]"
          rows={1}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleBlur}
        />
      </td>
    </tr>
  );
}

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = id ? parseInt(id, 10) : NaN;
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ["checklist", reportId, statusFilter || undefined],
    queryFn: () => getChecklist(reportId, statusFilter ? { status: statusFilter } : undefined),
    enabled: !isNaN(reportId),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      checkId,
      status,
      notes,
    }: {
      checkId: string;
      status?: string;
      notes?: string;
    }) => updateCheck(reportId, checkId, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", reportId] });
    },
  });

  const handleSave = (checkId: string, status: string, notes: string | null) => {
    updateMutation.mutate({ checkId, status, notes: notes ?? undefined });
  };

  if (isNaN(reportId) || isLoading) {
    return (
      <div className="p-4">
        {isLoading ? <span className="loading loading-spinner loading-md" /> : "Отчёт не найден"}
      </div>
    );
  }

  const grouped = groupByCategory(checks);

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 items-center">
        <label className="label-text">Фильтр по статусу:</label>
        <select
          className="select select-bordered select-sm w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" defaultChecked />
            <div className="collapse-title font-medium">{category}</div>
            <div className="collapse-content">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Задачи</th>
                    <th>Статус</th>
                    <th>Заметки</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <CheckRow
                      key={c.id}
                      check={c}
                      onSave={(status, notes) => handleSave(c.check_id, status, notes)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
