import type { Severity } from "../../types";

const STYLES: Record<Severity, string> = {
  critical: "bg-error/15 text-error border-error/50",
  high: "bg-warning/15 text-warning border-warning/50",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  low: "bg-info/15 text-info border-info/50",
  info: "bg-base-content/8 text-base-content/50 border-base-content/20",
};

const LABELS: Record<Severity, string> = {
  critical: "КРИТ",
  high: "ВЫСОК",
  medium: "СРЕДН",
  low: "НИЗК",
  info: "ИНФО",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block font-mono text-[10px] tracking-widest px-1.5 py-0.5 border ${STYLES[severity]}`}
    >
      {LABELS[severity]}
    </span>
  );
}
