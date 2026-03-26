const SIZE_CLASSES = {
  xs: "text-[9px] px-1 py-0.5",
  sm: "text-[10px] px-1.5 py-0.5",
  default: "text-[11px] px-1.5 py-0.5",
} as const;

interface TagProps {
  children: React.ReactNode;
  colorClass: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function Tag({ children, colorClass, size = "default", className }: TagProps) {
  return (
    <span className={`inline-block font-mono tracking-widest border ${SIZE_CLASSES[size]} ${colorClass} ${className ?? ""}`}>
      {children}
    </span>
  );
}
