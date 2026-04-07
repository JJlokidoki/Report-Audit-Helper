/**
 * Node.js entry point for React SSR rendering.
 *
 * Protocol: JSON on stdin → HTML on stdout.
 *
 * Input: { reportType, data, templates, globalCss }
 *   - templates: Record<section, tsx_code> from DB
 *   - globalCss: the "styles" section content
 *   - data: ReportData object
 *
 * For now, templates from DB are NOT dynamically compiled (would need Babel/SWC).
 * Instead, we use the built-in default components and ignore DB templates.
 * DB template editing will be supported via a future Babel runtime compiler.
 *
 * Output: Full HTML document string.
 */

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import type { RenderInput, ReportData, Heading } from "./types.js";
import { ReportDocument, Sections, HeadingCollector } from "./components/ReportDocument.js";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const input: RenderInput = JSON.parse(Buffer.concat(chunks).toString());
  const { data, globalCss } = input;

  // Pass 1: collect headings
  const headings: Heading[] = [];
  renderToString(
    createElement(HeadingCollector, {
      headings,
      children: createElement(Sections, { data }),
    })
  );

  // Pass 2: render full document with TOC
  const body = renderToString(
    createElement(ReportDocument, { data, headings })
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
