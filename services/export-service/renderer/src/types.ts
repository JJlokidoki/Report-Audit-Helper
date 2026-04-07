export interface ReportData {
  report: {
    id: number;
    name: string;
    report_type: string;
  };
  systemInfo: {
    asName: string | null;
    keId: string | null;
    url: string | null;
    dateStart: string | null;
    dateEnd: string | null;
    segment: string | null;
    description: string | null;
    goal: string | null;
    qualificationLevel: string | null;
    accessLevel: string | null;
    knowledgeLevel: string | null;
    testConditions: string | null;
    executors: { name: string }[];
    software: { name: string; description: string | null }[];
  };
  summary: {
    counts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    vulnerabilities: Vulnerability[];
  };
  checklist: SecurityCheck[];
}

export interface Vulnerability {
  id: number;
  bug_name: string;
  bug_criticality: string;
  bug_description: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  reproduction_steps: string | null;
  remediation: string | null;
  automation_level: string;
}

export interface SecurityCheck {
  check_id: string;
  category: string;
  name: string;
  status: string;
  notes: string | null;
}

export interface Heading {
  id: string;
  title: string;
  level: number;
}

export interface RenderInput {
  reportType: string;
  data: ReportData;
  templates: Record<string, string>;
  globalCss: string;
}
