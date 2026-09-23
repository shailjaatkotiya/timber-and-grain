import { useEffect, useRef } from 'react';
import { FurnitureViewer } from '../three/FurnitureViewer';

/**
 * Fixed, full-screen Three.js background for the landing page.
 * Scroll progress drives the table's rotation (smoothed with a lerp each frame);
 * `config` changes (from the active story section) re-skin the table in place.
 */
// The landing table is one of the catalogue GLBs.
export const HERO_PRODUCT = {
  model_url: '/models/heritage-farmhouse-table.glb', model_yaw: 90, dimensions: { h: 72 },
};

export default function HeroScene({ config, product = HERO_PRODUCT }) {
  const host = useRef(null);
  const viewer = useRef(null);

  useEffect(() => {
    const state = { target: 0, current: 0, lift: 0 };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      state.target = p * Math.PI * 2.5; // one and a quarter turns across the page
      state.lift = p;
    };

    const v = new FurnitureViewer(host.current, {
      onFrame: (dt, viewer) => {
        const k = reduceMotion ? 1 : 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
        state.current += (state.target - state.current) * k;
        viewer.pivot.rotation.y = -0.6 + state.current;
        viewer.pivot.rotation.x = Math.sin(state.current * 0.5) * 0.05;
        // gentle camera drift: slightly higher and closer as the story progresses
        if (viewer.base) {
          const { center, dist } = viewer.base;
          const d = dist * (1 - state.lift * 0.18);
          viewer.camera.position.set(center.x + d * 0.62, center.y + d * (0.42 + state.lift * 0.25), center.z + d * 0.72);
          viewer.camera.lookAt(center);
        }
      },
    });
    viewer.current = v;
    // shift the table right on wide screens (copy sits left) and up on phones (copy sits below)
    const offset = () => {
      const w = host.current.clientWidth, h = host.current.clientHeight;
      if (w > 900) v.camera.setViewOffset(w, h, -w * 0.18, 0, w, h);
      else v.camera.setViewOffset(w, h, 0, h * 0.24, w, h); // phones: lift the table above the copy card
    };
    const ro = new ResizeObserver(offset);
    ro.observe(host.current);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); ro.disconnect(); v.dispose(); };
  }, []);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.setFurniture(product, config, null).then(() => {
      if (!v.base && v.model) v.base = v.frameModel(0.95);
    }).catch(() => {});
  }, [product, config]);

  return <div ref={host} className="hero-canvas" aria-hidden="true" />;
}
