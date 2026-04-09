/**
 * Node.js entry point for React SSR rendering.
 *
 * Protocol: JSON on stdin → HTML on stdout.
 *
 * Input: { reportType, data, templates, globalCss, sectionOrder }
 *   - templates: Record<section, tsx_code> from DB
 *   - globalCss: the "styles" section content
 *   - data: ReportData object
 *   - sectionOrder: ordered section names
 *
 * Templates from DB are compiled at runtime via sucrase (TSX → JS → Function).
 * If a section has no DB template, the built-in default component is used.
 *
 * Output: Full HTML document string.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import type { RenderInput, Heading } from "./types.js";
import {
  ReportDocument,
  Sections,
  SECTION_COMPONENTS,
} from "./components/ReportDocument.js";
import { compileTemplate } from "./compile.js";

const DEFAULT_ORDER = [
  "title", "toc", "general_info", "test_results",
  "vulnerability", "checklist", "threat_classification",
];

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const input: RenderInput = JSON.parse(Buffer.concat(chunks).toString());
  const { data, globalCss, sectionOrder, templates } = input;

  const order = sectionOrder?.length
    ? sectionOrder.filter((s) => s !== "styles")
    : DEFAULT_ORDER;

  // Override section components with DB templates (if provided)
  const overrides: Record<string, React.FC<Record<string, unknown>>> = {};
  if (templates) {
    for (const [section, tsxCode] of Object.entries(templates)) {
      if (section === "styles" || !tsxCode) continue;
      overrides[section] = compileTemplate(tsxCode);
    }
  }

  // Merge: DB overrides take priority over built-in components
  const mergedComponents = { ...SECTION_COMPONENTS, ...overrides };

  // Pass 1: render sections to collect headings from HTML
  const sectionsHtml = renderToString(
    React.createElement(Sections, {
      data,
      sectionOrder: order,
      components: mergedComponents,
    })
  );

  // Extract headings from rendered HTML (h2/h3 with id attributes)
  const headings: Heading[] = [];
  const headingRe = /<h([23])[^>]*\bid="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
  let match;
  while ((match = headingRe.exec(sectionsHtml)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2];
    const title = match[3].replace(/<[^>]+>/g, "").trim();
    if (id && title) {
      headings.push({ id, title, level });
    }
  }

  // Pass 2: render full document with TOC
  const body = renderToString(
    React.createElement(ReportDocument, {
      data,
      headings,
      sectionOrder: order,
      components: mergedComponents,
    })
  );

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>${globalCss || ""}</style>
</head>
<body>${body}</body>
</html>`;

  process.stdout.write(html);
}

main().catch((err) => {
  process.stderr.write(String(err));
  process.exit(1);
});
