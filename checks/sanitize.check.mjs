/**
 * Security pass for the article sanitizer (step 10 of the handoff).
 *
 * Runs the hostile payloads the checklist names through the *real*
 * `sanitizeArticleHtml` — the same function the save action and the public
 * renderer call — and asserts on what comes back. No test framework and no new
 * dependency: Node 24 strips the types, and `.selftest/alias.mjs` resolves the
 * `@/` alias.
 */
import assert from "node:assert/strict";
import { sanitizeArticleHtml, htmlToPlainText } from "../src/lib/content/sanitize.ts";
import { isSafeUrl, isSafeFontUrl } from "../src/lib/content/schema.ts";

let passed = 0;
const failures = [];

function check(name, dirty, assertions) {
  const clean = sanitizeArticleHtml(dirty);
  try {
    assertions(clean);
    passed++;
  } catch (error) {
    failures.push({ name, dirty, clean, message: error.message });
  }
}

const forbids =
  (...needles) =>
  (clean) => {
    for (const needle of needles) {
      assert.ok(
        !clean.toLowerCase().includes(needle.toLowerCase()),
        `output still contains ${JSON.stringify(needle)} — got: ${clean}`,
      );
    }
  };

/* ---- script / markup injection ------------------------------------------ */

check("inline <script> is removed", '<p>hi</p><script>alert(1)</script>', (clean) => {
  forbids("<script", "alert(1)")(clean);
  assert.equal(clean, "<p>hi</p>");
});

check(
  "</script> inside text cannot break out",
  '<p>close me: </script><script>alert(1)</script></p>',
  forbids("<script", "alert(1)"),
);

check("<iframe> is removed", '<p>a</p><iframe src="https://evil.test"></iframe>', forbids("<iframe"));
check("<object>/<embed> are removed", '<object data="x"></object><embed src="x">', forbids("<object", "<embed"));
check("<form> and inputs it owns are removed", '<form action="/x"><button>go</button></form>', forbids("<form", "<button"));
check("<style> block is removed", "<style>body{display:none}</style><p>a</p>", forbids("<style", "display:none"));
check("<svg> payload is removed", '<svg onload="alert(1)"><script>alert(2)</script></svg>', forbids("<svg", "onload", "alert"));
check("<base> cannot be injected", '<base href="https://evil.test/">', forbids("<base"));
check("<link>/<meta> cannot be injected", '<link rel="stylesheet" href="x"><meta http-equiv="refresh" content="0">', forbids("<link", "<meta"));

/* ---- event handlers ------------------------------------------------------ */

check("onerror on an image is stripped", '<img src="https://x.test/a.png" onerror="alert(1)">', forbids("onerror", "alert(1)"));
check("onclick on a paragraph is stripped", '<p onclick="alert(1)">t</p>', forbids("onclick", "alert(1)"));
check("onmouseover on a span is stripped", '<span onmouseover="alert(1)">t</span>', forbids("onmouseover"));
check("ONERROR in caps is stripped", '<img src="https://x.test/a.png" ONERROR="alert(1)">', forbids("onerror"));

/* ---- javascript: and friends -------------------------------------------- */

check("javascript: href loses the link", '<a href="javascript:alert(1)">click</a>', (clean) => {
  forbids("javascript:", "<a")(clean);
  assert.ok(clean.includes("click"), `link text should survive — got: ${clean}`);
});

check(
  "javascript: smuggled with a tab loses the link",
  '<a href="java\tscript:alert(1)">click</a>',
  forbids("javascript:", "<a"),
);

check("vbscript: href loses the link", '<a href="vbscript:msgbox(1)">click</a>', forbids("vbscript:", "<a"));
check("data:text/html href loses the link", '<a href="data:text/html;base64,PHNjcmlwdD4=">click</a>', forbids("data:text/html", "<a"));
check("javascript: image src is dropped", '<img src="javascript:alert(1)">', forbids("javascript:", "<img"));

/* ---- CSS injection ------------------------------------------------------- */

check("font-family: url(...) is dropped", '<p style="font-family: url(https://evil.test/x)">t</p>', forbids("url("));
check("expression() is dropped", '<p style="width: expression(alert(1))">t</p>', forbids("expression"));
check("background-image is not an allowed property", '<p style="background-image: url(https://evil.test/x)">t</p>', forbids("background-image", "url("));
check("position: fixed is not an allowed value", '<p style="position: fixed">t</p>', forbids("position"));
check("declaration smuggling via a quote break is dropped", '<p style="color: red&quot;;background-image:url(x)">t</p>', forbids("background-image", "url("));
check("-moz-binding is dropped", '<p style="-moz-binding: url(https://evil.test/x)">t</p>', forbids("moz-binding", "url("));

/* ---- things that must SURVIVE ------------------------------------------- */

check("a normal link survives with safe rel", '<a href="https://example.test" target="_blank">x</a>', (clean) => {
  assert.ok(clean.includes('href="https://example.test"'), clean);
  assert.ok(clean.includes("noopener"), `target=_blank must gain noopener — got: ${clean}`);
  assert.ok(clean.includes("noreferrer"), `target=_blank must gain noreferrer — got: ${clean}`);
});

check("allowed inline styles survive", '<p style="color: #ff0000; text-align: center">t</p>', (clean) => {
  assert.ok(clean.includes("color"), clean);
  assert.ok(clean.includes("center"), clean);
});

check("a task-list checkbox is forced disabled", '<input type="checkbox" checked>', (clean) => {
  assert.ok(clean.includes("disabled"), `checkbox must be disabled — got: ${clean}`);
});

check("code language class survives", '<pre><code class="language-ts">const a = 1</code></pre>', (clean) => {
  assert.ok(clean.includes("language-ts"), clean);
});

check("a foreign class is scrubbed", '<code class="evil">x</code>', forbids('class="evil"'));

check("an empty document collapses to nothing", "<p></p>", (clean) => assert.equal(clean, ""));

/* ---- helpers used elsewhere in the pipeline ----------------------------- */

const urlCases = [
  ["javascript:alert(1)", false],
  ["JaVaScRiPt:alert(1)", false],
  ["java\nscript:alert(1)", false],
  [" javascript:alert(1)", false],
  ["vbscript:x", false],
  ["data:text/html,<script>", false],
  ["file:///etc/passwd", false],
  ["https://example.test/a", true],
  ["mailto:a@b.test", true],
  ["tel:+123", true],
  ["/blog/post", true],
  ["#anchor", true],
  ["//cdn.example.test/x.png", true],
];
for (const [value, expected] of urlCases) {
  try {
    assert.equal(isSafeUrl(value), expected, `isSafeUrl(${JSON.stringify(value)})`);
    passed++;
  } catch (error) {
    failures.push({ name: `isSafeUrl ${JSON.stringify(value)}`, message: error.message });
  }
}

const fontCases = [
  ["https://fonts.gstatic.com/s/x.woff2", true],
  ["https://example.test/x.css", true],
  ["http://example.test/x.woff2", false],
  ["javascript:alert(1)", false],
  ["https://example.test/x.html", false],
];
for (const [value, expected] of fontCases) {
  try {
    assert.equal(isSafeFontUrl(value), expected, `isSafeFontUrl(${JSON.stringify(value)})`);
    passed++;
  } catch (error) {
    failures.push({ name: `isSafeFontUrl ${JSON.stringify(value)}`, message: error.message });
  }
}

try {
  assert.equal(htmlToPlainText("<p>a<br>b</p><p>c</p>"), "a b c");
  passed++;
} catch (error) {
  failures.push({ name: "htmlToPlainText", message: error.message });
}

/* ---- report -------------------------------------------------------------- */

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length}`);
  for (const f of failures) {
    console.log(`\n  ${f.name}\n    ${f.message}`);
    if (f.clean !== undefined) console.log(`    output: ${f.clean}`);
  }
  process.exit(1);
}
console.log("all sanitizer assertions passed");
