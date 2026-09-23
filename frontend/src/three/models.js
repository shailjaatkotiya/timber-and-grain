import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { configuredMaterial, disposeConfigured } from './materials';

/*
 * GLB furniture models. Each product row carries:
 *   model_url   e.g. /models/oslo-slat-back-chair.glb (files live in frontend/public/models)
 *   model_yaw   degrees to turn the model so its front faces +Z (the camera side)
 *   dimensions  { h } in cm: the model is scaled to this real-world height, floor at y = 0
 */

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const gltfCache = new Map(); // url -> Promise<gltf>; geometry + original textures are shared by clones

export function preloadModel(url) {
  if (!gltfCache.has(url)) {
    const p = loader.loadAsync(url);
    p.catch(() => gltfCache.delete(url)); // allow a retry after a network error
    gltfCache.set(url, p);
  }
  return gltfCache.get(url);
}

/** Models exported as unlit (KHR_materials_unlit) often carry unreliable normals; rebuild them once, flat-shaded. */
function fixUnlitNormals(gltf) {
  if (gltf.userData.normalsFixed) return;
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.material?.isMeshBasicMaterial) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      g.computeVertexNormals();
      o.geometry = g;
    }
  });
  gltf.userData.normalsFixed = true;
}

export async function loadFurniture({ model_url, model_yaw = 0, dimensions = {} }) {
  const gltf = await preloadModel(model_url);
  fixUnlitNormals(gltf);
  const inner = gltf.scene.clone(true);
  inner.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.origMaterial = o.material;
    }
  });

  const yawed = new THREE.Group();
  yawed.rotation.y = THREE.MathUtils.degToRad(model_yaw);
  yawed.add(inner);
  const holder = new THREE.Group();
  holder.add(yawed);
  holder.name = model_url;

  // Scale to real height (cm → m), then sit it on the floor, centred.
  holder.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(holder, true); // precise: Sketchfab roots are rotated
  const targetH = (dimensions.h || 80) / 100;
  holder.scale.setScalar(targetH / Math.max(box.getSize(new THREE.Vector3()).y, 1e-6));
  holder.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(holder, true);
  const c = box.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -box.min.y, -c.z);
  holder.updateMatrixWorld(true);
  return holder;
}

/** Apply a configuration to every mesh; returns the created materials so the caller can dispose them later. */
export function applyConfiguration(model, config, optionIndex) {
  const created = [];
  const byOriginal = new Map(); // meshes sharing a material share the configured one too
  model.traverse((o) => {
    if (!o.isMesh || !o.userData.origMaterial) return;
    const orig = o.userData.origMaterial;
    if (!byOriginal.has(orig)) {
      const m = configuredMaterial(orig, config, optionIndex);
      byOriginal.set(orig, m);
      created.push(m);
    }
    o.material = byOriginal.get(orig);
  });
  return created;
}

export { disposeConfigured };
