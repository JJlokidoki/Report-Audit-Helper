interface Props {
  message: string;
  className?: string;
}

export default function EmptyState({ message, className }: Props) {
  return (
    <div className={`text-sm text-base-content/40 py-8 text-center font-mono ${className ?? ""}`}>
      // {message}
    </div>
  );
}
