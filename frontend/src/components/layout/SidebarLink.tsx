import { NavLink } from "react-router-dom";

interface Props {
  to: string;
  label: string;
  delay: number;
}

export default function SidebarLink({ to, label, delay }: Props) {
  return (
    <NavLink
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className={({ isActive }) =>
        `animate-sidebar-item flex items-center gap-2.5 px-4 py-2 text-sm border-l-2 transition-all duration-150 ${
          isActive
            ? "border-primary text-primary bg-primary/6 font-medium"
            : "border-transparent text-base-content/55 hover:text-base-content hover:border-base-content/20 hover:bg-base-300/30"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`font-mono text-[10px] ${isActive ? "text-primary" : "text-base-content/30"}`}>
            {isActive ? "▶" : "◇"}
          </span>
          <span className="leading-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}
