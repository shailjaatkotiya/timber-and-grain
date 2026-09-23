import { useEffect, useRef, useState } from 'react';
import { detectAR } from '../three/arSupport';

/**
 * "View in your room" dialog.
 * - Phones: loads <model-viewer> (lazily) with the *configured* model and a "Place in your room"
 *   button that opens native AR at real-world scale (ar-scale="fixed"), placed on the floor.
 * - Desktop: shows a QR code that opens this product, with the same configuration, on a phone.
 */
export default function ARViewer({ product, getModelBlob, shareUrl, configLabel, onClose }) {
  const [mode, setMode] = useState('detecting'); // detecting | preparing | ready | qr | error
  const [src, setSrc] = useState(null);
  const [qr, setQr] = useState(null);
  const [message, setMessage] = useState(null);
  const mv = useRef(null);

  useEffect(() => {
    let revoked = null;
    let cancelled = false;
    (async () => {
      const support = await detectAR();
      if (cancelled) return;
      if (!support) {
        const QR = await import('qrcode');
        const url = await QR.toDataURL(shareUrl, { margin: 1, width: 240, color: { dark: '#2a2420', light: '#fffdf9' } });
        if (!cancelled) { setQr(url); setMode('qr'); }
        return;
      }
      setMode('preparing');
      try {
        await import('@google/model-viewer'); // registers <model-viewer>; only loaded when AR is used
        let modelSrc;
        if (support === 'scene-viewer') {
          // Google's Scene Viewer app downloads the model itself, so it needs a real URL (not a blob).
          modelSrc = new URL(product.model_url, window.location.origin).href;
          setMessage('Shown in the default finish on this device.');
        } else {
          revoked = URL.createObjectURL(await getModelBlob());
          modelSrc = revoked;
        }
        if (!cancelled) { setSrc(modelSrc); setMode('ready'); }
      } catch (e) {
        if (!cancelled) { setMode('error'); setMessage('Could not prepare the 3D model for AR.'); }
      }
    })();
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked); };
  }, [product, getModelBlob, shareUrl]);

  useEffect(() => {
    const el = mv.current;
    if (!el) return undefined;
    const onStatus = (e) => {
      if (e.detail.status === 'failed') setMessage('AR could not start on this device. Try Chrome on Android or Safari on iPhone.');
    };
    el.addEventListener('ar-status', onStatus);
    return () => el.removeEventListener('ar-status', onStatus);
  }, [src]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isLocal = /^(localhost|127\.|\[::1\])/.test(window.location.hostname);

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

        {(mode === 'detecting' || mode === 'preparing') && (
          <div className="ar-body center-col"><div className="spinner" /><p className="muted">Preparing your configured {product.category}…</p></div>
        )}

        {mode === 'ready' && (
          <div className="ar-body">
            <model-viewer
              ref={mv}
              src={src}
              alt={`${product.name}, as configured`}
              ar=""
              ar-modes="webxr quick-look scene-viewer"
              ar-placement="floor"
              ar-scale="fixed"
              camera-controls=""
              touch-action="pan-y"
              shadow-intensity="1"
              exposure="1"
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            >
              <button slot="ar-button" className="btn ar-place">Place in your room</button>
            </model-viewer>
            <p className="ar-tip small">Tap <strong>Place in your room</strong>, point your camera at the floor, then drag to move and twist with two fingers to rotate. Shown at real size ({product.dimensions.w} × {product.dimensions.d} × {product.dimensions.h} cm).</p>
          </div>
        )}

        {mode === 'qr' && (
          <div className="ar-body ar-qr">
            {qr && <img src={qr} alt="QR code to open this product in AR on your phone" width="240" height="240" />}
            <div>
              <p><strong>Scan with your phone</strong> to place this {product.category} in your room at real size, in the finish you chose.</p>
              <ol className="muted small">
                <li>Open your phone camera and point it at the code.</li>
                <li>Tap the link, then <strong>Place in your room</strong>.</li>
                <li>Works on iPhone/iPad (Safari) and Android phones with ARCore (Chrome).</li>
              </ol>
              {isLocal && <p className="dev-note small">You're on <code>localhost</code>, which your phone can't open. Use the deployed site, or run <code>npm run dev -- --host</code> and open the network address. Android WebXR also needs HTTPS.</p>}
            </div>
          </div>
        )}

        {message && <p className={mode === 'error' ? 'error' : 'muted small'} style={{ margin: '8px 0 0' }}>{message}</p>}
      </div>
    </div>
  );
}
