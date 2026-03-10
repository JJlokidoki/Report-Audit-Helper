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

interface NavbarProps {
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export default function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const { id } = useParams();
  const reportId = id ? Number(id) : null;

  const { data: report } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReport(reportId!),
    enabled: !!reportId,
  });

  return (
    <header className="h-13 bg-base-200 border-b border-base-300 px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-display font-bold text-primary text-lg leading-none tracking-tight select-none">
            &gt;_
            <span className="cursor-blink text-primary/80">▎</span>
          </span>
          <span className="font-display font-semibold text-sm tracking-[0.15em] uppercase text-base-content group-hover:text-primary transition-colors duration-200">
            Pentest Audit
          </span>
        </Link>

        {report && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-base-300 font-mono select-none">/</span>
            <span className="text-sm text-base-content/70 font-medium max-w-56 truncate">
              {report.name}
            </span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 border border-primary/40 text-primary bg-primary/8 tracking-widest uppercase">
              {TYPE_LABELS[report.report_type] ?? report.report_type}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onThemeToggle}
          className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-base-content"
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          aria-label="Переключить тему"
        >
          {theme === "dark" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
            </svg>
          )}
        </button>
        {report && (
          <button
            type="button"
            className="btn btn-sm btn-outline btn-primary font-display tracking-wider text-xs"
            disabled
          >
            Экспорт
          </button>
        )}
      </div>
    </header>
  );
}
