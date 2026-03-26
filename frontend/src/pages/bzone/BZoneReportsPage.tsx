import { useState, useMemo } from "react";
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
import {
  getBZoneReports,
  syncBZone,
  analyzeBZone,
  getSyncStatus,
  type BZoneReport,
} from "../../api/bzoneApi";
import PageHeader from "../../components/common/PageHeader";
import Tag from "../../components/common/Tag";
import EmptyState from "../../components/common/EmptyState";

const CRITICAL_STYLES: Record<string, { label: string; colorClass: string }> = {
  cr: { label: "CRITICAL", colorClass: "bg-error/15 text-error border-error/40" },
  hg: { label: "HIGH", colorClass: "bg-warning/15 text-warning border-warning/40" },
  md: { label: "MEDIUM", colorClass: "bg-info/15 text-info border-info/40" },
  lw: { label: "LOW", colorClass: "bg-success/15 text-success border-success/40" },
  in: { label: "INFO", colorClass: "bg-base-content/8 text-base-content/50 border-base-content/20" },
};

const CRITICAL_TYPES = ["cr", "hg", "md", "lw", "in"] as const;

const columnHelper = createColumnHelper<BZoneReport>();

export default function BZoneReportsPage() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [criticalFilter, setCriticalFilter] = useState("");
  const [uniqueOnly, setUniqueOnly] = useState(false);

  const filterParams = useMemo(() => ({
    company: companyFilter || undefined,
    stage_id: stageFilter ? parseInt(stageFilter, 10) : undefined,
    critical_type: criticalFilter || undefined,
    is_duplicate: uniqueOnly ? false : undefined,
  }), [companyFilter, stageFilter, criticalFilter, uniqueOnly]);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["bzone-reports", filterParams],
    queryFn: () => getBZoneReports(filterParams),
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["bzone-sync-status"],
    queryFn: getSyncStatus,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3000 : false,
  });

  const companies = useMemo(() => {
    const set = new Set(reports.map((r) => r.company));
    return [...set].sort();
  }, [reports]);

  const syncMut = useMutation({
    mutationFn: syncBZone,
    onSuccess: () => {
      toast.success("Синхронизация запущена");
      queryClient.invalidateQueries({ queryKey: ["bzone-sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["bzone-reports"] });
    },
    onError: () => toast.error("Ошибка синхронизации"),
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeBZone({ all: true }),
    onSuccess: () => toast.success("AI-анализ запущен"),
    onError: () => toast.error("Ошибка запуска анализа"),
  });

  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: ({ getValue }) => (
        <a
          href={`https://bugbounty.bi.zone/reports/${getValue()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-primary hover:text-primary/70 transition-colors"
        >
          #{getValue()}
        </a>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Название",
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("company", {
      header: "Компания",
      cell: ({ getValue }) => (
        <span className="text-sm text-base-content/70">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("critical_type", {
      header: "Критичность",
      cell: ({ getValue }) => {
        const ct = getValue();
        if (!ct) return null;
        const style = CRITICAL_STYLES[ct];
        if (!style) return <span className="font-mono text-xs">{ct}</span>;
        return <Tag colorClass={style.colorClass} size="xs">{style.label}</Tag>;
      },
    }),
    columnHelper.accessor("current_stage_tag", {
      header: "Стадия",
      cell: ({ getValue }) => {
        const tag = getValue();
        return tag ? (
          <Tag colorClass="bg-secondary/10 text-secondary border-secondary/30" size="xs">
            {tag}
          </Tag>
        ) : null;
      },
    }),
    columnHelper.accessor("cvss", {
      header: "CVSS",
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span className={`font-mono text-xs ${v ? "text-base-content" : "text-base-content/30"}`}>
            {v || "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("researcher", {
      header: "Исследователь",
      cell: ({ getValue }) => (
        <span className="text-sm text-base-content/70">{getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("cwe_id", {
      header: "CWE",
      cell: ({ getValue }) => {
        const cwe = getValue();
        return cwe
          ? <span className="font-mono text-xs text-accent">{cwe}</span>
          : <span className="font-mono text-xs text-base-content/25">—</span>;
      },
    }),
    columnHelper.accessor("is_duplicate", {
      header: "Дубликат",
      cell: ({ getValue }) =>
        getValue() ? (
          <Tag colorClass="bg-warning/10 text-warning border-warning/30" size="xs">DUP</Tag>
        ) : null,
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

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl">
      <PageHeader title="BZone — Уязвимости" subtitle="синхронизация и анализ репортов BI.ZONE Bug Bounty" className="mb-5" />

      {/* ── Sync status ──────────────────────────────────────────────────────── */}
      {syncStatus && (
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="font-mono text-xs text-base-content/40">Синхронизация:</span>
          <Tag
            size="xs"
            colorClass={
              syncStatus.status === "running"
                ? "bg-info/15 text-info border-info/40"
                : syncStatus.status === "success"
                  ? "bg-success/15 text-success border-success/40"
                  : syncStatus.status === "failed"
                    ? "bg-error/15 text-error border-error/40"
                    : "bg-base-content/8 text-base-content/50 border-base-content/20"
            }
          >
            {syncStatus.status.toUpperCase()}
          </Tag>
          {syncStatus.finished_at && (
            <span className="font-mono text-xs text-base-content/40">
              {formatSyncTime(syncStatus.finished_at)}
            </span>
          )}
        </div>
      )}

      {/* ── Filters + actions ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <select
          className="select select-bordered select-sm w-44 font-mono text-xs"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">Все компании</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="select select-bordered select-sm w-36 font-mono text-xs"
          value={criticalFilter}
          onChange={(e) => setCriticalFilter(e.target.value)}
        >
          <option value="">Все уровни</option>
          {CRITICAL_TYPES.map((ct) => (
            <option key={ct} value={ct}>{CRITICAL_STYLES[ct]?.label}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Stage ID"
          className="input input-bordered input-sm w-28 font-mono text-xs"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        />

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={uniqueOnly}
            onChange={(e) => setUniqueOnly(e.target.checked)}
          />
          <span className="text-sm text-base-content/70">Только уникальные</span>
        </label>

        <div className="flex-1" />

        <button
          type="button"
          className="btn btn-sm btn-outline btn-secondary font-display tracking-wider"
          onClick={() => analyzeMut.mutate()}
          disabled={analyzeMut.isPending}
        >
          {analyzeMut.isPending
            ? <><span className="loading loading-spinner loading-xs" /> Анализ…</>
            : "◈ AI-анализ"}
        </button>

        <button
          type="button"
          className="btn btn-sm btn-primary font-display tracking-wider"
          onClick={() => syncMut.mutate()}
          disabled={syncMut.isPending || syncStatus?.status === "running"}
        >
          {syncMut.isPending || syncStatus?.status === "running"
            ? <><span className="loading loading-spinner loading-xs" /> Синхронизация…</>
            : "›_ Синхронизировать"}
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center gap-3 text-base-content/40 py-8">
          <span className="loading loading-spinner loading-sm" />
          <span className="font-mono text-sm">Загрузка...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="border border-base-300 bg-base-200/30">
          <EmptyState message="репортов не найдено" />
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-300 bg-base-200/20">
          <table className="table table-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-base-300">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="bg-base-200/60 py-3 cursor-pointer select-none"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{
                          asc: <span className="font-mono text-xs text-primary">▲</span>,
                          desc: <span className="font-mono text-xs text-primary">▼</span>,
                        }[h.column.getIsSorted() as string] ?? null}
                      </span>
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

      <div className="mt-3 text-right">
        <span className="font-mono text-xs text-base-content/30">
          {reports.length} записей
        </span>
      </div>
    </div>
  );
}
