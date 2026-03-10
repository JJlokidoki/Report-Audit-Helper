import type { AutomationLevel } from "../../types";

const LABELS: Record<AutomationLevel, string> = {
  fully: "Полностью",
  partially: "Частично",
  no: "Нет",
  impossible: "Невозможно",
};

const COLORS: Record<AutomationLevel, string> = {
  fully: "badge-success",
  partially: "badge-warning",
  no: "badge-ghost",
  impossible: "badge-error",
};

export default function AutomationBadge({ level }: { level: AutomationLevel }) {
  return <span className={`badge badge-sm ${COLORS[level]}`}>{LABELS[level]}</span>;
}
