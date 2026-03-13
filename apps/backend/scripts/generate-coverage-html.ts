/**
 * Converts an lcov.info file into a standalone HTML coverage report.
 *
 * Usage:
 *   bun run scripts/generate-coverage-html.ts [options]
 *
 * Options (via env vars or CLI args):
 *   --input   / LCOV_INPUT    Path to lcov.info        (default: coverage/lcov.info)
 *   --output  / LCOV_OUTPUT   Output HTML path          (default: coverage/html/index.html)
 *   --title   / LCOV_TITLE    Report title              (default: "Test Coverage Report")
 *   --target  / LCOV_TARGET   Coverage target percent   (default: 80)
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, resolve } from "path";

// --- Config ---

interface Config {
  input: string;
  output: string;
  title: string;
  target: number;
}

function parseConfig(): Config {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
  };

  return {
    input: flag("input") ?? process.env.LCOV_INPUT ?? "coverage/lcov.info",
    output: flag("output") ?? process.env.LCOV_OUTPUT ?? "coverage/html/index.html",
    title: flag("title") ?? process.env.LCOV_TITLE ?? "Test Coverage Report",
    target: Number(flag("target") ?? process.env.LCOV_TARGET ?? 80),
  };
}

// --- LCOV Parser ---

interface FileCoverage {
  file: string;
  linesFound: number;
  linesHit: number;
  functionsFound: number;
  functionsHit: number;
}

const LCOV_FIELDS: Record<string, keyof Omit<FileCoverage, "file">> = {
  LF: "linesFound",
  LH: "linesHit",
  FNF: "functionsFound",
  FNH: "functionsHit",
};

function parseLcov(content: string): FileCoverage[] {
  const records: FileCoverage[] = [];
  let current: FileCoverage | null = null;

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      current = {
        file: line.slice(3).replace(/\\/g, "/"),
        linesFound: 0,
        linesHit: 0,
        functionsFound: 0,
        functionsHit: 0,
      };
    } else if (line === "end_of_record" && current) {
      records.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const field = LCOV_FIELDS[line.slice(0, colonIdx)];
      if (field) current[field] = parseInt(line.slice(colonIdx + 1), 10);
    }
  }
  return records;
}

// --- Aggregation helpers ---

interface CoverageStats {
  linesFound: number;
  linesHit: number;
  functionsFound: number;
  functionsHit: number;
  linePct: number;
  funcPct: number;
}

function aggregate(records: FileCoverage[]): CoverageStats {
  const linesFound = records.reduce((s, r) => s + r.linesFound, 0);
  const linesHit = records.reduce((s, r) => s + r.linesHit, 0);
  const functionsFound = records.reduce((s, r) => s + r.functionsFound, 0);
  const functionsHit = records.reduce((s, r) => s + r.functionsHit, 0);
  return {
    linesFound,
    linesHit,
    functionsFound,
    functionsHit,
    linePct: linesFound ? (linesHit / linesFound) * 100 : 100,
    funcPct: functionsFound ? (functionsHit / functionsFound) * 100 : 100,
  };
}

function groupByDirectory(records: FileCoverage[]): [string, FileCoverage[]][] {
  const groups = new Map<string, FileCoverage[]>();
  for (const r of records) {
    const dir = dirname(r.file) || ".";
    (groups.get(dir) ?? groups.set(dir, []).get(dir)!).push(r);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// --- HTML Generation ---

/** Formats a coverage ratio as a percentage string, or "N/A" if no items found. */
function pct(hit: number, found: number): string {
  return found === 0 ? "N/A" : `${((hit / found) * 100).toFixed(1)}%`;
}

/** Returns the raw percentage value (0-100) for a coverage ratio, treating 0/0 as 100%. */
function pctVal(hit: number, found: number): number {
  return found === 0 ? 100 : (hit / found) * 100;
}

function barColor(p: number, target: number): string {
  if (p >= target + 10) return "#4caf50";
  if (p >= target) return "#8bc34a";
  if (p >= target - 20) return "#ff9800";
  return "#f44336";
}

function tierClass(p: number, target: number): string {
  if (p >= target) return "green";
  if (p >= target - 20) return "yellow";
  return "red";
}

function generateHTML(records: FileCoverage[], config: Config): string {
  const totals = aggregate(records);
  const groups = groupByDirectory(records);
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fileRows = groups
    .flatMap(([dir, files]) => {
      const dirStats = aggregate(files);
      const dirRow = `<tr class="dir-row">
        <td class="dir-name"><strong>${dir}/</strong></td>
        <td class="metric">${pct(dirStats.functionsHit, dirStats.functionsFound)}</td>
        <td class="metric">${dirStats.functionsHit}/${dirStats.functionsFound}</td>
        <td class="metric">${pct(dirStats.linesHit, dirStats.linesFound)}</td>
        <td class="metric">${dirStats.linesHit}/${dirStats.linesFound}</td>
        <td class="bar-cell"><div class="bar"><div class="bar-fill" style="width:${dirStats.linePct}%;background:${barColor(dirStats.linePct, config.target)}"></div></div></td>
      </tr>`;

      const childRows = files
        .sort((a, b) => a.file.localeCompare(b.file))
        .map((f) => {
          const lp = pctVal(f.linesHit, f.linesFound);
          const fp = pctVal(f.functionsHit, f.functionsFound);
          return `<tr class="file-row">
        <td class="file-name">${basename(f.file)}</td>
        <td class="metric${fp < config.target ? " low" : ""}">${pct(f.functionsHit, f.functionsFound)}</td>
        <td class="metric">${f.functionsHit}/${f.functionsFound}</td>
        <td class="metric${lp < config.target ? " low" : ""}">${pct(f.linesHit, f.linesFound)}</td>
        <td class="metric">${f.linesHit}/${f.linesFound}</td>
        <td class="bar-cell"><div class="bar"><div class="bar-fill" style="width:${lp}%;background:${barColor(lp, config.target)}"></div></div></td>
      </tr>`;
        });

      return [dirRow, ...childRows];
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d; --surface-alt: #21262d;
      --text: #c9d1d9; --text-muted: #8b949e; --text-bright: #f0f6fc;
      --accent: #58a6ff; --green: #4caf50; --yellow: #ff9800; --red: #f44336;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; color: var(--text-bright); }
    .subtitle { color: var(--text-muted); margin-bottom: 2rem; font-size: 0.95rem; }
    .summary { display: flex; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem 1.5rem; min-width: 180px; flex: 1; }
    .card .label { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .card .value { font-size: 2rem; font-weight: 700; margin: 0.3rem 0; }
    .card .detail { color: var(--text-muted); font-size: 0.85rem; }
    .green { color: var(--green); } .yellow { color: var(--yellow); } .red { color: var(--red); }
    .badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .badge-ok { background: #1b4332; color: var(--green); }
    .badge-target { background: #1a1a2e; color: var(--accent); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    th { background: var(--surface-alt); color: var(--text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    td { padding: 0.6rem 1rem; border-bottom: 1px solid var(--surface-alt); font-size: 0.9rem; }
    .dir-row { background: #1c2128; }
    .dir-name { color: var(--accent); }
    .file-name { padding-left: 2rem; }
    .metric { text-align: center; font-variant-numeric: tabular-nums; }
    .metric.low { color: var(--red); font-weight: 600; }
    .bar-cell { width: 150px; }
    .bar { background: var(--surface-alt); border-radius: 4px; height: 8px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .footer { margin-top: 2rem; color: #484f58; font-size: 0.8rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${config.title}</h1>
    <p class="subtitle">Generated ${date}</p>

    <div class="summary">
      <div class="card">
        <div class="label">Line Coverage</div>
        <div class="value ${tierClass(totals.linePct, config.target)}">${totals.linePct.toFixed(1)}%</div>
        <div class="detail">${totals.linesHit.toLocaleString()} / ${totals.linesFound.toLocaleString()} lines &mdash; <span class="badge badge-target">Target: ${config.target}%</span></div>
      </div>
      <div class="card">
        <div class="label">Function Coverage</div>
        <div class="value ${tierClass(totals.funcPct, config.target)}">${totals.funcPct.toFixed(1)}%</div>
        <div class="detail">${totals.functionsHit.toLocaleString()} / ${totals.functionsFound.toLocaleString()} functions</div>
      </div>
      <div class="card">
        <div class="label">Files</div>
        <div class="value" style="color:var(--accent)">${records.length}</div>
        <div class="detail">${groups.length} directories</div>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>File</th><th>Func %</th><th>Func</th><th>Line %</th><th>Lines</th><th>Coverage</th></tr>
      </thead>
      <tbody>${fileRows}</tbody>
    </table>

    <div class="footer">Generated from lcov.info</div>
  </div>
</body>
</html>`;
}

// --- Main ---
function main(): void {
  const config = parseConfig();
  const input = resolve(config.input);
  const output = resolve(config.output);

  const records = parseLcov(readFileSync(input, "utf-8"));
  const html = generateHTML(records, config);
  const totals = aggregate(records);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, html);

  console.log(`Coverage report: ${output}`);
  console.log(
    `  ${records.length} files | Lines: ${pct(totals.linesHit, totals.linesFound)} | Functions: ${pct(totals.functionsHit, totals.functionsFound)}`,
  );
}

// Run the script
main();
