import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FurnitureViewer } from '../three/FurnitureViewer';

/**
 * Interactive 3D configurator: loads the product's GLB and applies the selected options.
 * Exposes snapshot() to the parent via ref (used for the cart preview image).
 */
const Configurator = forwardRef(function Configurator({ product, config, optionIndex, onViewAR, onReady }, ref) {
  const host = useRef(null);
  const viewer = useRef(null);
  const [status, setStatus] = useState({ loading: true, error: null });
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    viewer.current = new FurnitureViewer(host.current, {
      controls: true,
      autoRotate: true,
      onLoading: (loading, error) => {
        setStatus({ loading, error: error ? 'Could not load the 3D model.' : null });
        if (!loading && !error) onReadyRef.current?.();
      },
    });
    return () => viewer.current.dispose();
  }, []);

  useEffect(() => {
    if (product && config) viewer.current.setFurniture(product, config, optionIndex).catch(() => {});
  }, [product, config, optionIndex]);

  useImperativeHandle(ref, () => ({
    snapshot: () => (viewer.current?.model ? viewer.current.snapshot() : null),
    exportGLB: () => viewer.current.exportGLB(),
  }));

  return (
    <div className="configurator">
      <div ref={host} className="configurator-canvas" />
      {status.loading && (
        <div className="configurator-loading">
          {product?.image_url && <img src={product.image_url} alt="" />}
          <span>Loading 3D model…</span>
        </div>
      )}
      {status.error && <div className="configurator-loading"><span className="error">{status.error}</span></div>}
      <div className="configurator-hint">Drag to rotate · Scroll to zoom</div>
      {onViewAR && !status.loading && !status.error && (
        <button type="button" className="ar-fab" onClick={onViewAR}>
          <ARIcon /> View in your room
        </button>
      )}
      <button type="button" className="btn-ghost small reset-view" onClick={() => viewer.current?.model && viewer.current.frameModel()}>
        Reset view
      </button>
    </div>
  );
});

export function ARIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export default Configurator;
