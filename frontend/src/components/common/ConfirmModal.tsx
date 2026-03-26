import ModalShell from "./ModalShell";

interface Props {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title = "Подтверждение", message, onConfirm, onCancel }: Props) {
  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-sm"
      actions={
        <>
          <button className="btn btn-sm" onClick={onCancel}>Отмена</button>
          <button className="btn btn-sm btn-error" onClick={onConfirm}>Удалить</button>
        </>
      }
    >
      <p className="text-sm">{message}</p>
    </ModalShell>
  );
}
