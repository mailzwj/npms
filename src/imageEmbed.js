import fs from 'fs';
import path from 'path';

const EXT_TO_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

/**
 * Replace local image src attributes in HTML with base64 data URIs.
 * Remote URLs (http/https/data) are left as-is.
 * @param {string} html
 * @param {string} mdDir - directory of the source .md file
 */
export function embedLocalImages(html, mdDir) {
  return html.replace(/<img([^>]*)\ssrc="([^"]+)"([^>]*)>/g, (match, before, src, after) => {
    if (/^(https?:||\/\/)/i.test(src)) {
      return match; // remote or already data URI
    }
    const absPath = path.isAbsolute(src) ? src : path.resolve(mdDir, src);
    if (!fs.existsSync(absPath)) {
      return match; // file not found, keep original
    }
    const ext = path.extname(absPath).toLowerCase();
    const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
    const data = fs.readFileSync(absPath).toString('base64');
    return `<img${before} src="data:${mime};base64,${data}"${after}>`;
  });
}
