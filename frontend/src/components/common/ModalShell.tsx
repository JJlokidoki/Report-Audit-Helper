interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
  className?: string;
  fullHeight?: boolean;
}

export default function ModalShell({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "max-w-md",
  className,
  fullHeight,
}: Props) {
  if (!open) return null;

  const boxClasses = [
    "modal-box bg-base-200 border border-base-300 rounded-sm",
    maxWidth,
    fullHeight ? "p-0 flex flex-col" : "",
    className ?? "",
  ].join(" ");

  const boxStyle = fullHeight
    ? { width: "95vw", maxWidth: "95vw", height: "90vh" }
    : undefined;

  return (
    <dialog open className="modal modal-open">
      <div className={boxClasses} style={boxStyle}>
        <div className={`flex items-center gap-2 ${fullHeight ? "px-4 py-3 border-b border-base-300 shrink-0" : "mb-4"}`}>
          <span className="font-mono text-primary text-sm">›_</span>
          <span className="font-display font-semibold tracking-wide text-sm">{title}</span>
          <div className="flex-1" />
          {fullHeight && (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square text-base-content/50"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        {children}
        {actions && <div className="modal-action gap-2">{actions}</div>}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
