import { Outlet, useParams, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SettingsSidebar from "./SettingsSidebar";
import { useTheme } from "../../hooks/useTheme";

export default function Layout() {
  const { id } = useParams();
  const location = useLocation();
  const hasReport = !!id;
  const isSettings = location.pathname.startsWith("/settings");
  const { theme, toggle } = useTheme();

  return (
    <div className="flex flex-col h-screen bg-base-100">
      <Navbar theme={theme} onThemeToggle={toggle} />
      <div className="flex flex-1 overflow-hidden">
        {isSettings && <SettingsSidebar />}
        {hasReport && <Sidebar />}
        <main key={location.pathname} className="animate-page flex-1 overflow-y-auto p-6 dot-grid">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
