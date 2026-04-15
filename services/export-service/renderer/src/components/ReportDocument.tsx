import React from "react";
import type { ReportData, Heading, SectionMeta } from "../types.js";

// ── Section components (built-in fallbacks, overridden by DB templates) ────

function TitlePage({ data }: { data: ReportData }) {
  const r = data.report;
  const si = data.systemInfo;
  return (
    <div className="title-page">
      <h1>{r.name}</h1>
      <p>Тип: {r.report_type}</p>
      {si.dateStart && si.dateEnd && (
        <p>
          Период: {si.dateStart} — {si.dateEnd}
        </p>
      )}
    </div>
  );
}

function TOC({ headings }: { headings: Heading[] }) {
  return (
    <div className="toc">
      <h2>Оглавление</h2>
      <ol>
        {headings.map((h, i) => (
          <li key={i} style={{ marginLeft: `${(h.level - 1) * 1.5}em` }}>
            <a href={`#${h.id}`}>{h.title}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GeneralInfo({ data, chapterNum }: { data: ReportData; chapterNum?: number }) {
  const n = chapterNum ?? 1;
  const si = data.systemInfo;
  return (
    <section>
      <h2 className="in-toc" id="general-info">
        {n} Executive Summary
      </h2>
      <table>
        <tbody>
          <tr><td>Наименование АС</td><td>{si.asName}</td></tr>
          <tr><td>КЕ</td><td>{si.keId}</td></tr>
          <tr><td>URL</td><td>{si.url}</td></tr>
          <tr><td>Период</td><td>{si.dateStart} — {si.dateEnd}</td></tr>
          <tr><td>Сегмент</td><td>{si.segment}</td></tr>
          <tr>
            <td>Исполнители</td>
            <td>{si.executors.map((e) => e.name).join(", ")}</td>
          </tr>
        </tbody>
      </table>
      {si.software.length > 0 && (
        <>
          <h3>Используемое ПО</h3>
          <table>
            <thead>
              <tr><th>Название</th><th>Описание</th></tr>
            </thead>
            <tbody>
              {si.software.map((s, i) => (
                <tr key={i}><td>{s.name}</td><td>{s.description}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function TestResults({ data, chapterNum }: { data: ReportData; chapterNum?: number }) {
  const n = chapterNum ?? 2;
  const c = data.summary.counts;
  const levels = [
    { label: "Критичный", count: c.critical },
    { label: "Высокий", count: c.high },
    { label: "Средний", count: c.medium },
    { label: "Низкий", count: c.low },
    { label: "Информационный", count: c.info },
  ].filter((l) => l.count > 0);

  return (
    <section>
      <h2 className="in-toc" id="test-results">
        {n} Scope {"&"} Methodology
      </h2>
      <table>
        <thead>
          <tr><th>Уровень</th><th>Количество</th></tr>
        </thead>
        <tbody>
          {levels.map((l, i) => (
            <tr key={i}><td>{l.label}</td><td>{l.count}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function VulnerabilitySection({ data, chapterNum }: { data: ReportData; chapterNum?: number }) {
  const n = chapterNum ?? 3;
  const vulns = data.summary.vulnerabilities;
  if (!vulns.length) return null;

  return (
    <section>
      <h2 className="in-toc" id="vulnerabilities">
        {n} Proof of Concept
      </h2>
      {vulns.map((v, i) => (
        <div key={v.id} className="vulnerability">
          <h3 className="in-toc" id={`vuln-${i + 1}`}>
            {n}.{i + 1} {v.bug_name}
          </h3>
          <table>
            <tbody>
              <tr><td>Критичность</td><td>{v.bug_criticality}</td></tr>
              {v.cvss_score != null && (
                <tr><td>CVSS</td><td>{v.cvss_score}</td></tr>
              )}
              {v.cvss_vector && (
                <tr><td>CVSS-вектор</td><td>{v.cvss_vector}</td></tr>
              )}
            </tbody>
          </table>
          {v.bug_description && (
            <>
              <h4>Описание</h4>
              <div dangerouslySetInnerHTML={{ __html: v.bug_description }} />
            </>
          )}
          {v.reproduction_steps && (
            <>
              <h4>Шаги для повторения</h4>
              <div dangerouslySetInnerHTML={{ __html: v.reproduction_steps }} />
            </>
          )}
          {v.remediation && (
            <>
              <h4>Рекомендации</h4>
              <div dangerouslySetInnerHTML={{ __html: v.remediation }} />
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function ThreatClassification({ chapterNum }: { chapterNum?: number }) {
  const n = chapterNum ?? 4;
  return (
    <section>
      <h2 className="in-toc" id="threat-class">
        {n} Классификация уровня угрозы
      </h2>
      <table>
        <thead>
          <tr><th>Уровень</th><th>CVSS</th><th>Описание</th></tr>
        </thead>
        <tbody>
          <tr><td>Критичный</td><td>9.0–10.0</td><td>Компрометация данных, полный контроль</td></tr>
          <tr><td>Высокий</td><td>7.0–8.9</td><td>Значительный ущерб, частичный контроль</td></tr>
          <tr><td>Средний</td><td>4.0–6.9</td><td>Ограниченный ущерб</td></tr>
          <tr><td>Низкий</td><td>0.0–3.9</td><td>Минимальный риск</td></tr>
        </tbody>
      </table>
    </section>
  );
}

function Checklist({ data, chapterNum }: { data: ReportData; chapterNum?: number }) {
  const n = chapterNum ?? 5;
  const checks = data.checklist;
  if (!checks.length) return null;

  const STATUS_LABEL: Record<string, string> = {
    passed: "Выполнено",
    not_applicable: "Не применимо",
    not_tested: "Не выполнено",
  };

  return (
    <section className="checklist-section">
      <h2 className="in-toc" id="checklist">
        {n} Appendices
      </h2>
      <table>
        <thead>
          <tr><th>ID</th><th>Проверка</th><th>Категория</th><th>Результат</th></tr>
        </thead>
        <tbody>
          {checks.map((c, i) => (
            <tr key={i}>
              <td>{c.check_id}</td>
              <td>{c.name}</td>
              <td>{c.category}</td>
              <td><strong>{STATUS_LABEL[c.status] ?? c.status}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ── Section registry ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SectionComponentMap = Record<string, React.FC<any>>;

export const SECTION_COMPONENTS: SectionComponentMap = {
  title: ({ data }) => <TitlePage data={data} />,
  toc: ({ headings }) => <TOC headings={headings ?? []} />,
  general_info: ({ data, chapterNum }) => <GeneralInfo data={data} chapterNum={chapterNum} />,
  test_results: ({ data, chapterNum }) => <TestResults data={data} chapterNum={chapterNum} />,
  vulnerability: ({ data, chapterNum }) => <VulnerabilitySection data={data} chapterNum={chapterNum} />,
  threat_classification: ({ chapterNum }) => <ThreatClassification chapterNum={chapterNum} />,
  checklist: ({ data, chapterNum }) => <Checklist data={data} chapterNum={chapterNum} />,
};

// ── Chapter numbering ───────────────────────────────────────────────────────

function getChapterNumbers(sections: SectionMeta[]): Record<string, number> {
  const result: Record<string, number> = {};
  let num = 1;
  for (const s of sections) {
    if (s.isNumbered) {
      result[s.section] = num++;
    }
  }
  return result;
}

// ── Sections (used in pass 1 — heading collection, excludes title/toc) ─────

export function Sections({ data, sections, components }: {
  data: ReportData;
  sections: SectionMeta[];
  components?: SectionComponentMap;
}) {
  const map = components ?? SECTION_COMPONENTS;
  const chapters = getChapterNumbers(sections);
  const contentSections = sections.filter(
    (s) => s.section !== "title" && s.section !== "toc"
  );
  return (
    <>
      {contentSections.map((meta) => {
        const Component = map[meta.section];
        if (!Component) return null;
        return (
          <Component
            key={meta.section}
            data={data}
            chapterNum={chapters[meta.section]}
          />
        );
      })}
    </>
  );
}

// ── Root document (pass 2) ──────────────────────────────────────────────────

export function ReportDocument({ data, headings, sections, components }: {
  data: ReportData;
  headings: Heading[];
  sections: SectionMeta[];
  components?: SectionComponentMap;
}) {
  const map = components ?? SECTION_COMPONENTS;
  const chapters = getChapterNumbers(sections);
  return (
    <>
      {sections.map((meta) => {
        const { section, anchor } = meta;
        if (section === "toc") {
          const TocComp = map["toc"];
          return (
            <div key={section} className="page-break" id={anchor}>
              {TocComp ? <TocComp headings={headings} /> : <TOC headings={headings} />}
            </div>
          );
        }
        const Component = map[section];
        if (!Component) return null;
        return (
          <div key={section} className="page-break" id={anchor}>
            <Component data={data} headings={headings} chapterNum={chapters[section]} />
          </div>
        );
      })}
    </>
  );
}
