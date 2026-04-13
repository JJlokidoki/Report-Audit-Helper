import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { getTestSummary } from "../api/reportApi";
import type { Vulnerability, SeverityCounts } from "../types";
import SeverityBadge from "../components/common/SeverityBadge";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const STATS: { key: keyof SeverityCounts; label: string; bg: string; text: string }[] = [
  { key: "critical", label: "Критичные", bg: "bg-error/10", text: "text-error" },
  { key: "high", label: "Высокие", bg: "bg-warning/10", text: "text-warning" },
  { key: "medium", label: "Средние", bg: "bg-accent/10", text: "text-accent" },
  { key: "low", label: "Низкие", bg: "bg-info/10", text: "text-info" },
  { key: "info", label: "Инфо", bg: "bg-base-200", text: "text-base-content" },
];

const col = createColumnHelper<Vulnerability>();

const columns = [
  col.accessor("bug_name", {
    header: "Уязвимость",
    cell: (info) => info.getValue(),
    sortingFn: "text",
  }),
  col.accessor("bug_criticality", {
    header: "Критичность",
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
    sortingFn: (a, b) =>
      (SEVERITY_ORDER[a.original.bug_criticality] ?? 9) -
      (SEVERITY_ORDER[b.original.bug_criticality] ?? 9),
  }),
  col.accessor("cvss_score", {
    header: "CVSS",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? <span className="font-mono">{v.toFixed(1)}</span> : "—";
    },
    sortingFn: (a, b) => (a.original.cvss_score ?? -1) - (b.original.cvss_score ?? -1),
  }),
];

export default function TestSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = id ? parseInt(id, 10) : NaN;
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["test-summary", reportId],
    queryFn: () => getTestSummary(reportId),
    enabled: !isNaN(reportId),
  });

  const counts = data?.counts ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const vulnerabilities = data?.vulnerabilities ?? [];

  const table = useReactTable({
    data: vulnerabilities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isNaN(reportId) || isLoading) {
    return (
      <div className="p-4">
        {isLoading ? <span className="loading loading-spinner loading-md" /> : "Отчёт не найден"}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATS.map(({ key, label, bg, text }) => (
          <div key={key} className={`card ${bg} ${text}`}>
            <div className="card-body p-4">
              <p className="text-2xl font-bold">{counts[key]}</p>
              <p className="text-sm opacity-80">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto border border-base-300 bg-base-200/20">
        <table className="table table-zebra">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={`bg-base-200/60 py-3 ${h.column.getCanSort() ? "cursor-pointer select-none hover:text-primary transition-colors" : ""}`}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1.5">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{
                        asc: <span className="font-mono text-primary text-xs">▲</span>,
                        desc: <span className="font-mono text-primary text-xs">▼</span>,
                      }[h.column.getIsSorted() as string] ?? (
                        h.column.getCanSort()
                          ? <span className="font-mono text-base-content/20 text-xs">▼</span>
                          : null
                      )}
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
                    {cell.column.id === "bug_name" ? (
                      <Link
                        to={`/reports/${reportId}/vulnerabilities/${row.original.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Link>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
