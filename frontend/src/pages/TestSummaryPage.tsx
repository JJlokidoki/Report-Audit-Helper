import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTestSummary } from "../api/reportApi";
import type { SeverityCounts } from "../types";
import SeverityBadge from "../components/common/SeverityBadge";

const STATS: { key: keyof SeverityCounts; label: string; bg: string; text: string }[] = [
  { key: "critical", label: "Критичные", bg: "bg-error/10", text: "text-error" },
  { key: "high", label: "Высокие", bg: "bg-warning/10", text: "text-warning" },
  { key: "medium", label: "Средние", bg: "bg-accent/10", text: "text-accent" },
  { key: "low", label: "Низкие", bg: "bg-info/10", text: "text-info" },
  { key: "info", label: "Инфо", bg: "bg-base-200", text: "text-base-content" },
];

export default function TestSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = id ? parseInt(id, 10) : NaN;

  const { data, isLoading } = useQuery({
    queryKey: ["test-summary", reportId],
    queryFn: () => getTestSummary(reportId),
    enabled: !isNaN(reportId),
  });

  if (isNaN(reportId) || isLoading) {
    return (
      <div className="p-4">
        {isLoading ? <span className="loading loading-spinner loading-md" /> : "Отчёт не найден"}
      </div>
    );
  }

  const counts = data?.counts ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const vulnerabilities = data?.vulnerabilities ?? [];

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

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Уязвимость</th>
              <th>Критичность</th>
              <th>CVSS</th>
            </tr>
          </thead>
          <tbody>
            {vulnerabilities.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link to={`/reports/${reportId}/vulnerabilities/${v.id}`} className="link link-hover">
                    {v.bug_name}
                  </Link>
                </td>
                <td><SeverityBadge severity={v.bug_criticality} /></td>
                <td>{v.cvss_score ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
