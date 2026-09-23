import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { applyConfiguration, disposeConfigured, loadFurniture } from './models';

/**
 * A small, framework-agnostic Three.js viewer used by both the landing hero and the
 * product configurator. React components own its lifecycle (mount → dispose).
 */
export class FurnitureViewer {
  constructor(container, { controls = false, autoRotate = false, onFrame, onLoading, loop = true } = {}) {
    this.container = container;
    this.onFrame = onFrame;
    this.onLoading = onLoading; // (isLoading, error?) => void
    this.loadToken = 0;
    this.timer = new THREE.Timer();

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap; // soft (filtered) by default since r180
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environmentIntensity = 0.55; // keep dark woods rich; metals still get reflections

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
    this.camera.position.set(2.4, 1.6, 2.6);

    const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8a7a6a, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 4, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -2;
    key.shadow.camera.right = key.shadow.camera.top = 2;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    const rim = new THREE.DirectionalLight(0xffe2c4, 0.8);
    rim.position.set(-3, 2, -2.5);
    this.scene.add(hemi, key, rim);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.pivot = new THREE.Group(); // rotate this for scroll / turntable effects
    this.scene.add(this.pivot);

    if (controls) {
      const c = (this.controls = new OrbitControls(this.camera, r.domElement));
      c.enableDamping = true;
      c.enablePan = false;
      c.minDistance = 0.8;
      c.maxDistance = 6;
      c.maxPolarAngle = Math.PI / 2 - 0.05;
      c.autoRotate = autoRotate;
      c.autoRotateSpeed = 0.8;
      r.domElement.addEventListener('pointerdown', () => { c.autoRotate = false; }, { once: true });
    }

    this.resize = this.resize.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(container);
    this.resize();

    this.running = loop;
    const tick = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      this.timer.update();
      const dt = this.timer.getDelta();
      this.onFrame?.(dt, this);
      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Show a product (loads its GLB when it changes) with a configuration.
   * Safe to call rapidly: stale loads are dropped and the latest configuration wins.
   */
  async setFurniture(product, config, optionIndex, { frame = true } = {}) {
    this.config = config;
    this.optionIndex = optionIndex;
    if (this.modelUrl !== product.model_url) {
      this.modelUrl = product.model_url;
      const token = ++this.loadToken;
      this.onLoading?.(true);
      let model;
      try {
        model = await loadFurniture(product);
      } catch (err) {
        if (token === this.loadToken) this.onLoading?.(false, err);
        throw err;
      }
      if (token !== this.loadToken || this.disposed) return;
      if (this.model) this.pivot.remove(this.model);
      this.model = model;
      this.pivot.add(model);
      if (frame) this.frameModel();
      this.applyConfig();
      this.onLoading?.(false);
      return;
    }
    if (this.model) this.applyConfig();
  }

  applyConfig() {
    const created = applyConfiguration(this.model, this.config, this.optionIndex);
    disposeConfigured(this.mats);
    this.mats = created;
  }

  /** Point the camera at the model so it fills the view nicely. */
  frameModel(distanceFactor = 1.35) {
    const box = new THREE.Box3().setFromObject(this.model, true);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = size.length() / 2;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // portrait screens: back off so the model's width fits too
    const portrait = this.camera.aspect < 1 ? 0.9 / Math.max(this.camera.aspect, 0.45) : 1;
    const dist = (radius / Math.sin(fov / 2)) * distanceFactor * portrait;
    const dir = new THREE.Vector3(0.85, 0.55, 1).normalize();
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.target = center;
    this.camera.lookAt(center);
    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.minDistance = dist * 0.4;
      this.controls.maxDistance = dist * 2.2;
      this.controls.update();
    }
    return { center, dist };
  }

  /**
   * Export the configured model (current wood/finish/frame, real-world size in metres,
   * standing on y = 0) as a GLB blob, e.g. for AR. Only the furniture is exported, not the floor.
   */
  async exportGLB() {
    if (!this.model) throw new Error('Model not loaded yet');
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js'); // only needed for AR
    const glb = await new GLTFExporter().parseAsync(this.model, { binary: true, onlyVisible: true, maxTextureSize: 1024 });
    return new Blob([glb], { type: 'model/gltf-binary' });
  }

  /** Small JPEG of the current view, saved with the cart item so the configured look travels with it. */
  snapshot(width = 360) {
    const prevSize = this.renderer.getSize(new THREE.Vector2());
    const prevRatio = this.renderer.getPixelRatio();
    const h = Math.round(width * 0.8);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, h, false);
    const aspect = this.camera.aspect;
    this.camera.aspect = width / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setClearColor(0xf4efe7, 1);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/jpeg', 0.82);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(prevRatio);
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    return url;
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls?.dispose();
    disposeConfigured(this.mats); // GLB geometry stays cached for the next viewer
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer.domElement.remove();
  }
}

/**
 * Render a product with a configuration to a transparent WebP data URL.
 * Used by the offline image renderer (render.html + scripts/render-product-images.mjs).
 */
export async function renderProductImage(product, config, optionIndex, { width = 960, height = 768 } = {}) {
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'fixed', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
  document.body.appendChild(host);
  const v = new FurnitureViewer(host, { loop: false });
  try {
    v.renderer.setPixelRatio(1);
    v.resize();
    await v.setFurniture(product, config, optionIndex);
    v.frameModel(1.12);
    v.renderer.render(v.scene, v.camera);
    return v.renderer.domElement.toDataURL('image/webp', 0.9);
  } finally {
    v.dispose();
    host.remove();
  }
}
