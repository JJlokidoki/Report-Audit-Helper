import { useRef, useState } from "react";
import type { Severity } from "../../types";
import { streamVuln, toBase64 } from "../../api/aiApi";
import type { ChatMessage } from "../../api/aiApi";
import { mdToHtml } from "../../utils/mdToHtml";

export interface VulnFields {
  bug_name?: string;
  bug_description?: string;
  reproduction_steps?: string;
  remediation?: string;
  cvss_score?: number | null;
  cvss_vector?: string | null;
  bug_criticality?: Severity;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (fields: VulnFields) => void;
}

const SEVERITY_MAP: Record<string, Severity> = {
  критический: "critical",
  высокий: "high",
  средний: "medium",
  низкий: "low",
  информационный: "info",
};

function parseVulnMarkdown(md: string): VulnFields {
  const title = md.match(/^##\s+(.+)$/m)?.[1]?.trim();
  const desc = md.match(/###\s+Описание\s*\n+([\s\S]+?)(?=\n###|\n##|$)/)?.[1]?.trim();
  const steps = md.match(/###\s+Шаги для повторения\s*\n+([\s\S]+?)(?=\n###|\n##|$)/)?.[1]?.trim();
  const recs = md.match(/###\s+Рекомендации по устранению\s*\n+([\s\S]+?)(?=\n###|\n##|$)/)?.[1]?.trim();
  const cvssScore = md.match(/\*\*CVSS\*\*\s*\|\s*([\d.]+)/)?.[1];
  const cvssVector = md.match(/\*\*CVSS-вектор\*\*\s*\|\s*(CVSS:[^\s|]+)/)?.[1];
  const sevText = md.match(/\*\*Уровень опасности\*\*\s*\|\s*([^\n|]+)/)?.[1]?.toLowerCase().trim() ?? "";
  const severity = Object.entries(SEVERITY_MAP).find(([k]) => sevText.includes(k))?.[1];

  return {
    ...(title && { bug_name: title }),
    ...(desc && { bug_description: mdToHtml(desc) }),
    ...(steps && { reproduction_steps: mdToHtml(steps) }),
    ...(recs && { remediation: mdToHtml(recs) }),
    ...(cvssScore && { cvss_score: parseFloat(cvssScore) }),
    ...(cvssVector && { cvss_vector: cvssVector }),
    ...(severity && { bug_criticality: severity }),
  };
}

export default function AIGenerateModal({ open, onClose, onApply }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [currentOutput, setCurrentOutput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput("");
    setCurrentOutput("");
    setStreaming(true);

    const b64images = await Promise.all(images.map(toBase64));
    setImages([]);

    abortRef.current = new AbortController();
    let output = "";

    try {
      await streamVuln(
        { history: newHistory, images: b64images, filenames: images.map((f) => f.name) },
        (chunk) => {
          output += chunk;
          setCurrentOutput(output);
          outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
        },
        abortRef.current.signal
      );
      setHistory((prev) => [...prev, { role: "assistant", content: output }]);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setCurrentOutput((prev) => prev + "\n[Ошибка соединения с AI-сервисом]");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleApply = () => {
    const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    onApply(parseVulnMarkdown(lastAssistant.content));
    onClose();
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setHistory([]);
    setCurrentOutput("");
    setInput("");
    setImages([]);
  };

  if (!open) return null;

  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl w-full flex flex-col gap-3" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">AI Генерация описания уязвимости</h3>
          <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>✕</button>
        </div>

        {/* Conversation history */}
        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto min-h-48 max-h-96 bg-base-200 rounded p-3 space-y-3 text-sm font-mono"
        >
          {history.length === 0 && !streaming && (
            <p className="text-base-content/40 text-center mt-8">
              Опишите уязвимость — AI сгенерирует полное описание
            </p>
          )}
          {history.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-primary" : "text-base-content whitespace-pre-wrap"}>
              {m.role === "user" ? (
                <span className="font-bold text-xs text-primary/60 mr-1">&gt;</span>
              ) : (
                <span className="font-bold text-xs text-success/60 mr-1">AI:</span>
              )}
              {m.content}
            </div>
          ))}
          {streaming && currentOutput && (
            <div className="text-base-content whitespace-pre-wrap">
              <span className="font-bold text-xs text-success/60 mr-1">AI:</span>
              {currentOutput}
              <span className="animate-pulse">▎</span>
            </div>
          )}
        </div>

        {/* Image preview */}
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest px-1.5 py-0.5 border bg-base-content/8 text-base-content/50 border-base-content/20">
                {f.name}
                <button type="button" className="text-error/60 hover:text-error" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 items-end">
          <textarea
            className="textarea textarea-bordered flex-1 resize-none text-sm"
            rows={3}
            placeholder="Опишите уязвимость, запрос/ответ, шаги эксплуатации..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSend();
            }}
            disabled={streaming}
          />
          <div className="flex flex-col gap-1">
            <button
              className="btn btn-ghost btn-sm btn-square"
              title="Прикрепить изображения"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </button>
            {streaming ? (
              <button className="btn btn-sm btn-error" onClick={handleStop}>Стоп</button>
            ) : (
              <button
                className="btn btn-sm btn-primary font-display"
                onClick={handleSend}
                disabled={!input.trim() && images.length === 0}
              >
                ›_ Ctrl+↵
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) setImages((prev) => [...prev, ...Array.from(e.target.files!)]);
            e.target.value = "";
          }}
        />

        {/* Actions */}
        <div className="flex justify-between items-center pt-1 border-t border-base-300">
          <button className="btn btn-ghost btn-sm text-base-content/40" onClick={handleClear} disabled={streaming}>
            Очистить чат
          </button>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={handleClose}>Закрыть</button>
            <button
              className="btn btn-sm btn-primary font-display tracking-wider"
              onClick={handleApply}
              disabled={!lastAssistant || streaming}
              title="Заполнить поля формы из последнего ответа AI"
            >
              Применить →
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </dialog>
  );
}
