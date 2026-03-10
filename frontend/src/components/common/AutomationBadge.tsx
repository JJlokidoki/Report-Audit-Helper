import type { AutomationLevel } from "../../types";

const STYLES: Record<AutomationLevel, string> = {
  fully: "bg-success/15 text-success border-success/40",
  partially: "bg-warning/15 text-warning border-warning/40",
  no: "bg-base-content/8 text-base-content/45 border-base-content/15",
  impossible: "bg-error/15 text-error/70 border-error/30",
};

const LABELS: Record<AutomationLevel, string> = {
  fully: "Полн.",
  partially: "Частич.",
  no: "Нет",
  impossible: "Невозм.",
};

export default function AutomationBadge({ level }: { level: AutomationLevel }) {
  return (
    <span className={`inline-block font-mono text-[10px] tracking-wide px-1.5 py-0.5 border ${STYLES[level]}`}>
      {LABELS[level]}
    </span>
  );
}
