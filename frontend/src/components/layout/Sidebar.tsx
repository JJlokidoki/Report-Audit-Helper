import { useParams } from "react-router-dom";
import SidebarLink from "./SidebarLink";

const reportLinks = [
  { to: "system-info", label: "Сведения о системе" },
  { to: "test-summary", label: "Результаты тестирования" },
  { to: "vulnerabilities", label: "Описание результатов" },
  { to: "checklist", label: "Чеклист безопасности" },
];

const retestLinks = [
  { to: "retests/autotests", label: "Автотесты" },
  { to: "retests/launch", label: "Запуск" },
];

function SidebarSection({ title, links, startDelay }: { title: string; links: typeof reportLinks; startDelay: number }) {
  const { id } = useParams();
  return (
    <div>
      <div className="px-4 py-2 label-section">
        {title}
      </div>
      {links.map((l, i) => (
        <SidebarLink key={l.to} to={`/reports/${id}/${l.to}`} label={l.label} delay={startDelay + i * 40} />
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
