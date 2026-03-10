import { useEffect, useRef, useState, useCallback } from "react";
import type { Severity } from "../../types";

interface CVSSResult {
  vector: string;
  score: number;
  severity: Severity;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (result: CVSSResult) => void;
  initialVector?: string | null;
  theme?: "dark" | "light";
}

const SEVERITY_MAP: Record<string, Severity> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
  None: "info",
};

const SEV_STYLE: Record<Severity, string> = {
  critical: "text-error border-error/60 bg-error/10",
  high: "text-warning border-warning/60 bg-warning/10",
  medium: "text-amber-400 border-amber-400/50 bg-amber-400/8",
  low: "text-info border-info/50 bg-info/8",
  info: "text-base-content/50 border-base-content/20 bg-base-content/5",
};

export default function CVSSCalculatorModal({ open, onClose, onApply, initialVector, theme = "dark" }: Props) {
  const [current, setCurrent] = useState<CVSSResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const iframeSrc = initialVector
    ? `/cvss_calc/index.html?theme=${theme}&lang=ru#${encodeURIComponent(initialVector)}`
    : `/cvss_calc/index.html?theme=${theme}&lang=ru`;

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type !== "cvss_update") return;
    const { vector, score, severity } = e.data as { type: string; vector: string; score: number; severity: string };
    setCurrent({
      vector,
      score,
      severity: SEVERITY_MAP[severity] ?? "info",
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, handleMessage]);

  useEffect(() => {
    if (!open) setCurrent(null);
  }, [open]);

  if (!open) return null;

  const sev = current?.severity ?? "info";

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box bg-base-200 border border-base-300 rounded-sm p-0 max-w-4xl w-full flex flex-col" style={{ height: "85vh" }}>
        {/* Modal header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300 shrink-0">
          <span className="font-mono text-primary text-sm">›_</span>
          <span className="font-display font-semibold tracking-wide text-sm">CVSS 4.0 Калькулятор</span>
          <div className="flex-1" />
          {current && (
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs px-2 py-0.5 border ${SEV_STYLE[sev]}`}>
                {current.score.toFixed(1)} — {current.severity.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] text-base-content/35 max-w-72 truncate">
                {current.vector}
              </span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm font-display tracking-wider ml-2"
            disabled={!current}
            onClick={() => { if (current) { onApply(current); onClose(); } }}
          >
            Применить
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-base-content/50"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="flex-1 w-full border-0"
          title="CVSS Calculator"
        />
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
