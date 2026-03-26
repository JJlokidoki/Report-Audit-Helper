interface Props {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function PageHeader({ title, subtitle, className }: Props) {
  return (
    <div className={className}>
      <h1 className="font-display text-2xl font-semibold tracking-wide text-base-content mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-base-content/45 font-mono">// {subtitle}</p>}
    </div>
  );
}
