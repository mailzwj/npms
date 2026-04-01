import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

/**
 * Render HTML to an image file.
 * @param {object} opts
 * @param {string} opts.html       - Full HTML string
 * @param {string} opts.output     - Output file path (.png or .jpg/.jpeg)
 * @param {number} opts.width      - Viewport width in px
 * @param {number} opts.scale      - Device scale factor (default 2 for retina)
 * @param {'png'|'jpeg'} opts.format
 * @param {number} opts.quality    - JPEG quality 0-100 (only for jpeg)
 */
// Candidate Chrome/Chromium executables in priority order
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null; // let puppeteer use its own bundled browser
}

export async function renderToImage({ html, output, width = 800, scale = 2, format = 'png', quality = 90 }) {
  const puppeteerCacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.env.HOME || '/tmp', '.cache/puppeteer');

  // Use a unique userDataDir under the output file's directory (writable by process)
  const outputDir = path.dirname(path.resolve(output));
  const userDataDir = path.join(outputDir, `.md2img_chrome_${process.pid}_${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const launchOpts = {
    headless: true,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-extensions',
    ],
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: puppeteerCacheDir,
    },
  };

  const chromeExec = findChrome();
  if (chromeExec) {
    launchOpts.executablePath = chromeExec;
  }

  const browser = await puppeteer.launch(launchOpts);

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width,
      height: 800, // initial height, will expand
      deviceScaleFactor: scale,
    });

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for all images to load (including remote ones)
    await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return Promise.all(
        imgs.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // don't hang on broken images
              })
        )
      );
    });

    // Small delay to ensure fonts/katex fully rendered
    await new Promise(r => setTimeout(r, 200));

    // Get the actual rendered height of the content
    const wrapper = await page.$('.page-wrapper');
    const boundingBox = await wrapper.boundingBox();

    // Resize viewport to exact content height
    await page.setViewport({
      width,
      height: Math.ceil(boundingBox.height),
      deviceScaleFactor: scale,
    });

    const screenshotOpts = {
      path: output,
      type: format,
      clip: {
        x: 0,
        y: 0,
        width,
        height: Math.ceil(boundingBox.height),
      },
    };
    if (format === 'jpeg') {
      screenshotOpts.quality = quality;
    }

    await page.screenshot(screenshotOpts);
  } finally {
    await browser.close();
    // Clean up chrome profile dir
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}
