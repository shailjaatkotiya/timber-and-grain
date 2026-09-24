import { useEffect, useState } from 'react';
import { getPlatform } from '../three/platform';
import CameraAR from './CameraAR';

/**
 * AR dialog, used only where the phone's native AR viewer can't be opened directly:
 *   mode="qr"      desktop → QR code that opens this product + configuration on a phone
 *   mode="camera"  Android phones without Google AR (Scene Viewer falls back here) → live camera view
 */
export default function ARViewer({ mode, product, shareUrl, configLabel, config, optionIndex, onClose }) {
  const [platform] = useState(getPlatform);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    if (mode !== 'qr') return;
    import('qrcode')
      .then((QR) => QR.toDataURL(shareUrl, { margin: 1, width: 240, color: { dark: '#2a2420', light: '#fffdf9' } }))
      .then(setQr);
  }, [mode, shareUrl]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (mode === 'camera') {
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
        <div className="ar-body ar-qr">
          {qr ? <img src={qr} alt="QR code to open this product in AR on your phone" width="240" height="240" /> : <div className="spinner" />}
          <div>
            <p><strong>Scan with your phone's camera</strong> to see this {product.category} in your room, at real size and in the finish you chose.</p>
            <p className="muted small">Works on iPhone and iPad (any browser) and on most Android phones. On the phone, tap <strong>View in your room</strong>.</p>
            {/^(localhost|127\.)/.test(window.location.hostname) && <p className="dev-note small">You're on <code>localhost</code>, which your phone can't open. Use the live site.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
