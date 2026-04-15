/**
 * TypeScript declarations for Monaco editor autocomplete in PDF template editor.
 * Mirrors renderer/src/types.ts — provides intellisense for `data`, `headings`, `vuln`, `index`.
 */

export const REPORT_DATA_DTS = `
declare interface ReportData {
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
    executors: { name: string; email: string | null }[];
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

declare interface Vulnerability {
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

declare interface SecurityCheck {
  check_id: string;
  category: string;
  name: string;
  status: string;
  notes: string | null;
}

declare interface Heading {
  id: string;
  title: string;
  level: number;
}

declare const data: ReportData;
declare const headings: Heading[];
declare const vuln: Vulnerability;
declare const index: number;
`;

export function registerSnippets(monaco: typeof import("monaco-editor")) {
  const lang = "html";

  monaco.languages.registerCompletionItemProvider(lang, {
    provideCompletionItems: () => {
      const s = (
        label: string,
        insertText: string,
        doc: string,
      ) => ({
        label,
        insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: doc,
        range: undefined as unknown as import("monaco-editor").IRange,
      });

      return {
        suggestions: [
          s(
            "data.report",
            "data.report.${1|name,report_type,id|}",
            "Данные отчёта: name, report_type, id",
          ),
          s(
            "data.systemInfo",
            "data.systemInfo.${1|asName,keId,url,dateStart,dateEnd,segment,description,goal|}",
            "Системная информация",
          ),
          s(
            "data.summary.counts",
            "data.summary.counts.${1|critical,high,medium,low,info|}",
            "Счётчики уязвимостей по критичности",
          ),
          s(
            "vuln-loop",
            [
              "{data.summary.vulnerabilities.map((v, i) => (",
              "  <div key={v.id}>",
              '    <h3>{v.bug_name}</h3>',
              '    <div dangerouslySetInnerHTML={{ __html: v.bug_description || "" }} />',
              "  </div>",
              "))}",
            ].join("\n"),
            "Цикл по уязвимостям",
          ),
          s(
            "checklist-table",
            [
              "<table>",
              "  <thead><tr><th>ID</th><th>Проверка</th><th>Результат</th></tr></thead>",
              "  <tbody>",
              "    {data.checklist.map((c, i) => (",
              "      <tr key={i}><td>{c.check_id}</td><td>{c.name}</td><td>{c.status}</td></tr>",
              "    ))}",
              "  </tbody>",
              "</table>",
            ].join("\n"),
            "Таблица чеклиста",
          ),
          s(
            "severity-table",
            [
              "<table>",
              "  <thead><tr><th>Уровень</th><th>Количество</th></tr></thead>",
              "  <tbody>",
              "    <tr><td>Критичный</td><td>{data.summary.counts.critical}</td></tr>",
              "    <tr><td>Высокий</td><td>{data.summary.counts.high}</td></tr>",
              "    <tr><td>Средний</td><td>{data.summary.counts.medium}</td></tr>",
              "    <tr><td>Низкий</td><td>{data.summary.counts.low}</td></tr>",
              "  </tbody>",
              "</table>",
            ].join("\n"),
            "Таблица критичности",
          ),
          s(
            "software-table",
            [
              "<table>",
              "  <thead><tr><th>Название</th><th>Описание</th></tr></thead>",
              "  <tbody>",
              "    {data.systemInfo.software.map((s, i) => (",
              "      <tr key={i}><td>{s.name}</td><td>{s.description}</td></tr>",
              "    ))}",
              "  </tbody>",
              "</table>",
            ].join("\n"),
            "Таблица ПО",
          ),
          s(
            "html-content",
            '<div dangerouslySetInnerHTML={{ __html: ${1:v.bug_description} || "" }} />',
            "Вставка HTML-контента (из TipTap)",
          ),
          s(
            "page-break",
            '<div className="page-break" />',
            "Разрыв страницы",
          ),
          s(
            "section-heading",
            '<h2 className="in-toc" id="${1:section-id}">${2:Заголовок}</h2>',
            "Заголовок секции (попадёт в TOC)",
          ),
          s(
            "executors-list",
            "{data.systemInfo.executors.map(e => e.name).join(\", \")}",
            "Список исполнителей через запятую",
          ),
        ],
      };
    },
  });
}
