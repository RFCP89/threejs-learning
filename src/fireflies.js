// =============================================================
// Step 10 — Fireflies: particles, written as a shader from scratch
// =============================================================
// PARTICLES: when you need hundreds of tiny glowing dots, a mesh per dot would be
// silly. THREE.Points draws every VERTEX of a geometry as a little square on screen
// (a "point sprite") — all in ONE draw call.
//
// In Step 9 we injected code into a standard material. Here we write a ShaderMaterial
// from scratch — both shaders, entirely ours. That's fine for fireflies: they glow by
// themselves, so we need none of three.js's lighting.
//
// And all the MOVEMENT happens on the GPU: JavaScript only sends the time. Each
// firefly computes its own drifting path and blinking in the vertex shader. Moving
// 100 particles in a JS loop would also be fine — but on the GPU it'd be just as fast
// with 100,000.

import * as THREE from 'three'
import { getTerrainHeight } from './terrain.js'

// Same seeded random as nature.js (Step 5), so the swarm is the same every reload.
function createRandom(seed) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const vertexShader = /* glsl */ `
  // Built-in inputs three.js provides to a ShaderMaterial (no need to declare them):
  //   position (attribute), modelViewMatrix, projectionMatrix (uniforms)
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;

  // Our own per-firefly attribute: a random number 0..1, different for each one,
  // so they don't all drift and blink in sync.
  attribute float aSeed;

  // Sent to the fragment shader: how bright this firefly is right now.
  varying float vGlow;

  void main() {
    vec3 p = position;

    // Lazy drifting: slow sine waves on each axis, each firefly with its own phase
    // and speed (from aSeed). They wander in a ~0.5 m bubble around their home spot.
    float t = uTime * (0.3 + aSeed * 0.4) + aSeed * 50.0;
    p.x += sin(t * 1.1) * 0.5;
    p.y += sin(t * 1.7) * 0.25;
    p.z += cos(t * 0.9) * 0.5;

    // Standard projection: model → camera ("view") space → screen.
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    // gl_PointSize = how many pixels wide the dot is. Dividing by the distance
    // (-viewPosition.z = how far in front of the camera) makes far fireflies smaller,
    // like real perspective ("size attenuation").
    gl_PointSize = uSize * uPixelRatio / -viewPosition.z;
    // Step 12: …but cap it. A firefly passing right by the camera would otherwise
    // become a huge blob filling half the screen.
    gl_PointSize = min(gl_PointSize, 28.0 * uPixelRatio);

    // Blink: a sine wave pushed through pow() spends most of its time near 0 and
    // pops up briefly → short flashes with dim pauses, like real fireflies.
    float blink = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 30.0);
    vGlow = pow(blink, 4.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vGlow;

  void main() {
    // gl_PointCoord: where in the point's square we are, (0,0) to (1,1).
    // Distance from the centre → a soft round dot instead of a hard square.
    float d = length(gl_PointCoord - 0.5);
    float strength = smoothstep(0.5, 0.0, d); // 1 at the centre → 0 at the edge
    strength = pow(strength, 2.0); // concentrate the glow in the middle

    // gl_FragColor = the colour of this pixel (r, g, b, alpha).
    // Step 12: up to ~4.5× the colour at the peak of a flash → above the bloom
    // threshold, so each flash gets a soft halo.
    gl_FragColor = vec4(uColor * (0.5 + vGlow * 4.0), strength * (0.2 + vGlow));
  }
`

export function createFireflies(center, count = 90) {
  const random = createRandom(42)

  // A BufferGeometry with no faces — just points. We fill the attributes ourselves:
  //   position — 3 numbers per firefly (its home spot)
  //   aSeed    — 1 number per firefly
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Scatter in a disc around the clearing (polar coordinates once more). sqrt() on
    // the radius spreads them EVENLY over the area — without it they'd bunch up in
    // the middle (there's less area near the centre of a circle).
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * 11
    const x = center.x + Math.sin(angle) * radius
    const z = center.z + Math.cos(angle) * radius
    positions[i * 3 + 0] = x
    positions[i * 3 + 1] = getTerrainHeight(x, z) + 0.4 + random() * 1.8 // 0.4–2.2 m up
    positions[i * 3 + 2] = z
    seeds[i] = random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 140 }, // base size in pixels at 1 m away (shrinks with distance)
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(0xd9ff7a) }, // firefly yellow-green
    },
    transparent: true,
    blending: THREE.AdditiveBlending, // glows add up, like the flames
    depthWrite: false, // glowing dots shouldn't hide each other
  })

  const fireflies = new THREE.Points(geometry, material)
  fireflies.name = 'Fireflies'
  // The points move in the shader, but three.js only knows their HOME positions; one
  // could drift just outside the computed bounds and get culled at the screen edge.
  // With so few, it's simplest to always draw them.
  fireflies.frustumCulled = false

  function update(seconds) {
    material.uniforms.uTime.value = seconds
  }

  return { points: fireflies, update }
}
