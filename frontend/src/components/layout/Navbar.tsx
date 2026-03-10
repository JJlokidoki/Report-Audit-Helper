import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "../../api/reportApi";

const TYPE_LABELS: Record<string, string> = {
  web: "WEB",
  ios: "iOS",
  android: "Android",
  ai: "AI",
  iot: "IoT",
};

export default function Navbar() {
  const { id } = useParams();
  const reportId = id ? Number(id) : null;

  const { data: report } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReport(reportId!),
    enabled: !!reportId,
  });

  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4">
      <div className="flex-1 gap-2">
        <Link to="/" className="text-lg font-bold">
          Pentest Audit Helper
        </Link>
        {report && (
          <>
            <span className="text-base-content/50">/</span>
            <span className="font-medium">{report.name}</span>
            <span className="badge badge-outline badge-sm">
              {TYPE_LABELS[report.report_type] ?? report.report_type}
            </span>
          </>
        )}
      </div>
      {report && (
        <div className="flex-none">
          <button className="btn btn-sm btn-primary" disabled>
            Экспорт в Word
          </button>
        </div>
      )}
    </div>
  );
}
