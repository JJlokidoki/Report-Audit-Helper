import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Layout from "./components/layout/Layout";
import ReportListPage from "./pages/ReportListPage";
import SystemInfoPage from "./pages/SystemInfoPage";
import TestSummaryPage from "./pages/TestSummaryPage";
import VulnerabilityListPage from "./pages/VulnerabilityListPage";
import VulnerabilityEditPage from "./pages/VulnerabilityEditPage";
import ChecklistPage from "./pages/ChecklistPage";
import AISettingsPage from "./pages/AISettingsPage";
import DirectoriesPage from "./pages/DirectoriesPage";
import TemplatesPage from "./pages/TemplatesPage";
import ArchiveSettingsPage from "./pages/ArchiveSettingsPage";
import ArchivePage from "./pages/ArchivePage";
import PlaceholderPage from "./components/common/PlaceholderPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ReportListPage />} />
            <Route path="settings">
              <Route index element={<Navigate to="ai" replace />} />
              <Route path="ai" element={<AISettingsPage />} />
              <Route path="directories" element={<DirectoriesPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="archive" element={<ArchiveSettingsPage />} />
            </Route>
            <Route path="archive" element={<ArchivePage />} />
            <Route path="reports/:id">
              <Route index element={<Navigate to="system-info" replace />} />
              <Route path="system-info" element={<SystemInfoPage />} />
              <Route path="test-summary" element={<TestSummaryPage />} />
              <Route path="vulnerabilities" element={<VulnerabilityListPage />} />
              <Route path="vulnerabilities/:vid" element={<VulnerabilityEditPage />} />
              <Route path="checklist" element={<ChecklistPage />} />
              <Route path="retests/autotests" element={<PlaceholderPage />} />
              <Route path="retests/launch" element={<PlaceholderPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
