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
        <Link to={`/reports/${row.original.id}/system-info`} className="link link-hover">
          {row.original.name}
        </Link>
      ),
    }),
    columnHelper.accessor("report_type", {
      header: "Тип",
      cell: ({ getValue }) => (
        <span className="badge badge-ghost">{TYPE_LABELS[getValue()]}</span>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: "Дата создания",
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString("ru-RU"),
    }),
    columnHelper.accessor("vulnerability_count", {
      header: "Уязвимости",
    }),
    columnHelper.display({
      id: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <button
          type="button"
          className="btn btn-ghost btn-error btn-sm"
          onClick={() => setDeleteTarget(row.original)}
        >
          Удалить
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
    <div className="p-4">
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <select
          className="select select-bordered w-40"
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
          className="btn btn-primary"
          onClick={() => setCreateModalOpen(true)}
        >
          Создать отчёт
        </button>
      </div>

      {isLoading ? (
        <span className="loading loading-spinner loading-md" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Создать отчёт</h3>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Название</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Название отчёта"
              />
            </div>
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Тип</span>
              </label>
              <select
                className="select select-bordered"
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
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setCreateModalOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
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
