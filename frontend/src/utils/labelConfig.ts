import type { SoftwareLabel, ReportType, VulnTemplateLabel } from "../types";

export const SOFTWARE_LABEL_STYLES: Record<SoftwareLabel, { text: string; style: string }> = {
  web:     { text: "WEB",       style: "bg-primary/15 text-primary border-primary/50" },
  mobile:  { text: "Мобильные", style: "bg-accent/15 text-accent border-accent/50" },
  network: { text: "Сети",      style: "bg-info/15 text-info border-info/50" },
  ai:      { text: "AI",        style: "bg-secondary/15 text-secondary border-secondary/50" },
  iot:     { text: "IoT",       style: "bg-warning/15 text-warning border-warning/50" },
  general: { text: "Общие",     style: "bg-base-content/8 text-base-content/50 border-base-content/20" },
};

export const SOFTWARE_LABEL_LIST: { value: SoftwareLabel; text: string; style: string }[] =
  (Object.entries(SOFTWARE_LABEL_STYLES) as [SoftwareLabel, { text: string; style: string }][]).map(
    ([value, { text, style }]) => ({ value, text, style }),
  );

export const REPORT_TYPE_STYLES: Record<ReportType, { text: string; style: string }> = {
  web:     { text: "WEB",     style: "text-primary border-primary/40 bg-primary/8" },
  ios:     { text: "iOS",     style: "text-accent border-accent/40 bg-accent/8" },
  android: { text: "Android", style: "text-success border-success/40 bg-success/8" },
  ai:      { text: "AI",      style: "text-secondary border-secondary/40 bg-secondary/8" },
  iot:     { text: "IoT",     style: "text-warning border-warning/40 bg-warning/8" },
};

export const VULN_TEMPLATE_LABEL_STYLES: Record<VulnTemplateLabel, { text: string; style: string }> = {
  web:     { text: "WEB",     style: "bg-primary/15 text-primary border-primary/50" },
  mobile:  { text: "Мобильные", style: "bg-accent/15 text-accent border-accent/50" },
  network: { text: "Сети",    style: "bg-info/15 text-info border-info/50" },
  api:     { text: "API",     style: "bg-success/15 text-success border-success/50" },
  auth:    { text: "Аутент.", style: "bg-secondary/15 text-secondary border-secondary/50" },
  crypto:  { text: "Крипто",  style: "bg-warning/15 text-warning border-warning/50" },
  config:  { text: "Конфиг",  style: "bg-error/15 text-error/70 border-error/40" },
  general: { text: "Общие",   style: "bg-base-content/8 text-base-content/50 border-base-content/20" },
};

export const VULN_TEMPLATE_LABEL_LIST: { value: VulnTemplateLabel; text: string; style: string }[] =
  (Object.entries(VULN_TEMPLATE_LABEL_STYLES) as [VulnTemplateLabel, { text: string; style: string }][]).map(
    ([value, { text, style }]) => ({ value, text, style }),
  );

/** Какие лейблы ПО рекомендованы для каждого типа отчёта */
export const REPORT_TYPE_RECOMMENDED_LABELS: Record<ReportType, SoftwareLabel[]> = {
  web: ["web", "network", "general"],
  ios: ["mobile", "general"],
  android: ["mobile", "general"],
  ai: ["ai", "general"],
  iot: ["iot", "network", "general"],
};
