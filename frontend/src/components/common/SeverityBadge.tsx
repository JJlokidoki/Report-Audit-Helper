import type { Severity } from "../../types";

const COLORS: Record<Severity, string> = {
  critical: "badge-error",
  high: "badge-warning",
  medium: "badge-accent",
  low: "badge-info",
  info: "badge-ghost",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge badge-sm ${COLORS[severity]}`}>{severity}</span>;
}
