/**
 * Runtime TSX→JS compilation and component creation from DB template strings.
 * Uses sucrase for fast JSX transform without Babel overhead.
 */

import React from "react";
import { transform } from "sucrase";

/**
 * Compile a TSX template string into a React component function.
 *
 * The template must export a default function component, e.g.:
 *   export default function TitlePage({ data }) { return <div>...</div>; }
 *
 * The component receives props: { data, headings, vuln, index }
 */
export function compileTemplate(tsxCode: string): React.FC {
  try {
    // Transform TSX → JS (strip types + JSX → React.createElement)
    const { code: jsCode } = transform(tsxCode, {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "classic",
    });

    // Replace `export default function Name` → `const __component__ = function Name`
    // Replace `export default` (arrow/expression) → `const __component__ =`
    let wrapped = jsCode;
    wrapped = wrapped.replace(
      /export\s+default\s+function\s+(\w+)/,
      "const __component__ = function $1",
    );
    if (wrapped === jsCode) {
      // fallback: export default <expression>
      wrapped = wrapped.replace(
        /export\s+default\s+/,
        "const __component__ = ",
      );
    }

    // The compiled code uses `React.createElement(...)` calls.
    // We inject React as a parameter so it's available in scope.
    const fn = new Function(
      "React",
      `${wrapped}\nreturn typeof __component__ === 'function' ? __component__ : () => null;`,
    );

    // Execute to get the component function
    const Component = fn(React);

    // Return a wrapper that passes props through
    return (props: Record<string, unknown>) => {
      return React.createElement(Component, props);
    };
  } catch (err) {
    // On compile error, return a component that shows the error
    return () =>
      React.createElement(
        "pre",
        { style: { color: "red", padding: "1em", fontSize: "12px", whiteSpace: "pre-wrap" } },
        `Template compile error:\n${err}`,
      );
  }
}
