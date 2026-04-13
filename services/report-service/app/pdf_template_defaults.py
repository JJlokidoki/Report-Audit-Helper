"""Default TSX templates for PDF export, seeded into DB on first startup."""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PdfTemplate

REPORT_TYPES = ["web", "ios", "android", "ai", "iot"]

SECTIONS = [
    "title",
    "toc",
    "general_info",
    "test_results",
    "vulnerability",
    "checklist",
    "threat_classification",
    "styles",
]


@dataclass(frozen=True)
class SectionDefault:
    section: str
    label: str
    anchor: str
    is_system: bool
    is_numbered: bool

# Default templates for all report types (based on report-preview.html)
_DEFAULT_CONTENT: dict[str, str] = {
    "title": """export default function TitlePage({ data }) {
  const si = data.systemInfo;
  return (
    <div className="title-page">
      <div className="title-content">
        <div style={{ flex: 1 }} />
        <div className="title-middle">
          <h1 className="title-company">BUG HUNTERS</h1>
          <p className="title-report-type">Vulnerability Assessment Report</p>
          <p className="title-target">АС «{si.asName || data.report.name}»</p>
        </div>
        <div style={{ flex: 1 }} />
        <table className="title-bottom-table">
          <tbody>
            <tr><td>Дата проведения тестирования</td><td>Исполнитель</td></tr>
            <tr>
              <td>{si.dateStart} - {si.dateEnd}</td>
              <td>{si.executors.map(e => e.name).join(", ")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}""",
    "toc": """export default function TOC({ headings }) {
  return (
    <div className="toc section">
      <h2>Оглавление</h2>
      <table className="toc-table">
        <tbody>
          {headings.map((h, i) => (
            <tr key={i} className={h.level <= 2 ? "toc-l1" : "toc-l2"}>
              <td className="toc-num" />
              <td className="toc-name"><a href={"#" + h.id}>{h.title}</a></td>
              <td className="toc-pg"><a href={"#" + h.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}""",
    "general_info": """export default function GeneralInfo({ data, chapterNum }) {
  const n = chapterNum || 1;
  const si = data.systemInfo;
  const c = data.summary.counts;
  const vulns = data.summary.vulnerabilities;
  const SEVERITY_COLOR = {
    critical: "var(--critical)", 
    high: "var(--high)",
    medium: "var(--medium)", 
    low: "var(--low)", 
    info: "var(--info)",
  };
  return (
    <div className="section">
      <h2 id="general-info">{n} Executive Summary</h2>

      <h3>{n}.1 Данные об объекте тестирования</h3>
      {si.description ? (
        <div dangerouslySetInnerHTML={{ __html: si.description }} />
      ) : (
        <p>Тестирование безопасности AI-ассистента, интегрированного в АС «{si.asName}».</p>
      )}

      <h3 id="test-results">{n}.2 Результаты тестирования</h3>
      <p>В период с {si.dateStart} по {si.dateEnd} проведено тестирование безопасности AI-ассистента «{si.asName}».</p>

      {vulns.length > 0 && (
        <>
          <p>В ходе тестирования исполнителем были обнаружены следующие уязвимости:</p>
          <ul>
            {vulns.map((v, i) => (
              <li key={i}>{v.bug_name}</li>
            ))}
          </ul>
          <p>По результатам проведения анализа защищённости были обнаружены:</p>
          <ul>
            {c.critical > 0 && <li>уязвимости с уровнем критичности <strong style={{ color: "var(--critical)" }}>Критичный</strong> - {c.critical};</li>}
            {c.high > 0 && <li>уязвимости с уровнем критичности <strong style={{ color: "var(--high)" }}>Высокий</strong> - {c.high};</li>}
            {c.medium > 0 && <li>уязвимости с уровнем критичности <strong style={{ color: "var(--medium)" }}>Средний</strong> - {c.medium};</li>}
            {c.low > 0 && <li>уязвимости с уровнем критичности <strong style={{ color: "var(--low)" }}>Низкий</strong> - {c.low};</li>}
            {c.info > 0 && <li>уязвимости с уровнем критичности <strong style={{ color: "var(--info)" }}>Информационный</strong> - {c.info}.</li>}
          </ul>
        </>
      )}
    </div>
  );
}""",
    "test_results": """export default function TestResults({ data, chapterNum }) {
  const n = chapterNum || 2;
  const si = data.systemInfo;
  return (
    <div className="section">
      <h2 id="scope">{n} Scope {"&"} Methodology</h2>

      <h3>{n}.1 Область тестирования</h3>
      <table className="kv-table">
        <tbody>
          <tr><td>Наименование AI-агента:</td><td>{si.asName}</td></tr>
          <tr><td>URL-адрес тестового стенда:</td><td>{si.url}</td></tr>
          <tr><td>Сегмент сети</td><td>{si.segment}</td></tr>
          <tr><td>Исполнители:</td><td>{si.executors.map(e => e.name).join(", ")}</td></tr>
        </tbody>
      </table>

      <h3>{n}.2 Методика тестирования</h3>
      <p>В качестве методического руководства для тестирования защищенности используется стандарт OWASP AITG (AI Testing Guide).</p>
      <p>Сценарии тестирования разбиты на группы по следующим направлениям:</p>
      <ul>
        <li>тестирование AI-приложений;</li>
        <li>тестирование AI-моделей;</li>
        <li>тестирование AI-инфраструктуры;</li>
        <li>тестирование данных в AI.</li>
      </ul>

      <table className="kv-table">
        <tbody>
          <tr><td>Цель</td><td>{si.goal || "Получение финансовой или другой личной выгоды, нанесение любого вреда организации или её клиентам."}</td></tr>
          <tr><td>Уровень квалификации</td><td>{si.qualificationLevel || "Высококвалифицированный специалист"}</td></tr>
          <tr><td>Уровень доступа</td><td>{si.accessLevel || "Из сети Интернет"}</td></tr>
          <tr><td>Уровень знаний о системе</td><td>{si.knowledgeLevel || "URL-адрес тестового стенда"}</td></tr>
          <tr><td>Условия тестирования</td><td>{si.testConditions || 'Методом «серого» ящика'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}""",
    "vulnerability": """export default function VulnerabilitySection({ data, chapterNum }) {
  const n = chapterNum || 3;
  const SEVERITY_COLOR = {
    critical: "var(--critical)", 
    high: "var(--high)",
    medium: "var(--medium)", 
    low: "var(--low)", 
    info: "var(--info)",
  };
  const vulns = data.summary.vulnerabilities;
  if (!vulns.length) return null;
  return (
    <div className="section">
      <h2 id="vulnerabilities">{n} Proof of Concept</h2>
      {vulns.map((v, i) => (
        <div key={v.id}>
          <h3 id={"vuln-" + (i + 1)}>{n}.{i + 1} {v.bug_name}</h3>
          <table className="kv-table">
            <tbody>
              <tr><td>Критичность</td><td><strong style={{ color: SEVERITY_COLOR[v.bug_criticality] || "inherit" }}>{v.bug_criticality}</strong></td></tr>
              {v.cvss_score != null && <tr><td>CVSS Score</td><td>{v.cvss_score}</td></tr>}
              {v.cvss_vector && <tr><td>CVSS Vector</td><td>{v.cvss_vector}</td></tr>}
            </tbody>
          </table>
          {v.bug_description && (
            <><h4>Описание</h4><div dangerouslySetInnerHTML={{ __html: v.bug_description }} /></>
          )}
          {v.reproduction_steps && (
            <><h4>Шаги для воспроизведения</h4><div dangerouslySetInnerHTML={{ __html: v.reproduction_steps }} /></>
          )}
          {v.remediation && (
            <><h4>Рекомендации по устранению</h4><div dangerouslySetInnerHTML={{ __html: v.remediation }} /></>
          )}
        </div>
      ))}
    </div>
  );
}""",
    "checklist": """export default function Checklist({ data, chapterNum }) {
  const n = chapterNum || 4;
  const checks = data.checklist;
  if (!checks.length) return null;

  const STATUS_LABEL = {
    passed: "Выполнено", not_applicable: "Не применимо", not_tested: "Не выполнено",
  };

  const groups = [];
  let lastCat = null;
  checks.forEach(c => {
    if (c.category !== lastCat) {
      groups.push({ category: c.category, checks: [] });
      lastCat = c.category;
    }
    groups[groups.length - 1].checks.push(c);
  });

  return (
    <div className="checklist-section" id="appendices">
      <table className="checklist-table">
        <tbody>
          <tr className="checklist-title-row"><td colSpan={4}><span className="fake-h2">{n} Appendices</span></td></tr>
          <tr className="checklist-title-row"><td colSpan={4} id="checklist"><span className="fake-h3">{n}.1 Чек-лист проведения тестирования</span></td></tr>
          <tr className="checklist-title-row"><td colSpan={4} style={{ textAlign: "right" }}><span className="table-caption" style={{ margin: 0 }}>Таблица 1 Методика тестирования AITG</span></td></tr>
          {groups.map((g, gi) => (
            <React.Fragment key={gi}>
              <tr className="checklist-group-header"><td colSpan={4}>{g.category}</td></tr>
              <tr>
                <th>Идентификатор</th>
                <th>Краткое описание</th>
                <th>Задачи тестирования</th>
                <th>Результаты тестирования</th>
              </tr>
              {g.checks.map((c, ci) => (
                <tr key={ci}>
                  <td>{c.check_id}</td>
                  <td>{c.name}</td>
                  <td>{c.goal || c.short_description || ""}</td>
                  <td><strong>{STATUS_LABEL[c.status] || c.status}</strong>{c.notes ? <><br /><br />{c.notes}</> : null}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}""",
    "threat_classification": """export default function ThreatClassification({ data, chapterNum }) {
  const n = chapterNum || 5;
  const si = data.systemInfo;
  return (
    <div className="section-portrait">
      <h3 id="appendix-software">{n}.1 Используемое программное обеспечение</h3>
      {si.software.length > 0 && (
        <table className="kv-table">
          <thead><tr><th>Инструмент</th><th>Описание</th></tr></thead>
          <tbody>
            {si.software.map((s, i) => (
              <tr key={i}><td>{s.name}</td><td>{s.description}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 id="threat-class">{n}.2 Классификация уровней опасности уязвимостей по шкале AIVSS</h3>
      <ul>
        <li><strong style={{ color: "var(--critical)" }}>Критичный (9.0-10.0)</strong> - уязвимости, позволяющие напрямую манипулировать выводом или поведением модели, извлекать конфиденциальные обучающие данные, вызывать деградацию модели.</li>
        <li><strong style={{ color: "var(--high)" }}>Высокий (7.0-8.9)</strong> - уязвимости, приводящие к значительному искажению выводов модели, раскрытию чувствительной информации, обходу этических ограничений.</li>
        <li><strong style={{ color: "var(--medium)" }}>Средний (4.0-6.9)</strong> - уязвимости, не приводящие напрямую к компрометации, но предоставляющие информацию или возможности для комбинированных атак.</li>
        <li><strong style={{ color: "var(--low)" }}>Низкий (0.0-3.9)</strong> - уязвимости минимального риска, свидетельствующие о недостатках в защите или документации AI-системы.</li>
      </ul>
    </div>
  );
}""",
    "styles": """@font-face { font-family: "Montserrat"; font-weight: 300; src: url(fonts/Montserrat-Light.ttf); }
@font-face { font-family: "Montserrat"; font-weight: 400; src: url(fonts/Montserrat-Regular.ttf); }
@font-face { font-family: "Montserrat"; font-weight: 400; font-style: italic; src: url(fonts/Montserrat-Italic.ttf); }
@font-face { font-family: "Montserrat"; font-weight: 500; src: url(fonts/Montserrat-Medium.ttf); }
@font-face { font-family: "Montserrat"; font-weight: 600; src: url(fonts/Montserrat-SemiBold.ttf); }
@font-face { font-family: "Montserrat"; font-weight: 700; src: url(fonts/Montserrat-Bold.ttf); }
@font-face { font-family: "Montserrat"; font-weight: 800; src: url(fonts/Montserrat-ExtraBold.ttf); }

/* ── Variables ─────────────────────────────────────────────────── */
:root {
  --primary: #1a2332;
  --primary-light: #2c3e50;
  --accent: #e74c3c;
  --accent-dark: #c0392b;
  --gray-50: #f8f9fa;
  --gray-100: #f1f3f5;
  --gray-200: #e9ecef;
  --gray-300: #dee2e6;
  --gray-400: #ced4da;
  --gray-500: #adb5bd;
  --gray-600: #868e96;
  --gray-700: #495057;
  --gray-800: #343a40;
  --gray-900: #212529;
  --critical: #c00000;
  --critical-bg: #fef2f2;
  --high: red;
  --high-bg: #fff7ed;
  --medium: #c55911;
  --medium-bg: #fffbeb;
  --low: #00b050;
  --low-bg: #eff6ff;
  --info: #6b7280;
  --info-bg: #f9fafb;
  --passed: #16a34a;
  --not-tested: #9ca3af;
  --not-applicable: #6b7280;
}

/* ── Page rules ────────────────────────────────────────────────── */
@page {
  size: A4 portrait;
  margin: 2.5cm 2cm 2.5cm 2.5cm;

  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center {
    content: url(bot.png);
    height: 1cm;
    vertical-align: bottom;
    padding-top: 0.5cm;
  }
  @bottom-right {
    content: counter(page);
    font-size: 9pt;
    color: var(--gray-500);
    font-family: "Montserrat", sans-serif;
  }
}

@page title-page {
  margin: 0;
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center { content: none; }
  @bottom-right { content: none; }
}

@page landscape {
  size: A4 landscape;
  margin: 2cm 2cm 2cm 2.5cm;
}

/* ── Base typography ───────────────────────────────────────────── */
html {
  font-family: "Montserrat", sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: var(--gray-900);
}

body {
  margin: 0;
  padding: 0;
}

h1, h2, h3, h4, h5 {
  break-after: avoid;
  color: #0f4761;
  line-height: 1.3;
}

h2 {
  font-size: 16pt;
  margin-top: 0;
  margin-bottom: 0.8em;
  padding-bottom: 0.3em;
  border-bottom: 2px solid #0f4761;
  string-set: report-title content();
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
  color: #0f4761;
  border-bottom: none;
}

h4 {
  font-size: 11pt;
  margin-top: 1em;
  margin-bottom: 0.4em;
  color: #0f4761;
}

p {
  margin: 0.4em 0;
  text-align: justify;
  orphans: 3;
  widows: 3;
}

code {
  font-family: "Cascadia Code", "Consolas", "Courier New", monospace;
  font-size: 9pt;
  background: var(--gray-100);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--accent-dark);
}

/* ── Title page ────────────────────────────────────────────────── */
.title-page {
  page: title-page;
  width: 210mm;
  height: 297mm;
  background: #151c28 url(pic.jpeg) no-repeat top center;
  background-size: 100% auto;
  color: #ffffff;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.title-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 2.5cm;
  box-sizing: border-box;
}

.title-middle {
  text-align: center;
}

.title-company {
  font-size: 36pt;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
  margin: 0;
  line-height: 1.1;
}

.title-report-type {
  font-size: 20pt;
  font-weight: 300;
  color: #8fa4b8;
  margin: 0.8cm 0 0 0;
  letter-spacing: 0.02em;
  text-align: center;
}

.title-target {
  font-size: 18pt;
  font-weight: 700;
  color: #ffffff;
  margin: 2.5cm 0 0 0;
  padding-top: 0.5cm;
  line-height: 1.4;
  text-align: center;
}

.title-bottom-table {
  margin-top: 0.5cm;
  width: 100%;
  border-collapse: collapse;
}

.title-bottom-table td {
  border: none;
  text-align: center;
  padding: 0.3cm 0.5cm;
  background: none;
  width: 50%;
}

.title-bottom-table tr:first-child td {
  border-bottom: 1px solid #2e3a4a !important;
  font-size: 8.5pt;
  color: #8fa4b8;
  padding-bottom: 0.25cm;
}

.title-bottom-table tr:last-child td {
  font-size: 10pt;
  font-weight: 500;
  color: #ffffff;
  padding-top: 0.25cm;
  line-height: 1.5;
  border-bottom: none;
}

.title-bottom-table tr:nth-child(even) td {
  background: transparent;
}

/* ── TOC ───────────────────────────────────────────────────────── */
.toc {
  break-before: page;
  break-after: page;
}

.toc h2 {
  margin-bottom: 1cm;
}

.toc-table {
  width: 100%;
  border-collapse: collapse;
  border: none;
  font-size: 10pt;
}

.toc-table td {
  padding: 5px 0;
  border: none !important;
  border-bottom: none !important;
  background: transparent !important;
  vertical-align: baseline;
}

.toc-table tr:nth-child(even) {
  background: transparent !important;
}

.toc-table tr:last-child td {
  border-bottom: none !important;
}

.toc-table .toc-num {
  width: 1em;
  text-align: left;
  color: var(--gray-800);
}

.toc-table .toc-name {
  color: var(--gray-900);
}

.toc-table .toc-pg {
  width: 2.5em;
  text-align: right;
  color: var(--gray-700);
}

.toc-table .toc-l1 td {
  font-weight: 700;
  padding-top: 8px;
  padding-bottom: 4px;
  font-size: 10.5pt;
}

.toc-table .toc-l2 td {
  font-weight: 400;
  padding-left: 1em;
  font-size: 10pt;
}

.toc-table a {
  color: inherit;
  text-decoration: none;
}

/* Auto page numbers in TOC */
.toc-pg a::after {
  content: target-counter(attr(href, url), page);
}

/* ── Tables ────────────────────────────────────────────────────── */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0 1.2em;
  font-size: 10pt;
  break-inside: avoid;
}

thead th {
  background: var(--primary);
  color: white;
  font-weight: 600;
  padding: 8px 12px;
  text-align: left;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

thead th:first-child {
  border-radius: 4px 0 0 0;
}

thead th:last-child {
  border-radius: 0 4px 0 0;
}

tbody td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--gray-200);
  vertical-align: top;
}

tbody tr:nth-child(even) {
  background: var(--gray-50);
}

tbody tr:last-child td {
  border-bottom: 2px solid var(--primary);
}

/* Reset global table styles for title page table */
.title-bottom-table tbody td,
.title-bottom-table td {
  border: none !important;
  border-bottom: none !important;
  background: transparent !important;
  vertical-align: middle;
}

.title-bottom-table tbody tr:nth-child(even),
.title-bottom-table tr:nth-child(even) {
  background: transparent !important;
}

.title-bottom-table tbody tr:last-child td {
  border-bottom: none !important;
}

/* ── Section wrappers ──────────────────────────────────────────── */
.section {
  break-before: page;
}

.section + .section {
  break-before: page;
}

.page-break + .page-break {
  break-before: page;
}

/* ── Key-value table ───────────────────────────────────────────── */
.kv-table {
  border: 1px solid var(--gray-800);
}

.kv-table td {
  border: 1px solid var(--gray-800);
  padding: 8px 12px;
  vertical-align: top;
}

.kv-table td:first-child {
  width: 28%;
}

.kv-table th {
  background: transparent;
  color: inherit;
  font-weight: 700;
  border: 1px solid var(--gray-800);
  text-transform: none;
  letter-spacing: normal;
  font-size: 10pt;
}

.kv-table tr:nth-child(even) {
  background: transparent !important;
}

.kv-table tr:last-child td {
  border-bottom: 1px solid var(--gray-800) !important;
}

/* ── Centered table caption ───────────────────────────────────── */
.table-caption {
  text-align: right;
  font-weight: 600;
  margin: 1em 0 0.3em;
  font-size: 10pt;
}

/* ── Screenshot figure ─────────────────────────────────────────── */
.screenshot {
  text-align: center;
  margin: 0.8em 0;
  break-inside: avoid;
}

.screenshot img {
  max-width: 100%;
  border: 1px solid var(--gray-300);
}

.screenshot-caption {
  text-align: center;
  font-size: 9pt;
  color: var(--gray-600);
  margin-top: 0.3em;
  font-style: italic;
}

/* ── Example block ─────────────────────────────────────────────── */
.example-block {
  background: #fef3ee;
  border-left: 3px solid #e8956a;
  padding: 0.4cm 0.6cm;
  margin: 0.5em 0 0.8em;
  font-size: 10pt;
  line-height: 1.5;
}

.example-block p {
  margin: 0;
  text-align: left;
}

/* ── Checklist (landscape) ─────────────────────────────────────── */
.checklist-section {
  page: landscape;
}

@page landscape {
  size: A4 landscape;
  margin: 2cm 2cm 2.5cm 2.5cm;

  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center {
    content: url(bot.png);
    height: 1cm;
    vertical-align: bottom;
    padding-top: 0.5cm;
  }
  @bottom-right {
    content: counter(page);
    font-size: 9pt;
    color: var(--gray-500);
    font-family: "Montserrat", sans-serif;
  }
}

.checklist-table {
  font-size: 9pt;
  border: none;
}

.checklist-table tr {
  break-inside: avoid;
}

.checklist-table th {
  background: transparent;
  color: inherit;
  font-weight: 700;
  text-transform: none;
  letter-spacing: normal;
  font-size: 9pt;
  border: 1px solid var(--gray-800);
  text-align: center;
}

.checklist-table td {
  border: 1px solid var(--gray-800);
  vertical-align: top;
}

.checklist-table tr:nth-child(even) {
  background: transparent !important;
}

.checklist-table tr:last-child td {
  border-bottom: 1px solid var(--gray-800) !important;
}

.checklist-group-header td {
  text-align: center;
  font-weight: 700;
  font-size: 10pt;
  border-top: 1px solid var(--gray-800) !important;
}

.checklist-title-row td {
  border: none !important;
  background: transparent !important;
  padding: 0 0 0.3cm 0 !important;
}

.fake-h2 {
  font-size: 16pt;
  font-weight: 700;
  color: #0f4761;
  display: block;
  padding-bottom: 0.3em;
  border-bottom: 2px solid #0f4761;
}

.fake-h3 {
  font-size: 14pt;
  font-weight: 600;
  color: #0f4761;
  display: block;
  padding-top: 0.3cm;
}

.checklist-table a {
  color: #0f4761;
  text-decoration: underline;
}

/* ── Post-checklist (back to portrait) ─────────────────────────── */
.section-portrait {
  page: auto;
  break-before: page;
}

/* ── Utilities ─────────────────────────────────────────────────── */
.text-center { text-align: center; }
.text-right  { text-align: right; }
.mt-0 { margin-top: 0; }
.mb-0 { margin-bottom: 0; }
.no-break { break-inside: avoid; }
""",
}


DEFAULT_SECTIONS: list[SectionDefault] = [
    SectionDefault("title",                 "Титульная страница",   "title-page",      True,  False),
    SectionDefault("toc",                   "Оглавление",           "toc",             True,  False),
    SectionDefault("general_info",          "Общая информация",     "general-info",    False, True),
    SectionDefault("test_results",          "Результаты тестирования", "test-results", False, True),
    SectionDefault("vulnerability",         "Уязвимости",           "vulnerabilities", False, True),
    SectionDefault("checklist",             "Чеклист",              "checklist",       False, True),
    SectionDefault("threat_classification", "Классификация угроз",  "threat-class",    False, True),
    SectionDefault("styles",                "CSS стили",            "",                True,  False),
]

_BY_SLUG: dict[str, SectionDefault] = {d.section: d for d in DEFAULT_SECTIONS}


def _get_defaults(_report_type: str) -> dict[str, str]:
    """Return default content dict for a given report type."""
    return _DEFAULT_CONTENT


async def seed_pdf_templates(db: AsyncSession) -> None:
    """Create default PDF templates and backfill metadata for existing rows.

    - Inserts missing rows for new report_types at first startup.
    - Backfills label/anchor/is_system/is_numbered/is_builtin on existing rows.
    - Never overwrites user-edited content or css.
    """
    result = await db.execute(select(PdfTemplate))
    rows = {(t.report_type, t.section): t for t in result.scalars().all()}

    changed = False
    for rt in REPORT_TYPES:
        defaults = _get_defaults(rt)
        for order, d in enumerate(DEFAULT_SECTIONS):
            key = (rt, d.section)
            if key in rows:
                # Backfill metadata on existing row (never touch content)
                row = rows[key]
                if not row.label:
                    row.label = d.label
                    changed = True
                if not row.anchor:
                    row.anchor = d.anchor
                    changed = True
                if row.is_system != d.is_system:
                    row.is_system = d.is_system
                    changed = True
                if not row.is_builtin:
                    row.is_builtin = True
                    changed = True
            else:
                db.add(PdfTemplate(
                    report_type=rt,
                    section=d.section,
                    label=d.label,
                    anchor=d.anchor,
                    content=defaults.get(d.section, ""),
                    css=None,
                    sort_order=order,
                    is_system=d.is_system,
                    is_numbered=d.is_numbered,
                    is_builtin=True,
                ))
                changed = True

    if changed:
        await db.commit()
