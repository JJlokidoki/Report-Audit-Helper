import { NavLink, useParams } from "react-router-dom";

const reportLinks = [
  { to: "system-info", label: "Сведения о системе", icon: "◈" },
  { to: "test-summary", label: "Результаты тестирования", icon: "◈" },
  { to: "vulnerabilities", label: "Описание результатов", icon: "◈" },
  { to: "checklist", label: "Чеклист безопасности", icon: "◈" },
];

const retestLinks = [
  { to: "retests/autotests", label: "Автотесты", icon: "◈" },
  { to: "retests/launch", label: "Запуск", icon: "◈" },
];

function SidebarLink({ to, label, delay }: { to: string; label: string; delay: number }) {
  const { id } = useParams();
  return (
    <NavLink
      to={`/reports/${id}/${to}`}
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

function SidebarSection({ title, links, startDelay }: { title: string; links: typeof reportLinks; startDelay: number }) {
  return (
    <div>
      <div className="px-4 py-2 text-[10px] font-mono tracking-[0.2em] uppercase text-base-content/35 select-none">
        {title}
      </div>
      {links.map((l, i) => (
        <SidebarLink key={l.to} to={l.to} label={l.label} delay={startDelay + i * 40} />
      ))}
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto">
      <nav className="py-4 space-y-2">
        <SidebarSection title="Отчёт" links={reportLinks} startDelay={0} />
        <div className="mx-4 border-t border-base-300/60" />
        <SidebarSection title="Ретесты" links={retestLinks} startDelay={200} />
      </nav>
    </aside>
  );
}
