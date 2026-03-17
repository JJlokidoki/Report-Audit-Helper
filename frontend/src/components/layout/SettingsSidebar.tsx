import { NavLink } from "react-router-dom";

const settingsLinks = [
  { to: "/settings/ai", label: "Настройки AI" },
  { to: "/settings/directories", label: "Справочники" },
];

function SidebarLink({ to, label, delay }: { to: string; label: string; delay: number }) {
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

export default function SettingsSidebar() {
  return (
    <aside className="w-56 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto">
      <nav className="py-4 space-y-2">
        <div>
          <div className="px-4 py-2 text-[10px] font-mono tracking-[0.2em] uppercase text-base-content/35 select-none">
            Настройки
          </div>
          {settingsLinks.map((l, i) => (
            <SidebarLink key={l.to} to={l.to} label={l.label} delay={i * 40} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
