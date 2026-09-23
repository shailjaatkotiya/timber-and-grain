import * as THREE from 'three';
import { recolorTexture } from './recolor';

// Fallback option data so 3D scenes (e.g. the landing hero) can render before the API responds.
export const FALLBACK_OPTIONS = {
  wood: {
    oak: { color: '#C49A63' }, walnut: { color: '#5E3B24' }, ash: { color: '#DCC7A1' },
    teak: { color: '#9A6433' }, cherry: { color: '#8A3E26' }, smoked: { color: '#3B2C23' },
    whitewash: { color: '#E9E0D1' },
  },
  finish: {
    matte: { roughness: 0.85, clearcoat: 0 },
    satin: { roughness: 0.5, clearcoat: 0.2 },
    gloss: { roughness: 0.2, clearcoat: 0.45 },
  },
  frame: {
    silver: { color: '#C4C6C9' }, black: { color: '#26262A' }, sage: { color: '#8DA38B' }, chalk: { color: '#ECEBE6' },
  },
};

/** Turn the API's option list (array or grouped object) into { group: { code: option } }. */
export function indexOptions(options) {
  if (!options) return FALLBACK_OPTIONS;
  const list = Array.isArray(options) ? options : Object.values(options).flat();
  const out = {};
  for (const o of list) (out[o.group] ||= {})[o.code] = o;
  return out;
}

function pick(idx, group, code) {
  return idx?.[group]?.[code] || FALLBACK_OPTIONS[group]?.[code] || Object.values(FALLBACK_OPTIONS[group] || {})[0];
}

/**
 * Build the configured material for one GLB mesh from its original material.
 * Keeps the model's own normal / AO maps; recolours its base-colour texture; the finish
 * option drives roughness + clearcoat.
 */
export function configuredMaterial(orig, config, optionIndex) {
  const wood = pick(optionIndex, 'wood', config.wood || 'oak');
  const finish = pick(optionIndex, 'finish', config.finish || 'satin');
  const frame = config.frame ? pick(optionIndex, 'frame', config.frame) : null;

  const map = orig.map ? recolorTexture(orig.map, { wood: wood.color, frame: frame?.color }) : null;
  return new THREE.MeshPhysicalMaterial({
    name: `${orig.name || 'part'}:configured`,
    map,
    color: map ? 0xffffff : new THREE.Color(wood.color),
    normalMap: orig.normalMap || null,
    normalScale: orig.normalScale ? orig.normalScale.clone() : new THREE.Vector2(1, 1),
    aoMap: orig.aoMap || null,
    aoMapIntensity: orig.aoMapIntensity ?? 1,
    roughness: finish.roughness ?? 0.6,
    metalness: 0,
    clearcoat: finish.clearcoat ?? 0,
    clearcoatRoughness: (finish.roughness ?? 0.5) * 0.6, // satin coat stays soft; gloss gets crisp
    specularIntensity: 0.35, // oiled / lacquered wood reflects far less than the default dielectric
    side: orig.side,
    transparent: orig.transparent,
    alphaTest: orig.alphaTest,
  });
}

export function disposeConfigured(materials) {
  for (const m of materials || []) {
    m.map?.dispose(); // recoloured canvas textures are ours; normal/AO maps belong to the cached GLB
    m.dispose();
  }
}
