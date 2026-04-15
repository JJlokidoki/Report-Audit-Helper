/**
 * Node.js entry point for React SSR rendering.
 *
 * Protocol: JSON on stdin → HTML on stdout.
 *
 * Input: RenderInput
 *   - reportType: string
 *   - data: ReportData
 *   - templates: Record<section, tsx_code> from DB
 *   - globalCss: the "styles" section content
 *   - sections: SectionMeta[]  (preferred)
 *   - sectionOrder: string[]   (legacy — synthesized to SectionMeta[] if present)
 *
 * Templates from DB are compiled at runtime via sucrase (TSX → JS → Function).
 * If a section has no DB template and no built-in, it is skipped.
 *
 * Output: Full HTML document string.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import type { RenderInput, SectionMeta, Heading } from "./types.js";
import {
  ReportDocument,
  Sections,
  SECTION_COMPONENTS,
} from "./components/ReportDocument.js";
import { compileTemplate } from "./compile.js";

// Legacy anchors for sectionOrder fallback — kept for backward compatibility
// with callers that still send sectionOrder instead of sections.
const LEGACY_ANCHORS: Record<string, string> = {
  title: "title-page",
  toc: "toc",
  general_info: "general-info",
  test_results: "test-results",
  vulnerability: "vulnerabilities",
  threat_classification: "threat-class",
  checklist: "checklist",
};
const LEGACY_NON_NUMBERED = new Set(["title", "toc", "styles"]);

function synthesizeMeta(sectionOrder: string[]): SectionMeta[] {
  return sectionOrder
    .filter((s) => s !== "styles")
    .map((s) => ({
      section: s,
      anchor: LEGACY_ANCHORS[s] ?? s.replace(/_/g, "-"),
      isNumbered: !LEGACY_NON_NUMBERED.has(s),
      hasBuiltin: s in SECTION_COMPONENTS,
    }));
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const input: RenderInput = JSON.parse(Buffer.concat(chunks).toString());
  const { data, globalCss, templates } = input;

  // Resolve section metadata — prefer `sections`, fall back to legacy `sectionOrder`
  const sections: SectionMeta[] = input.sections?.length
    ? input.sections.filter((m) => m.section !== "styles")
    : synthesizeMeta(input.sectionOrder ?? []);

  // Override section components with DB templates (if provided)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overrides: Record<string, React.FC<any>> = {};
  if (templates) {
    for (const [section, tsxCode] of Object.entries(templates)) {
      if (section === "styles" || !tsxCode.trim()) continue;
      overrides[section] = compileTemplate(tsxCode);
    }
  }

  // Merge: DB overrides take priority over built-in components
  const mergedComponents = { ...SECTION_COMPONENTS, ...overrides };

  // Filter out sections that have no rendering source (no DB template and no built-in)
  const resolvableSections = sections.filter(
    (m) => m.section in mergedComponents
  );

  // Pass 1: render sections to collect headings from HTML
  const sectionsHtml = renderToString(
    React.createElement(Sections, {
      data,
      sections: resolvableSections,
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
      sections: resolvableSections,
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
