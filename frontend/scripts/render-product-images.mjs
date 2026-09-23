/**
 * Render listing images for every product from its GLB model.
 *
 *   1. start the backend (port 8000) and `npm run dev` (port 5173)
 *   2. npm run render:images            (all products)
 *      npm run render:images -- <slug>  (just one)
 *
 * Output: public/images/products/<slug>.webp (the path stored in products.image_url).
 * Requires Playwright's Chromium once: npx playwright install chromium
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'images', 'products');
const base = process.env.RENDER_URL || 'http://localhost:5173';
const slugs = process.argv.slice(2);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`${base}/render.html`);
  await page.waitForFunction(() => window.renderReady);
  const results = await page.evaluate((s) => window.renderAll(s), slugs);
  await mkdir(outDir, { recursive: true });
  for (const { slug, dataUrl } of results) {
    const file = join(outDir, `${slug}.webp`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('✓', file);
  }
  if (!results.length) console.warn('No products rendered. Is the API running and are the slugs right?');
} finally {
  await browser.close();
}
