import * as THREE from 'three';

/*
 * Recolours a GLB's baked base-colour texture for a configuration.
 *
 * The supplied models each use one baked texture, so wood, steel and rubber share a single
 * image. Instead of swapping whole materials, we classify every texel once:
 *   - wood mask:  warm hue (red → yellow) with some saturation
 *   - frame mask: light, unsaturated texels (e.g. the desk's grey steel frame)
 * then re-tint per configuration while keeping each texel's relative brightness, so the
 * grain, knots and wear from the original texture survive the colour change.
 */

const analysisCache = new WeakMap(); // source image -> per-texel analysis (computed once)

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function analyse(image) {
  if (analysisCache.has(image)) return analysisCache.get(image);
  const w = image.width, h = image.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const src = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const lum = new Float32Array(n), wood = new Float32Array(n), frame = new Float32Array(n);
  let woodL = 0, woodW = 0, frameL = 0, frameW = 0, allL = 0, allW = 0;
  for (let i = 0; i < n; i++) {
    const r = src[i * 4] / 255, g = src[i * 4 + 1] / 255, b = src[i * 4 + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const s = max > 0 ? d / max : 0;
    let hue = 0;
    if (d > 1e-5) {
      if (max === r) hue = 60 * (((g - b) / d) % 6);
      else if (max === g) hue = 60 * ((b - r) / d + 2);
      else hue = 60 * ((r - g) / d + 4);
      if (hue < 0) hue += 360;
    }
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // warm hues 0–60° (and a little past 345°) count as wood once saturation is meaningful
    const warm = hue <= 60 ? 1 - smooth(48, 62, hue) : smooth(330, 350, hue);
    const wm = warm * smooth(0.07, 0.18, s);
    const fm = (1 - wm) * smooth(0.22, 0.4, max) * (1 - smooth(0.08, 0.2, s));
    lum[i] = L; wood[i] = wm; frame[i] = fm;
    woodL += L * wm; woodW += wm; frameL += L * fm; frameW += fm;
    if (L > 0.03 && L < 0.97) { allL += L; allW += 1; } // ignore empty atlas background
  }
  const result = {
    w, h, src, lum, wood, frame,
    meanWoodL: woodW > 0 ? woodL / woodW : 0.4,
    meanFrameL: frameW > 0 ? frameL / frameW : 0.7,
    meanL: allW > 0 ? allL / allW : 0.4,
    frameShare: frameW / n,
  };
  analysisCache.set(image, result);
  return result;
}

// Hex → sRGB 0..1. (Not THREE.Color: with colour management on it returns *linear* values,
// but canvas pixels are sRGB, so using it would darken every colour twice.)
const toRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

/**
 * @param {THREE.Texture} source   the GLB's original base-colour texture
 * @param {{wood?: string, frame?: string}} colors  hex colours
 * @returns {THREE.CanvasTexture}
 */
export function recolorTexture(source, { wood, frame }) {
  // Only split the texture into wood / frame regions when there is a frame to colour.
  // Otherwise tint every texel: scanned textures have grey, low-saturation texels in the wood
  // itself, and leaving those untinted shows up as light speckles on dark species.
  const split = Boolean(frame);
  const a = analyse(source.image);
  const canvas = document.createElement('canvas');
  canvas.width = a.w; canvas.height = a.h;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(a.w, a.h);
  const o = out.data, src = a.src;
  const wc = wood ? toRgb(wood) : null;
  const fc = frame ? toRgb(frame) : null;
  const contrast = 0.7; // how much of the original grain contrast to keep

  for (let i = 0, n = a.w * a.h; i < n; i++) {
    let r = src[i * 4] / 255, g = src[i * 4 + 1] / 255, b = src[i * 4 + 2] / 255;
    const wm = wc ? (split ? a.wood[i] : 1) : 0;
    if (wm > 0.001) {
      const mean = split ? a.meanWoodL : a.meanL;
      const f = Math.min(1.3, Math.max(0.3, 1 + contrast * (a.lum[i] / mean - 1))); // cap so pale woods keep their tone
      r += (wc[0] * f - r) * wm; g += (wc[1] * f - g) * wm; b += (wc[2] * f - b) * wm;
    }
    const fm = fc ? a.frame[i] : 0;
    if (fm > 0.001) {
      const f = Math.min(1.4, Math.max(0.3, a.lum[i] / a.meanFrameL));
      r += (fc[0] * f - r) * fm; g += (fc[1] * f - g) * fm; b += (fc[2] * f - b) * fm;
    }
    o[i * 4] = r * 255; o[i * 4 + 1] = g * 255; o[i * 4 + 2] = b * 255; o[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = source.flipY;             // glTF textures are not flipped
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = source.wrapS; tex.wrapT = source.wrapT;
  tex.channel = source.channel;
  tex.anisotropy = 8;
  tex.userData.mimeType = 'image/jpeg'; // keeps AR exports (GLTFExporter) small
  if (source.matrixAutoUpdate === false || source.offset.lengthSq() || source.repeat.x !== 1) {
    tex.offset.copy(source.offset); tex.repeat.copy(source.repeat); tex.rotation = source.rotation;
  }
  return tex;
}
