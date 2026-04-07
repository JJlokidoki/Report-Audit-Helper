import React, { createContext, useContext } from "react";
import type { ReportData, Heading } from "../types.js";

// ── Heading collection context ──────────────────────────────────────────────

const HeadingContext = createContext<Heading[] | null>(null);

export function HeadingCollector({
  headings,
  children,
}: {
  headings: Heading[];
  children: React.ReactNode;
}) {
  return (
    <HeadingContext.Provider value={headings}>
      {children}
    </HeadingContext.Provider>
  );
}

/** Use in section components to register a heading for TOC */
export function useHeading(id: string, title: string, level: number) {
  const headings = useContext(HeadingContext);
  if (headings) {
    headings.push({ id, title, level });
  }
}

// ── Section components ──────────────────────────────────────────────────────

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

function GeneralInfo({ data }: { data: ReportData }) {
  const si = data.systemInfo;
  return (
    <section>
      <h2 className="in-toc" id="general-info">
        1. Общая информация
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

function TestResults({ data }: { data: ReportData }) {
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
        2. Результаты тестирования
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

function VulnerabilitySection({ data }: { data: ReportData }) {
  const vulns = data.summary.vulnerabilities;
  if (!vulns.length) return null;

  return (
    <section>
      <h2 className="in-toc" id="vulnerabilities">
        3. Описание результатов тестирования
      </h2>
      {vulns.map((v, i) => (
        <div key={v.id} className="vulnerability">
          <h3 className="in-toc" id={`vuln-${i + 1}`}>
            3.{i + 1}. {v.bug_name}
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

function ThreatClassification() {
  return (
    <section>
      <h2 className="in-toc" id="threat-class">
        4. Классификация уровня угрозы
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

function Checklist({ data }: { data: ReportData }) {
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
        5. Чеклист
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

// ── Sections (used in both passes) ──────────────────────────────────────────

export function Sections({ data }: { data: ReportData }) {
  return (
    <>
      <GeneralInfo data={data} />
      <TestResults data={data} />
      <VulnerabilitySection data={data} />
      <ThreatClassification />
      <Checklist data={data} />
    </>
  );
}

// ── Root document (pass 2) ──────────────────────────────────────────────────

export function ReportDocument({
  data,
  headings,
}: {
  data: ReportData;
  headings: Heading[];
}) {
  return (
    <>
      <div className="page-break" id="title-page">
        <TitlePage data={data} />
      </div>
      <div className="page-break" id="toc">
        <TOC headings={headings} />
      </div>
      <div className="page-break">
        <Sections data={data} />
      </div>
    </>
  );
}
