import client from "./client";
import type {
  Report,
  ReportListItem,
  SystemInfo,
  Vulnerability,
  TestSummary,
  SecurityCheck,
  Executor,
  Software,
} from "../types";

// Reports
export const getReports = (reportType?: string) =>
  client.get<ReportListItem[]>("/reports", { params: reportType ? { report_type: reportType } : {} }).then((r) => r.data);

export const getReport = (id: number) =>
  client.get<Report>(`/reports/${id}`).then((r) => r.data);

export const createReport = (data: { name: string; report_type: string }) =>
  client.post<Report>("/reports", data).then((r) => r.data);

export const updateReport = (id: number, data: { name?: string }) =>
  client.put<Report>(`/reports/${id}`, data).then((r) => r.data);

export const deleteReport = (id: number) =>
  client.delete(`/reports/${id}`);

// System Info
export const getSystemInfo = (reportId: number) =>
  client.get<SystemInfo>(`/reports/${reportId}/system-info`).then((r) => r.data);

export const updateSystemInfo = (reportId: number, data: Partial<SystemInfo>) =>
  client.put<SystemInfo>(`/reports/${reportId}/system-info`, data).then((r) => r.data);

export const setExecutors = (reportId: number, executorIds: number[]) =>
  client.put<SystemInfo>(`/reports/${reportId}/system-info/executors`, { executor_ids: executorIds }).then((r) => r.data);

export const setSoftware = (reportId: number, softwareIds: number[]) =>
  client.put<SystemInfo>(`/reports/${reportId}/system-info/software`, { software_ids: softwareIds }).then((r) => r.data);

// Vulnerabilities
export const getVulnerabilities = (reportId: number) =>
  client.get<Vulnerability[]>(`/reports/${reportId}/vulnerabilities`).then((r) => r.data);

export const getVulnerability = (reportId: number, vid: number) =>
  client.get<Vulnerability>(`/reports/${reportId}/vulnerabilities/${vid}`).then((r) => r.data);

export const createVulnerability = (reportId: number, data: Partial<Vulnerability>) =>
  client.post<Vulnerability>(`/reports/${reportId}/vulnerabilities`, data).then((r) => r.data);

export const updateVulnerability = (reportId: number, vid: number, data: Partial<Vulnerability>) =>
  client.put<Vulnerability>(`/reports/${reportId}/vulnerabilities/${vid}`, data).then((r) => r.data);

export const deleteVulnerability = (reportId: number, vid: number) =>
  client.delete(`/reports/${reportId}/vulnerabilities/${vid}`);

export const reorderVulnerabilities = (reportId: number, orders: { id: number; sort_order: number }[]) =>
  client.put(`/reports/${reportId}/vulnerabilities/reorder`, { orders });

// Test Summary
export const getTestSummary = (reportId: number) =>
  client.get<TestSummary>(`/reports/${reportId}/test-summary`).then((r) => r.data);

// Checklist
export const getChecklist = (reportId: number, params?: { status?: string; category?: string }) =>
  client.get<SecurityCheck[]>(`/reports/${reportId}/checklist`, { params }).then((r) => r.data);

export const updateCheck = (reportId: number, checkId: string, data: { status?: string; notes?: string }) =>
  client.put<SecurityCheck>(`/reports/${reportId}/checklist/${checkId}`, data).then((r) => r.data);

// Executors
export const getExecutors = () =>
  client.get<Executor[]>("/executors").then((r) => r.data);

export const createExecutor = (data: { name: string; position?: string; organization?: string }) =>
  client.post<Executor>("/executors", data).then((r) => r.data);

export const deleteExecutor = (id: number) =>
  client.delete(`/executors/${id}`);

// Software
export const getSoftwareList = () =>
  client.get<Software[]>("/software").then((r) => r.data);

export const createSoftware = (data: { name: string; version?: string }) =>
  client.post<Software>("/software", data).then((r) => r.data);

export const deleteSoftware = (id: number) =>
  client.delete(`/software/${id}`);
