import { useEffect, useState } from 'react';
import { uploadARModel } from '../api';
import { browserName, getPlatform } from '../three/platform';
import CameraAR from './CameraAR';

/**
 * "View in your room".
 *
 *  iPhone / iPad → Apple AR Quick Look (native, floor tracking, true size). The configured model is exported
 *                   to USDZ and uploaded *before* the tap, and opened through a real https link wrapped around an
 *                   <img> (Apple's required markup). Blob URLs don't work outside Safari, which is why the first version failed.
 *  Android       → Google Scene Viewer via an intent link to the uploaded GLB. Works from Chrome, Firefox, Samsung
 *                   Internet and Edge because the Google app opens it, not the browser.
 *  Any browser   → "Live camera" fallback: camera feed + 3D overlay, with an explicit permission step.
 *  Desktop       → QR code that opens the same configuration on a phone.
 */
export default function ARViewer({ product, viewerApi, shareUrl, configLabel, config, optionIndex, startInCamera, onClose }) {
  const [platform] = useState(getPlatform);
  const [step, setStep] = useState(startInCamera ? 'camera' : 'preparing'); // preparing | ready | camera | qr
  const [arUrl, setArUrl] = useState(null);
  const [preview, setPreview] = useState(null);
  const [qr, setQr] = useState(null);
  const [note, setNote] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (platform.os === 'desktop') {
        const QR = await import('qrcode');
        const url = await QR.toDataURL(shareUrl, { margin: 1, width: 240, color: { dark: '#2a2420', light: '#fffdf9' } });
        if (!cancelled) { setQr(url); if (!startInCamera) setStep('qr'); }
        return;
      }
      if (startInCamera) return;
      try {
        setPreview(viewerApi.snapshot());
        const isIOS = platform.os === 'ios';
        const blob = isIOS ? await viewerApi.exportUSDZ() : await viewerApi.exportGLB();
        const url = await uploadARModel(blob, isIOS ? 'usdz' : 'glb');
        if (!cancelled) { setArUrl(url); setStep('ready'); }
      } catch (e) {
        if (!cancelled) {
          setNote('Could not prepare the 3D file for your phone\'s AR viewer. You can still use the live camera view.');
          setStep('ready');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Scene Viewer intent: opens Google's AR viewer from any Android browser; falls back to our camera view.
  const fallback = shareUrl.replace('ar=1', 'ar=camera');
  const sceneViewerHref = arUrl && `intent://arvr.google.com/scene-viewer/1.2?${new URLSearchParams({
    file: arUrl, mode: 'ar_preferred', resizable: 'false', title: `${product.name} · ${configLabel}`,
  })}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
  // Quick Look: fixed real-world size, no pinch-scaling.
  const quickLookHref = arUrl && `${arUrl}#allowsContentScaling=0`;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); } catch { /* ignore */ }
  };

  if (step === 'camera') {
    return (
      <div className="ar-overlay" role="dialog" aria-modal="true" aria-label="Live camera view">
        <div className="ar-dialog camera-dialog">
          <CameraAR product={product} config={config} optionIndex={optionIndex} platform={platform} onClose={onClose} />
          <button className="btn-link small" onClick={onClose}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-overlay" role="dialog" aria-modal="true" aria-label={`View ${product.name} in your room`} onClick={onClose}>
      <div className="ar-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ar-head">
          <div>
            <h3>View in your room</h3>
            <p className="muted small">{product.name} · {configLabel}</p>
          </div>
          <button className="btn-ghost small" onClick={onClose} aria-label="Close">Close</button>
        </div>

        {step === 'preparing' && (
          <div className="ar-body center-col"><div className="spinner" /><p className="muted">Preparing your configured {product.category}…</p></div>
        )}

        {step === 'ready' && platform.os === 'ios' && (
          <div className="ar-options">
            {arUrl && (
              // Apple requires rel="ar" on a link whose only child is an <img>.
              <a rel="ar" href={quickLookHref} className="ql-link">
                <img src={preview || product.image_url} alt={`Place ${product.name} in your room`} />
              </a>
            )}
            {arUrl && <p className="ar-caption"><strong>Tap the picture</strong> to open it in your room at real size ({product.dimensions.w}×{product.dimensions.d}×{product.dimensions.h} cm). Point the camera at the floor, then drag to move and twist to rotate.</p>}
            {arUrl && !platform.quickLook && (
              <div className="dev-note small">
                You're using {browserName(platform.browser)}. If tapping opens a 3D file instead of the camera, tap <strong>AR</strong> at the top of Apple's viewer.
                AR works best in <strong>Safari</strong>: <button className="btn-link small" onClick={copyLink}>{copied ? 'Link copied. Paste it in Safari' : 'copy link for Safari'}</button>
              </div>
            )}
            <button className="btn-ghost block" onClick={() => setStep('camera')}>Use live camera view instead</button>
          </div>
        )}

        {step === 'ready' && platform.os === 'android' && (
          <div className="ar-options">
            {preview && <img className="ar-preview" src={preview} alt="" />}
            {arUrl && <a className="btn block" href={sceneViewerHref}>Open in AR, in your room</a>}
            {arUrl && <p className="ar-caption small">Opens Google's AR viewer at real size ({product.dimensions.w}×{product.dimensions.d}×{product.dimensions.h} cm). Point your phone at the floor and move it slowly until the {product.category} appears.</p>}
            <button className="btn-ghost block" onClick={() => setStep('camera')}>Use live camera view instead</button>
            <p className="muted small">If “Open in AR” does nothing, your phone may not support Google AR; use the live camera view.</p>
          </div>
        )}

        {step === 'qr' && (
          <div className="ar-body ar-qr">
            {qr && <img src={qr} alt="QR code to open this product in AR on your phone" width="240" height="240" />}
            <div>
              <p><strong>Scan with your phone</strong> to place this {product.category} in your room at real size, in the finish you chose.</p>
              <ol className="muted small">
                <li>Point your phone camera at the code and tap the link.</li>
                <li>iPhone: tap the picture to open Apple AR. Android: tap <strong>Open in AR</strong>.</li>
                <li>Any other browser: choose <strong>live camera view</strong> and allow the camera.</li>
              </ol>
              {/^(localhost|127\.)/.test(window.location.hostname) && <p className="dev-note small">You're on <code>localhost</code>, which your phone can't open. Use the live site.</p>}
            </div>
          </div>
        )}

        {note && <p className="error" style={{ margin: '8px 0 0' }}>{note}</p>}
      </div>
    </div>
  );
}
