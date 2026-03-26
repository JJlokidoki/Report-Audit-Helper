import SidebarLink from "./SidebarLink";

const settingsLinks = [
  { to: "/settings/ai", label: "Настройки AI" },
  { to: "/settings/directories", label: "Справочники" },
  { to: "/settings/templates", label: "Шаблоны" },
  { to: "/settings/archive", label: "Архив" },
];

export default function SettingsSidebar() {
  return (
    <aside className="w-56 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto">
      <nav className="py-4 space-y-2">
        <div>
          <div className="px-4 py-2 label-section">
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
