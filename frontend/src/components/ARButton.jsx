import { useEffect, useRef, useState } from 'react';
import { uploadARModel } from '../api';
import { getPlatform } from '../three/platform';
import { ARIcon } from './Configurator';

const PREWARM_DELAY_MS = 1200;       // wait for the customer to stop clicking swatches
const CACHE_MAX_AGE_MS = 90 * 60e3;  // server keeps AR files for 2 h

/**
 * The one "View in your room" button.
 *
 * On phones the configured model is exported + uploaded in the background (per configuration),
 * so a single tap can hand a real HTTPS file straight to the phone's native AR viewer:
 *   iPhone Safari          → <a rel="ar"> + <img> clicked from the tap (Apple's required markup)
 *   iPhone Chrome/Firefox  → navigate to the .usdz (these browsers pass it to Apple's AR Quick Look;
 *                             they ignore rel="ar", which is why AR didn't open in Chrome before)
 *   Android (any browser)  → Google Scene Viewer intent; phones without AR fall back to the camera view
 *   Desktop                → onDesktop() (QR code to continue on a phone)
 * If the tap arrives before the file is ready, the button shows progress and then asks for one more tap,
 * because AR viewers only open from a direct tap.
 */
export default function ARButton({ product, config, configLabel, viewerRef, modelReady, shareUrl, autoPrepare, onDesktop }) {
  const [platform] = useState(getPlatform);
  const mobile = platform.os !== 'desktop';
  const key = `${product.slug}|${JSON.stringify(config)}`;
  const cache = useRef(new Map());   // key -> { url, at }
  const inflight = useRef(new Map()); // key -> Promise<url>
  const [status, setStatus] = useState('idle'); // idle | preparing | ready | error
  const [wantsLaunch, setWantsLaunch] = useState(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  const cached = () => {
    const c = cache.current.get(key);
    return c && Date.now() - c.at < CACHE_MAX_AGE_MS ? c.url : null;
  };

  const prepare = (k = key) => {
    if (inflight.current.has(k)) return inflight.current.get(k);
    const job = (async () => {
      const v = viewerRef.current;
      const blob = platform.os === 'ios' ? await v.exportUSDZ() : await v.exportGLB();
      const url = await uploadARModel(blob, platform.os === 'ios' ? 'usdz' : 'glb');
      cache.current.set(k, { url, at: Date.now() });
      return url;
    })();
    inflight.current.set(k, job);
    job.finally(() => inflight.current.delete(k)).catch(() => {});
    return job;
  };

  // Background pre-warm on phones whenever the configuration settles.
  useEffect(() => {
    setWantsLaunch(false);
    if (!mobile || !modelReady) { setStatus('idle'); return undefined; }
    if (cached()) { setStatus('ready'); return undefined; }
    setStatus('idle');
    const t = setTimeout(() => {
      const k = key;
      prepare(k).then(() => { if (k === keyRef.current) setStatus('ready'); })
        .catch(() => { if (k === keyRef.current) setStatus('error'); });
    }, autoPrepare ? 0 : PREWARM_DELAY_MS);
    return () => clearTimeout(t);
  }, [key, modelReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const launch = (url) => {
    const ar = `${url}#allowsContentScaling=0`; // Quick Look: keep true size
    if (platform.os === 'ios') {
      if (platform.quickLook) {
        const a = document.createElement('a');
        a.rel = 'ar';
        a.href = ar;
        a.appendChild(document.createElement('img')); // Safari only launches AR for <a rel="ar"><img></a>
        a.click();
      } else {
        window.location.href = ar; // Chrome / Firefox / Edge on iOS open .usdz in Apple's AR viewer
      }
      return;
    }
    const fallback = shareUrl.replace(/([?&])ar=1/, '$1ar=camera');
    window.location.href = `intent://arvr.google.com/scene-viewer/1.2?${new URLSearchParams({
      file: url, mode: 'ar_preferred', resizable: 'false', title: `${product.name} · ${configLabel}`,
    })}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
  };

  const onClick = () => {
    if (!mobile) { onDesktop(); return; }
    const url = cached();
    if (url) { launch(url); return; }
    setWantsLaunch(true);
    setStatus('preparing');
    prepare().then(() => setStatus('ready')).catch(() => setStatus('error'));
  };

  let label = 'View in your room';
  if (mobile && wantsLaunch && status === 'preparing') label = 'Preparing 3D…';
  else if (mobile && wantsLaunch && status === 'ready') label = 'Tap to open in your room';
  else if (mobile && status === 'error') label = 'Try AR again';

  return (
    <div className="ar-cta">
      <button type="button"
        className={`ar-fab ${wantsLaunch && status === 'ready' ? 'pulse' : ''}`}
        onClick={onClick}
        disabled={!modelReady || (wantsLaunch && status === 'preparing')}
        aria-live="polite">
        {wantsLaunch && status === 'preparing' ? <span className="spinner sm" /> : <ARIcon />} {label}
      </button>
      {mobile && status === 'error' && <span className="ar-cta-note">Couldn't prepare AR. Check your connection and tap again.</span>}
    </div>
  );
}
