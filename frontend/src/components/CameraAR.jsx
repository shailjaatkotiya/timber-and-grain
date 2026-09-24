import { useEffect, useRef, useState } from 'react';
import { FurnitureViewer } from '../three/FurnitureViewer';
import { browserName, cameraHelp } from '../three/platform';

/**
 * Live-camera preview that works in any modern browser (Safari, Chrome, Firefox, Edge, Samsung…):
 * the rear camera feed with the configured 3D model on top. Asks for camera permission
 * explicitly and explains how to re-enable it per browser if it was blocked.
 * (No floor tracking: drag to rotate, pinch to resize, two-finger drag to move.)
 */
export default function CameraAR({ product, config, optionIndex, platform, onClose }) {
  const [state, setState] = useState('ask'); // ask | starting | live | denied | error
  const [error, setError] = useState('');
  const video = useRef(null);
  const host = useRef(null);
  const viewer = useRef(null);
  const stream = useRef(null);

  // If the browser already knows the camera is blocked, say so before the user taps.
  useEffect(() => {
    navigator.permissions?.query({ name: 'camera' })
      .then((p) => { if (p.state === 'denied') setState('denied'); })
      .catch(() => { /* Safari/Firefox may not support querying 'camera' */ });
  }, []);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    viewer.current?.dispose();
    viewer.current = null;
  };
  useEffect(() => stop, []);

  const start = async () => {
    if (!platform.camera) {
      setError(window.isSecureContext
        ? `${browserName(platform.browser)} doesn't allow camera access on this device. Try Safari (iPhone) or Chrome (Android).`
        : 'The camera only works over a secure (https://) connection.');
      setState('error');
      return;
    }
    setState('starting');
    try {
      // This call shows the browser's "Allow camera?" prompt.
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setState('live');
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') setState('denied');
      else {
        setError(e.name === 'NotFoundError' ? 'No camera was found on this device.'
          : e.name === 'NotReadableError' ? 'The camera is being used by another app. Close it and try again.'
            : `Could not start the camera (${e.name || 'unknown error'}).`);
        setState('error');
      }
    }
  };

  // Once live: attach the stream and put the configured model on top.
  useEffect(() => {
    if (state !== 'live') return;
    const v = video.current;
    v.srcObject = stream.current;
    v.play().catch(() => {});
    const fv = new FurnitureViewer(host.current, { controls: true });
    fv.controls.enablePan = true;       // two-finger drag moves the piece around the frame
    fv.controls.maxPolarAngle = Math.PI / 2.05;
    fv.scene.children.forEach((c) => { if (c.material?.isShadowMaterial) c.material.opacity = 0.32; });
    viewer.current = fv;
    fv.setFurniture(product, config, optionIndex).then(() => fv.frameModel(1.6)).catch(() => {});
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePhoto = () => {
    const v = video.current, fv = viewer.current;
    if (!v || !fv) return;
    const w = host.current.clientWidth, h = host.current.clientHeight;
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const ctx = c.getContext('2d');
    // camera frame, cropped like object-fit: cover
    const s = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
    ctx.drawImage(v, (c.width - v.videoWidth * s) / 2, (c.height - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s);
    fv.renderer.render(fv.scene, fv.camera);
    ctx.drawImage(fv.renderer.domElement, 0, 0, c.width, c.height);
    const a = document.createElement('a');
    a.download = `${product.slug}-in-my-room.jpg`;
    a.href = c.toDataURL('image/jpeg', 0.9);
    a.click();
  };

  if (state === 'live') {
    return (
      <div className="camera-ar">
        <video ref={video} playsInline muted autoPlay className="camera-feed" />
        <div ref={host} className="camera-model" />
        <div className="camera-bar top">
          <span>{product.name}</span>
          <button className="btn-ghost small light" onClick={() => { stop(); onClose(); }}>Close</button>
        </div>
        <div className="camera-bar bottom">
          <span className="small">Drag to rotate · pinch to resize · two fingers to move</span>
          <button className="btn small" onClick={savePhoto}>Save photo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-ask">
      {(state === 'ask' || state === 'starting') && (
        <>
          <h4>Allow camera access</h4>
          <p className="muted small">We use your camera only to show the {product.category} in your room. Nothing is recorded or uploaded.</p>
          <button className="btn" onClick={start} disabled={state === 'starting'}>
            {state === 'starting' ? 'Waiting for permission…' : 'Allow camera'}
          </button>
          <p className="muted small">When {browserName(platform.browser)} asks, tap <strong>Allow</strong>.</p>
        </>
      )}
      {state === 'denied' && (
        <>
          <h4>Camera access is blocked</h4>
          <p className="muted small">{browserName(platform.browser)} isn't allowed to use the camera for this site. To turn it on:</p>
          <ol className="small">{cameraHelp(platform).map((s) => <li key={s}>{s}</li>)}</ol>
          <button className="btn" onClick={start}>Try again</button>
        </>
      )}
      {state === 'error' && (
        <>
          <h4>Camera unavailable</h4>
          <p className="error">{error}</p>
          {platform.camera && <button className="btn" onClick={start}>Try again</button>}
        </>
      )}
    </div>
  );
}
