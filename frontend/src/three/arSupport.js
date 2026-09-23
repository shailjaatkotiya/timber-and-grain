/**
 * What kind of AR this device can do:
 *   'quick-look'   iPhone / iPad (Safari's AR Quick Look, USDZ generated on the fly)
 *   'webxr'        Android Chrome with ARCore, over HTTPS (in-page AR with floor detection)
 *   'scene-viewer' other Android (Google's Scene Viewer app; needs a public URL to the model)
 *   null           desktop / unsupported: we show a QR code to continue on a phone
 */
export async function detectAR() {
  const a = document.createElement('a');
  if (a.relList?.supports?.('ar')) return 'quick-look';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'quick-look';
  if (navigator.xr?.isSessionSupported) {
    try { if (await navigator.xr.isSessionSupported('immersive-ar')) return 'webxr'; } catch { /* insecure context etc. */ }
  }
  if (/Android/i.test(navigator.userAgent)) return 'scene-viewer';
  return null;
}
