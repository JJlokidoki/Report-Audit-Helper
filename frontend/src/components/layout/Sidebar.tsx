import { NavLink, useParams } from "react-router-dom";

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

function SidebarLink({ to, label }: { to: string; label: string }) {
  const { id } = useParams();
  return (
    <li>
      <NavLink
        to={`/reports/${id}/${to}`}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {label}
      </NavLink>
    </li>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-full bg-base-200 p-4">
      <ul className="menu menu-sm gap-1">
        <li className="menu-title">Отчёт</li>
        {reportLinks.map((l) => (
          <SidebarLink key={l.to} {...l} />
        ))}
        <li className="menu-title mt-4">Ретесты</li>
        {retestLinks.map((l) => (
          <SidebarLink key={l.to} {...l} />
        ))}
      </ul>
    </aside>
  );
}
