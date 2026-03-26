import SidebarLink from "./SidebarLink";

const bzoneLinks = [
  { to: "/bzone/reports", label: "Уязвимости" },
  { to: "/bzone/autotests", label: "Автотесты" },
];

export default function BZoneSidebar() {
  return (
    <aside className="w-56 shrink-0 bg-base-200 border-r border-base-300 overflow-y-auto">
      <nav className="py-4 space-y-2">
        <div>
          <div className="px-4 py-2 label-section">
            BZone
          </div>
          {bzoneLinks.map((l, i) => (
            <SidebarLink key={l.to} to={l.to} label={l.label} delay={i * 40} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
