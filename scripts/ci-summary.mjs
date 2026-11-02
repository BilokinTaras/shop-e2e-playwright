// Turns a Playwright JSON report into the run summary used by CI: a Markdown block for the job summary
// (stdout) and, with --site, an index.html for GitHub Pages that links the full HTML report.
// Usage: node scripts/ci-summary.mjs <report.json> [--site <dir>] [--title <text>] [--run-url <url>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args[0];
const opt = (name) => {
  const i = args.indexOf(name);
  return i > 0 ? args[i + 1] : undefined;
};
if (!file) {
  console.error(
    'usage: node scripts/ci-summary.mjs <report.json> [--site <dir>] [--title <t>] [--run-url <u>]',
  );
  process.exit(2);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats ?? {};
const total = expected + unexpected + flaky + skipped;

// Per-project counts, and the titles of flaky and failed tests, walking the suite tree.
const projects = new Map();
const flakyTitles = [];
const failedTitles = [];
const walk = (suite, trail) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const p = projects.get(t.projectName) ?? { runs: 0, failed: 0, flaky: 0 };
      p.runs += 1;
      if (t.status === 'unexpected') {
        p.failed += 1;
        failedTitles.push(`${t.projectName}: ${[...trail, spec.title].join(' › ')}`);
      }
      if (t.status === 'flaky') {
        p.flaky += 1;
        flakyTitles.push(`${t.projectName}: ${[...trail, spec.title].join(' › ')}`);
      }
      projects.set(t.projectName, p);
    }
  }
  for (const child of suite.suites ?? []) walk(child, child.title ? [...trail, child.title] : trail);
};
for (const suite of report.suites ?? []) walk(suite, []);

const title = opt('--title') ?? 'Playwright run';
const runUrl = opt('--run-url');
const minutes = (duration / 60000).toFixed(1);
const md = [
  `### ${title}`,
  '',
  `**${total} runs:** ${expected} passed (expected failures of open defects included), ${unexpected} failed, ` +
    `${flaky} flaky, ${skipped} skipped · ${minutes} min`,
  '',
  '| Project | Runs | Failed | Flaky |',
  '|---|---:|---:|---:|',
  ...[...projects.entries()].sort().map(([n, p]) => `| ${n} | ${p.runs} | ${p.failed} | ${p.flaky} |`),
  '',
  ...(failedTitles.length ? ['**Failed**', '', ...failedTitles.map((t) => `- ${t}`), ''] : []),
  ...(flakyTitles.length ? ['**Flaky** (passed on retry)', '', ...flakyTitles.map((t) => `- ${t}`), ''] : []),
];
console.log(md.join('\n'));

const site = opt('--site');
if (site) {
  mkdirSync(site, { recursive: true });
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows = [...projects.entries()]
    .sort()
    .map(([n, p]) => `<tr><td>${esc(n)}</td><td>${p.runs}</td><td>${p.failed}</td><td>${p.flaky}</td></tr>`)
    .join('');
  const list = (items) =>
    items.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>none</p>';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.3rem .6rem;text-align:right}
td:first-child,th:first-child{text-align:left}</style></head><body>
<h1>${esc(title)} — ${new Date(report.stats?.startTime ?? Date.now()).toISOString().slice(0, 10)}</h1>
<p><strong>${total} runs:</strong> ${expected} passed, ${unexpected} failed, ${flaky} flaky, ${skipped} skipped · ${minutes} min</p>
<p><a href="report/index.html">Full HTML report</a>${runUrl ? ` · <a href="${esc(runUrl)}">workflow run</a>` : ''}</p>
<p>"Passed" includes tests marked <code>test.fail()</code> for open defects: they pass while the defect exists.</p>
<table><tr><th>Project</th><th>Runs</th><th>Failed</th><th>Flaky</th></tr>${rows}</table>
<h2>Failed</h2>${list(failedTitles)}<h2>Flaky</h2>${list(flakyTitles)}
</body></html>`;
  writeFileSync(path.join(site, 'index.html'), html);
}
