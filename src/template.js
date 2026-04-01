import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModules = path.resolve(__dirname, '../node_modules');

function readAsset(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getThemeCSS(theme) {
  const githubCSSFile = theme === 'dark'
    ? 'github-markdown-css/github-markdown-dark.css'
    : 'github-markdown-css/github-markdown-light.css';
  const hljsCSSFile = theme === 'dark'
    ? 'highlight.js/styles/github-dark.css'
    : 'highlight.js/styles/github.css';
  return {
    githubCSS: readAsset(path.join(nodeModules, githubCSSFile)),
    hljsCSS: readAsset(path.join(nodeModules, hljsCSSFile)),
  };
}

export function buildHTML({ bodyHTML, theme = 'light', width = 800 }) {
  const { githubCSS, hljsCSS } = getThemeCSS(theme);
  const katexCSS = readAsset(path.join(nodeModules, 'katex/dist/katex.min.css'));

  // Inline katex fonts as base64 to avoid font loading issues in puppeteer
  const katexFontsDir = path.join(nodeModules, 'katex/dist/fonts');
  const katexCSSWithFonts = katexCSS.replace(/url\(fonts\/([^)]+)\)/g, (match, fontFile) => {
    const fontPath = path.join(katexFontsDir, fontFile);
    if (fs.existsSync(fontPath)) {
      const ext = path.extname(fontFile).slice(1).toLowerCase();
      const mime = ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : 'font/truetype';
      const b64 = fs.readFileSync(fontPath).toString('base64');
      return `url(data:${mime};base64,${b64})`;
    }
    return match;
  });

  const bg = theme === 'dark' ? '#0d1117' : '#ffffff';

  return `<!DOCTYPE html>
<html lang="en" data-color-mode="${theme}" data-light-theme="light" data-dark-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${githubCSS}
</style>
<style>
${hljsCSS}
</style>
<style>
${katexCSSWithFonts}
</style>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  background: ${bg};
}
.page-wrapper {
  width: ${width}px;
  padding: 32px 40px;
  background: ${bg};
}
.markdown-body {
  max-width: 100%;
}
.math-block {
  overflow-x: auto;
  margin: 1em 0;
  text-align: center;
}
.math-error {
  color: #cf222e;
  font-family: monospace;
}
/* Fix hljs code blocks inside markdown-body */
.markdown-body pre code.hljs {
  background: transparent;
  padding: 0;
}
</style>
</head>
<body>
<div class="page-wrapper">
  <article class="markdown-body">
${bodyHTML}
  </article>
</div>
</body>
</html>`;
}
