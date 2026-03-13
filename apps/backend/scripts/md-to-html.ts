/**
 * Converts Markdown files to beautifully styled standalone HTML.
 * Designed for sharing on social media, embedding in portfolios, or printing to PDF.
 *
 * Usage:
 *   bun run scripts/md-to-html.ts <input.md> [options]
 *
 * Options:
 *   --output, -o    Output file path       (default: <input>.html)
 *   --theme         "dark" | "light"       (default: "dark")
 *   --title         Custom page title      (default: first h1 in the markdown)
 *   --author        Author name for meta   (optional)
 *   --image-base    Base path for images   (default: relative to input file)
 *   --embed-images  Embed images as base64 (default: false)
 *
 * Examples:
 *   bun run scripts/md-to-html.ts docs/blog-post.md
 *   bun run scripts/md-to-html.ts docs/blog-post.md -o out/blog.html --theme light --author "John Doe"
 *   bun run scripts/md-to-html.ts docs/blog-post.md --embed-images
 *
 *   bun run scripts/md-to-html.ts ../../docs/blog-post.md -o ../../docs/blog-post.html --embed-images
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, resolve } from "path";
import hljs from "highlight.js";
import { Marked, Renderer } from "marked";

// --- Config ---

interface Config {
  input: string;
  output: string;
  theme: "dark" | "light";
  title?: string;
  author?: string;
  imageBase: string;
  embedImages: boolean;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith("-"));

  if (!input) {
    console.error("Usage: bun run scripts/md-to-html.ts <input.md> [options]");
    process.exit(1);
  }

  const flag = (names: string[]) => {
    for (const name of names) {
      const i = args.indexOf(name);
      if (i !== -1 && i + 1 < args.length) return args[i + 1];
    }
    return undefined;
  };

  const hasFlag = (names: string[]) => names.some((n) => args.includes(n));
  const inputPath = resolve(input);
  const defaultOutput = inputPath.replace(/\.md$/i, ".html");

  return {
    input: inputPath,
    output: resolve(flag(["--output", "-o"]) ?? defaultOutput),
    theme: (flag(["--theme"]) as "dark" | "light") ?? "dark",
    title: flag(["--title"]),
    author: flag(["--author"]),
    imageBase: flag(["--image-base"]) ?? dirname(inputPath),
    embedImages: hasFlag(["--embed-images"]),
  };
}

// --- Markdown Processing ---

function createMarkedInstance(): Marked {
  const renderer = new Renderer();

  renderer.code = (token) => {
    const lang = token.lang && hljs.getLanguage(token.lang) ? token.lang : undefined;
    const highlighted = lang
      ? hljs.highlight(token.text, { language: lang }).value
      : hljs.highlightAuto(token.text).value;
    const langBadge = lang ? `<span class="code-lang">${lang}</span>` : "";
    return `<div class="code-block">${langBadge}<pre><code class="hljs">${highlighted}</code></pre></div>`;
  };

  renderer.image = (token) => {
    const title = token.title ? ` title="${token.title}"` : "";
    return `<figure><img src="${token.href}" alt="${token.text ?? ""}"${title} loading="lazy"><figcaption>${token.text ?? ""}</figcaption></figure>`;
  };

  renderer.blockquote = (token) => `<blockquote>${token.text}</blockquote>`;

  renderer.link = (token) => {
    const title = token.title ? ` title="${token.title}"` : "";
    return `<a href="${token.href}"${title} target="_blank" rel="noopener">${token.text}</a>`;
  };

  return new Marked({ renderer });
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1]!.trim() : "Document";
}

function embedImages(html: string, imageBase: string): string {
  return html.replace(/(<img\s+src=")([^"]+)(")/g, (_match, before, src, after) => {
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
      return `${before}${src}${after}`;
    }

    const imgPath = resolve(imageBase, src);
    if (!existsSync(imgPath)) return `${before}${src}${after}`;

    const ext = extname(imgPath).slice(1).toLowerCase();
    const mime =
      {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
      }[ext] ?? "image/png";

    const base64 = readFileSync(imgPath).toString("base64");
    return `${before}data:${mime};base64,${base64}${after}`;
  });
}

// --- Themes ---

const THEMES = {
  dark: {
    bg: "#0d1117",
    surface: "#161b22",
    border: "#30363d",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    textBright: "#f0f6fc",
    accent: "#58a6ff",
    accentHover: "#79c0ff",
    codeBg: "#1c2128",
    inlineCodeBg: "#2d333b",
    blockquoteBorder: "#3b82f6",
    blockquoteBg: "#161b22",
  },
  light: {
    bg: "#ffffff",
    surface: "#f6f8fa",
    border: "#d1d9e0",
    text: "#1f2328",
    textMuted: "#656d76",
    textBright: "#1f2328",
    accent: "#0969da",
    accentHover: "#0550ae",
    codeBg: "#f6f8fa",
    inlineCodeBg: "#eff1f3",
    blockquoteBorder: "#3b82f6",
    blockquoteBg: "#f6f8fa",
  },
};

function buildCSS(theme: "dark" | "light"): string {
  const t = THEMES[theme];
  return `
    :root {
      --bg: ${t.bg}; --surface: ${t.surface}; --border: ${t.border};
      --text: ${t.text}; --text-muted: ${t.textMuted}; --text-bright: ${t.textBright};
      --accent: ${t.accent}; --accent-hover: ${t.accentHover};
      --code-bg: ${t.codeBg}; --inline-code-bg: ${t.inlineCodeBg};
      --bq-border: ${t.blockquoteBorder}; --bq-bg: ${t.blockquoteBg};
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    html { font-size: 18px; scroll-behavior: smooth; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;
      background: var(--bg); color: var(--text);
      line-height: 1.7; -webkit-font-smoothing: antialiased;
    }

    .article {
      max-width: 720px; margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
    }

    /* --- Typography --- */
    h1, h2, h3, h4 { color: var(--text-bright); font-weight: 700; line-height: 1.3; }
    h1 { font-size: 2.2rem; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
    h2 { font-size: 1.5rem; margin: 2.5rem 0 1rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--border); }
    h3 { font-size: 1.2rem; margin: 2rem 0 0.75rem; }
    h4 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }

    p { margin: 0 0 1.25rem; }

    a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
    a:hover { border-bottom-color: var(--accent-hover); }

    strong { color: var(--text-bright); font-weight: 600; }

    /* --- Lists --- */
    ul, ol { margin: 0 0 1.25rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.4rem; }
    li > ul, li > ol { margin-top: 0.4rem; margin-bottom: 0; }

    /* --- Code --- */
    code {
      font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
      font-size: 0.85em;
    }

    :not(pre) > code {
      background: var(--inline-code-bg); padding: 0.15em 0.4em;
      border-radius: 4px; color: var(--text-bright);
    }

    .code-block {
      position: relative; margin: 0 0 1.5rem;
      border-radius: 8px; overflow: hidden; border: 1px solid var(--border);
    }

    .code-block pre {
      background: var(--code-bg); padding: 1.2rem 1.5rem;
      overflow-x: auto; line-height: 1.5;
    }

    .code-lang {
      position: absolute; top: 0; right: 0;
      background: var(--border); color: var(--text-muted);
      font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      padding: 0.2rem 0.6rem; border-radius: 0 0 0 6px;
      letter-spacing: 0.05em;
    }

    /* --- Images --- */
    figure {
      margin: 1.5rem 0 2rem; text-align: center;
    }

    figure img {
      max-width: 100%; height: auto; border-radius: 8px;
      border: 1px solid var(--border); display: block; margin: 0 auto;
    }

    figcaption {
      color: var(--text-muted); font-size: 0.8rem;
      margin-top: 0.5rem; font-style: italic;
    }

    /* --- Blockquotes --- */
    blockquote {
      border-left: 3px solid var(--bq-border); background: var(--bq-bg);
      padding: 0.8rem 1.2rem; margin: 0 0 1.5rem;
      border-radius: 0 6px 6px 0; color: var(--text-muted);
    }

    blockquote p:last-child { margin-bottom: 0; }

    /* --- Tables --- */
    table {
      width: 100%; border-collapse: collapse;
      margin: 0 0 1.5rem; font-size: 0.9rem;
    }

    th, td {
      padding: 0.6rem 1rem; text-align: left;
      border: 1px solid var(--border);
    }

    th { background: var(--surface); color: var(--text-bright); font-weight: 600; }
    tr:nth-child(even) td { background: var(--surface); }

    /* --- Horizontal rule --- */
    hr {
      border: none; height: 1px;
      background: var(--border); margin: 2.5rem 0;
    }

    /* --- Meta line (author / date) --- */
    .meta {
      color: var(--text-muted); font-size: 0.85rem;
      margin-bottom: 2rem; padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    /* --- Print --- */
    @media print {
      body { background: #fff; color: #1a1a1a; }
      .article { max-width: 100%; padding: 0; }
      a { color: inherit; border-bottom: none; }
      a::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #666; }
      .code-block { break-inside: avoid; }
      figure { break-inside: avoid; }
    }

    @media (max-width: 600px) {
      html { font-size: 16px; }
      .article { padding: 1.5rem 1rem 3rem; }
      h1 { font-size: 1.8rem; }
    }`;
}

// --- highlight.js theme (subset) ---

function hljsCSS(theme: "dark" | "light"): string {
  if (theme === "dark") {
    return `
      .hljs { color: #c9d1d9; }
      .hljs-keyword, .hljs-selector-tag { color: #ff7b72; }
      .hljs-string, .hljs-addition { color: #a5d6ff; }
      .hljs-comment, .hljs-meta { color: #8b949e; }
      .hljs-number, .hljs-literal { color: #79c0ff; }
      .hljs-function .hljs-title, .hljs-title.function_ { color: #d2a8ff; }
      .hljs-built_in { color: #ffa657; }
      .hljs-type, .hljs-title.class_ { color: #7ee787; }
      .hljs-attr, .hljs-attribute { color: #79c0ff; }
      .hljs-variable, .hljs-template-variable { color: #ffa657; }
      .hljs-property { color: #79c0ff; }
      .hljs-regexp { color: #a5d6ff; }
      .hljs-deletion { color: #ffa198; background: #490202; }
      .hljs-addition { background: #04260f; }`;
  }
  return `
      .hljs { color: #1f2328; }
      .hljs-keyword, .hljs-selector-tag { color: #cf222e; }
      .hljs-string, .hljs-addition { color: #0a3069; }
      .hljs-comment, .hljs-meta { color: #6e7781; }
      .hljs-number, .hljs-literal { color: #0550ae; }
      .hljs-function .hljs-title, .hljs-title.function_ { color: #8250df; }
      .hljs-built_in { color: #953800; }
      .hljs-type, .hljs-title.class_ { color: #116329; }
      .hljs-attr, .hljs-attribute { color: #0550ae; }
      .hljs-variable, .hljs-template-variable { color: #953800; }
      .hljs-property { color: #0550ae; }
      .hljs-regexp { color: #0a3069; }
      .hljs-deletion { color: #82071e; background: #ffebe9; }
      .hljs-addition { background: #dafbe1; }`;
}

// --- Assembly ---

function buildHTML(body: string, config: Config, title: string): string {
  const metaParts: string[] = [];
  if (config.author) metaParts.push(`By ${config.author}`);
  metaParts.push(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  );
  const metaLine = metaParts.length
    ? `<div class="meta">${metaParts.join(" &middot; ")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${config.author ? `<meta name="author" content="${config.author}">` : ""}
  <style>${buildCSS(config.theme)}${hljsCSS(config.theme)}</style>
</head>
<body>
  <article class="article">
    ${metaLine}
    ${body}
  </article>
</body>
</html>`;
}

// --- Main ---

function main(): void {
  const config = parseArgs();

  if (!existsSync(config.input)) {
    console.error(`File not found: ${config.input}`);
    process.exit(1);
  }

  const markdown = readFileSync(config.input, "utf-8");
  const title = config.title ?? extractTitle(markdown);
  const marked = createMarkedInstance();

  let html = marked.parse(markdown) as string;

  if (config.embedImages) {
    html = embedImages(html, config.imageBase);
  }

  const fullHTML = buildHTML(html, config, title);

  mkdirSync(dirname(config.output), { recursive: true });
  writeFileSync(config.output, fullHTML);

  console.log(`${config.output}`);
  console.log(
    `  Theme: ${config.theme} | Images: ${config.embedImages ? "embedded" : "linked"} | Title: "${title}"`,
  );
}

main();
