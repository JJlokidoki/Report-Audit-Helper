"""Default TSX templates for PDF export, seeded into DB on first startup."""

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
    "threat_classification",
    "checklist",
    "styles",
]

# Minimal starter templates — users customize via UI
_DEFAULT_CONTENT: dict[str, str] = {
    "title": """export default function TitlePage({ data }) {
  return (
    <div className="title-page">
      <h1>{data.report.name}</h1>
      <p>Тип: {data.report.report_type}</p>
      <p>Период: {data.systemInfo.dateStart} — {data.systemInfo.dateEnd}</p>
    </div>
  );
}""",
    "toc": """export default function TOC({ headings }) {
  return (
    <div className="toc">
      <h2>Оглавление</h2>
      <ol>
        {headings.map((h, i) => (
          <li key={i}><a href={"#" + h.id}>{h.title}</a></li>
        ))}
      </ol>
    </div>
  );
}""",
    "general_info": """export default function GeneralInfo({ data }) {
  const si = data.systemInfo;
  return (
    <section>
      <h2 className="in-toc" id="general-info">1. Общая информация</h2>
      <table>
        <tbody>
          <tr><td>Наименование АС</td><td>{si.asName}</td></tr>
          <tr><td>КЕ</td><td>{si.keId}</td></tr>
          <tr><td>URL</td><td>{si.url}</td></tr>
          <tr><td>Период</td><td>{si.dateStart} — {si.dateEnd}</td></tr>
          <tr><td>Сегмент</td><td>{si.segment}</td></tr>
          <tr><td>Исполнители</td><td>{si.executors.map(e => e.name).join(", ")}</td></tr>
        </tbody>
      </table>
      <h3>Используемое ПО</h3>
      <table>
        <thead><tr><th>Название</th><th>Описание</th></tr></thead>
        <tbody>
          {si.software.map((s, i) => (
            <tr key={i}><td>{s.name}</td><td>{s.description}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}""",
    "test_results": """export default function TestResults({ data }) {
  const c = data.summary.counts;
  return (
    <section>
      <h2 className="in-toc" id="test-results">2. Результаты тестирования</h2>
      <table>
        <thead><tr><th>Уровень</th><th>Количество</th></tr></thead>
        <tbody>
          <tr><td>Критичный</td><td>{c.critical}</td></tr>
          <tr><td>Высокий</td><td>{c.high}</td></tr>
          <tr><td>Средний</td><td>{c.medium}</td></tr>
          <tr><td>Низкий</td><td>{c.low}</td></tr>
          <tr><td>Информационный</td><td>{c.info}</td></tr>
        </tbody>
      </table>
    </section>
  );
}""",
    "vulnerability": """export default function VulnerabilitySection({ vuln, index }) {
  return (
    <section className="vulnerability">
      <h3 className="in-toc" id={"vuln-" + index}>3.{index}. {vuln.bug_name}</h3>
      <table>
        <tbody>
          <tr><td>Критичность</td><td>{vuln.bug_criticality}</td></tr>
          <tr><td>CVSS</td><td>{vuln.cvss_score}</td></tr>
          <tr><td>CVSS-вектор</td><td>{vuln.cvss_vector}</td></tr>
        </tbody>
      </table>
      <h4>Описание</h4>
      <div dangerouslySetInnerHTML={{ __html: vuln.bug_description || "" }} />
      <h4>Шаги для повторения</h4>
      <div dangerouslySetInnerHTML={{ __html: vuln.reproduction_steps || "" }} />
      <h4>Рекомендации</h4>
      <div dangerouslySetInnerHTML={{ __html: vuln.remediation || "" }} />
    </section>
  );
}""",
    "threat_classification": """export default function ThreatClassification() {
  return (
    <section>
      <h2 className="in-toc" id="threat-class">4. Классификация уровня угрозы</h2>
      <table>
        <thead><tr><th>Уровень</th><th>CVSS</th><th>Описание</th></tr></thead>
        <tbody>
          <tr><td>Критичный</td><td>9.0-10.0</td><td>Компрометация данных, полный контроль</td></tr>
          <tr><td>Высокий</td><td>7.0-8.9</td><td>Значительный ущерб, частичный контроль</td></tr>
          <tr><td>Средний</td><td>4.0-6.9</td><td>Ограниченный ущерб</td></tr>
          <tr><td>Низкий</td><td>0.0-3.9</td><td>Минимальный риск</td></tr>
        </tbody>
      </table>
    </section>
  );
}""",
    "checklist": """export default function Checklist({ data }) {
  const checks = data.checklist;
  const categories = [...new Set(checks.map(c => c.category))];
  return (
    <section className="checklist-section">
      <h2 className="in-toc" id="checklist">5. Чеклист</h2>
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
              <td><strong>{c.status}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}""",
    "styles": """@page {
  size: A4 portrait;
  margin: 2.5cm 2cm;
  @top-center {
    content: string(report-title);
    font-size: 9pt;
    color: #666;
  }
  @bottom-right {
    content: "Стр. " counter(page) " из " counter(pages);
    font-size: 9pt;
    color: #666;
  }
}

@page title {
  margin: 0;
  @top-center { content: none; }
  @bottom-right { content: none; }
}

@page landscape {
  size: A4 landscape;
}

body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #1a1a1a;
}

.title-page {
  page: title;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.page-break + .page-break {
  break-before: page;
}

.checklist-section {
  page: landscape;
  break-before: page;
}

h1, h2, h3, h4 { break-after: avoid; }
table { break-inside: avoid; width: 100%; border-collapse: collapse; margin: 1em 0; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 10pt; }
th { background: #f5f5f5; font-weight: bold; }

.toc ol { list-style: none; padding: 0; }
.toc li { margin: 4px 0; }
.toc a { text-decoration: none; color: #333; }
""",
}


async def seed_pdf_templates(db: AsyncSession) -> None:
    """Create default PDF templates for report types that have none."""
    result = await db.execute(select(PdfTemplate))
    existing = {(t.report_type, t.section) for t in result.scalars().all()}

    added = 0
    for rt in REPORT_TYPES:
        for section in SECTIONS:
            if (rt, section) not in existing:
                db.add(PdfTemplate(
                    report_type=rt,
                    section=section,
                    content=_DEFAULT_CONTENT.get(section, ""),
                    css=None,
                ))
                added += 1

    if added:
        await db.commit()
