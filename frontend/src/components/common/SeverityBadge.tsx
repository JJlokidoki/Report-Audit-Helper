import type { Severity } from "../../types";
import Tag from "./Tag";

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
    <Tag colorClass={STYLES[severity]} size="sm">{LABELS[severity]}</Tag>
  );
}
