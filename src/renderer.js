import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import katex from 'katex';

// Pre-process math before marked parses it (protect $ from being eaten by markdown)
function preprocessMath(md) {
  const blocks = [];
  // Block math: $$...$$
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const idx = blocks.length;
    blocks.push({ type: 'block', expr: expr.trim() });
    return `\x00MATH_BLOCK_${idx}\x00`;
  });
  // Inline math: $...$
  md = md.replace(/\$([^\n$]+?)\$/g, (_, expr) => {
    const idx = blocks.length;
    blocks.push({ type: 'inline', expr: expr.trim() });
    return `\x00MATH_INLINE_${idx}\x00`;
  });
  return { md, blocks };
}

function postprocessMath(html, blocks) {
  html = html.replace(/\x00MATH_BLOCK_(\d+)\x00/g, (_, i) => {
    const { expr } = blocks[Number(i)];
    try {
      return `<div class="math-block">${katex.renderToString(expr, { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="math-block math-error">${expr}</div>`;
    }
  });
  html = html.replace(/\x00MATH_INLINE_(\d+)\x00/g, (_, i) => {
    const { expr } = blocks[Number(i)];
    try {
      return katex.renderToString(expr, { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">${expr}</span>`;
    }
  });
  return html;
}

export function renderMarkdown(mdContent) {
  const { md, blocks } = preprocessMath(mdContent);

  const marked = new Marked(
    markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
    })
  );

  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  let html = marked.parse(md);
  html = postprocessMath(html, blocks);
  return html;
}
