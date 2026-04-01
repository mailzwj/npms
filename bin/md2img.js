#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { renderMarkdown } from '../src/renderer.js';
import { embedLocalImages } from '../src/imageEmbed.js';
import { buildHTML } from '../src/template.js';
import { renderToImage } from '../src/screenshot.js';

program
  .name('md2img')
  .description('Convert Markdown to image with GitHub theme')
  .argument('<input>', 'Input Markdown file')
  .option('-o, --output <path>', 'Output image path (default: <input>.png)')
  .option('-f, --format <fmt>', 'Output format: png | jpg', 'png')
  .option('-w, --width <px>', 'Page width in pixels', '800')
  .option('-s, --scale <n>', 'Device scale factor (retina = 2)', '2')
  .option('--theme <name>', 'Color theme: light | dark', 'light')
  .option('--quality <n>', 'JPEG quality 0-100', '90')
  .parse();

const opts = program.opts();
const [inputFile] = program.args;

// Resolve input
const inputAbs = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(inputAbs)) {
  console.error(`Error: File not found: ${inputAbs}`);
  process.exit(1);
}

// Determine format
const fmt = opts.format.toLowerCase().replace('jpg', 'jpeg');
if (!['png', 'jpeg'].includes(fmt)) {
  console.error(`Error: Unsupported format "${opts.format}". Use png or jpg.`);
  process.exit(1);
}

// Determine output path
const outputExt = fmt === 'jpeg' ? '.jpg' : '.png';
const outputFile = opts.output
  ? path.resolve(process.cwd(), opts.output)
  : inputAbs.replace(/\.md$/i, '') + outputExt;

const width = parseInt(opts.width, 10);
const scale = parseFloat(opts.scale);
const quality = parseInt(opts.quality, 10);
const theme = opts.theme === 'dark' ? 'dark' : 'light';

(async () => {
  console.log(`Reading: ${inputAbs}`);
  const mdContent = fs.readFileSync(inputAbs, 'utf8');
  const mdDir = path.dirname(inputAbs);

  console.log('Rendering Markdown...');
  let bodyHTML = renderMarkdown(mdContent);

  console.log('Embedding local images...');
  bodyHTML = embedLocalImages(bodyHTML, mdDir);

  console.log('Building HTML template...');
  const html = buildHTML({ bodyHTML, theme, width });

  console.log('Launching browser...');
  await renderToImage({ html, output: outputFile, width, scale, format: fmt, quality });

  console.log(`Done! Output: ${outputFile}`);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
