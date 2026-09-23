// Renders every product's GLB (with its default configuration) to a transparent WebP.
// Driven by scripts/render-product-images.mjs; can also be opened in a browser to preview.
import { renderProductImage } from './three/FurnitureViewer';
import { indexOptions } from './three/materials';

async function renderAll(slugs) {
  const [products, options] = await Promise.all([
    fetch('/api/products').then((r) => r.json()),
    fetch('/api/config-options').then((r) => r.json()),
  ]);
  const idx = indexOptions(options);
  const out = [];
  for (const p of products) {
    if (slugs?.length && !slugs.includes(p.slug)) continue;
    const dataUrl = await renderProductImage(p, p.default_config, idx);
    out.push({ slug: p.slug, dataUrl });
    const img = new Image(); // preview when opened manually
    img.src = dataUrl; img.width = 320; img.title = p.slug;
    document.body.appendChild(img);
  }
  return out;
}

window.renderAll = renderAll;
window.renderReady = true;
