import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import toast from "react-hot-toast";
import { getReports, createReport, deleteReport } from "../api/reportApi";
import type { Report, ReportListItem, ReportType } from "../types";
import ConfirmModal from "../components/common/ConfirmModal";

const TYPE_LABELS: Record<ReportType, string> = {
  web: "WEB",
  ios: "iOS",
  android: "Android",
  ai: "AI",
  iot: "IoT",
};

const TYPE_COLORS: Record<ReportType, string> = {
  web: "text-primary border-primary/40 bg-primary/8",
  ios: "text-accent border-accent/40 bg-accent/8",
  android: "text-success border-success/40 bg-success/8",
  ai: "text-secondary border-secondary/40 bg-secondary/8",
  iot: "text-warning border-warning/40 bg-warning/8",
};

const REPORT_TYPES: ReportType[] = ["web", "ios", "android", "ai", "iot"];

const columnHelper = createColumnHelper<ReportListItem>();

export default function ReportListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<ReportType>("web");
  const [deleteTarget, setDeleteTarget] = useState<ReportListItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", typeFilter || undefined],
    queryFn: () => getReports(typeFilter || undefined),
  });

  const createMutation = useMutation<Report, Error, { name: string; report_type: string }>({
    mutationFn: createReport,
    onSuccess: (report) => {
      toast.success("Отчёт создан");
      setCreateModalOpen(false);
      setCreateName("");
      setCreateType("web");
      navigate(`/reports/${report.id}/system-info`);
    },
    onError: () => toast.error("Ошибка создания отчёта"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      toast.success("Отчёт удалён");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: () => toast.error("Ошибка удаления отчёта"),
  });

  const columns = [
    columnHelper.accessor("name", {
      header: "Название",
      cell: ({ row }) => (
        <Link
          to={`/reports/${row.original.id}/system-info`}
          className="font-medium text-base-content hover:text-primary transition-colors duration-150"
        >
          {row.original.name}
        </Link>
      ),
    }),
    columnHelper.accessor("report_type", {
      header: "Тип",
      cell: ({ getValue }) => {
        const t = getValue();
        return (
          <span className={`font-mono text-[11px] tracking-widest px-1.5 py-0.5 border ${TYPE_COLORS[t]}`}>
            {TYPE_LABELS[t]}
          </span>
        );
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Создан",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-base-content/50">
          {new Date(getValue()).toLocaleDateString("ru-RU")}
        </span>
      ),
    }),
    columnHelper.accessor("vulnerability_count", {
      header: "Уязвимости",
      cell: ({ getValue }) => (
        <span className={`font-mono text-sm font-medium ${getValue() > 0 ? "text-error" : "text-base-content/40"}`}>
          {getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          className="btn btn-ghost btn-xs text-error/60 hover:text-error hover:bg-error/10 font-mono tracking-wider"
          onClick={() => setDeleteTarget(row.original)}
        >
          ✕ удалить
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: reports,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleCreate = () => {
    if (!createName.trim()) {
      toast.error("Введите название");
      return;
    }
    createMutation.mutate({ name: createName.trim(), report_type: createType });
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-base-content mb-1">
          Отчёты
        </h1>
        <p className="text-sm text-base-content/45 font-mono">
          // управление аудитами безопасности
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-5">
        <select
          className="select select-bordered select-sm w-40 font-mono text-xs"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Все типы</option>
          {REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm btn-primary font-display tracking-wider"
          onClick={() => setCreateModalOpen(true)}
        >
          + Новый отчёт
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-base-content/40 py-8">
          <span className="loading loading-spinner loading-sm" />
          <span className="font-mono text-sm">Загрузка...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="border border-base-300 bg-base-200/30 p-12 text-center">
          <p className="font-mono text-base-content/35 text-sm">// отчётов не найдено</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-300 bg-base-200/20">
          <table className="table table-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-base-300">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="bg-base-200/60 py-3">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-base-300/40 hover:bg-primary/3 transition-colors duration-100">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box bg-base-200 border border-base-300 rounded-sm max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-primary">›_</span>
              <h3 className="font-display font-semibold tracking-wide">Новый отчёт</h3>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-3 mb-5">
              <div className="form-control col-span-2">
                <label className="label py-1">
                  <span className="label-text font-mono text-xs text-base-content/50 tracking-wider uppercase">
                    Название
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Название проекта"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-mono text-xs text-base-content/50 tracking-wider uppercase">
                    Тип
                  </span>
                </label>
                <select
                  className="select select-bordered w-full font-mono"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as ReportType)}
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-action gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm font-mono"
                onClick={() => setCreateModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm font-display tracking-wider"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Создание…" : "Создать"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)} />
        </dialog>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить отчёт?"
        message={deleteTarget ? `Удалить отчёт «${deleteTarget.name}»?` : ""}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
