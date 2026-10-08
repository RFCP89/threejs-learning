// =============================================================
// Step 9 — Animated water: our first shader code (GLSL)
// =============================================================
// WHAT'S A SHADER? A small program that runs on the GPU, massively in parallel:
//   - the VERTEX shader runs once per vertex  → decides WHERE each point lands on screen
//   - the FRAGMENT shader runs once per pixel → decides the COLOUR of each pixel
// They're written in GLSL, a C-like language. Every three.js material is secretly a
// pair of shaders that three.js writes for us.
//
// OUR APPROACH: instead of writing a water shader from scratch (we'd lose all the
// lighting, sky reflections, fog and shadows from Step 8 and have to rebuild them),
// we take MeshStandardMaterial and INJECT a few lines into its shaders with
// `onBeforeCompile`. Our lines bend the surface NORMALS with moving waves.
//
// The water plane stays perfectly FLAT. But lighting and reflections are computed
// from normals (Step 2!), so if the normals wobble, the sun glints and the mirrored
// sky wobble too → it LOOKS like rippling, flowing water. This trick is everywhere
// in games: it's the idea behind "normal maps".

import * as THREE from 'three'
import { WATER_LEVEL } from './terrain.js'

// ----- Uniforms: values we send from JavaScript to the shader ----------------------
// A uniform is the same for every vertex/pixel in one frame ("uniform" across them).
// We keep the object here; the shader receives a reference to the SAME object, so
// writing uniforms.uTime.value = … in the render loop updates the shader each frame.
const uniforms = {
  uTime: { value: 0 },
}

export function updateWater(seconds) {
  uniforms.uTime.value = seconds
}

// ----- GLSL snippets ----------------------------------------------------------------
// (/* glsl */ is just a comment some editors use to colour the code inside the string.)

// VERTEX SHADER additions.
// A "varying" carries a value from the vertex shader to the fragment shader; for each
// pixel the GPU blends the values of the triangle's 3 corners. We pass each point's
// WORLD position so the fragment shader knows where on the creek a pixel is.
const vertexHeader = /* glsl */ `
  varying vec3 vWaterWorldPos;
`
const vertexMain = /* glsl */ `
  // modelMatrix: the mesh's position/rotation/scale (Step 5's matrices!).
  // 'transformed' is three.js's name for the current vertex position.
  vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`

// FRAGMENT SHADER additions.
const fragmentHeader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWaterWorldPos;

  // One travelling wave: height = amp · sin(phase), where the phase moves along
  // 'dir' over time. We don't need the height itself, only its SLOPE (gradient):
  // how steeply the surface tilts in x and in z. Calculus: d/dp of sin is cos.
  vec2 waveSlope(vec2 p, vec2 dir, float frequency, float speed, float amp) {
    dir = normalize(dir);
    float phase = dot(dir, p) * frequency - uTime * speed;
    return dir * amp * frequency * cos(phase);
  }
`
const fragmentMain = /* glsl */ `
  {
    vec2 p = vWaterWorldPos.xz;

    // Add up a few waves with different directions, sizes and speeds. One wave looks
    // like corrugated metal; several, crossing each other, look natural.
    // The creek runs roughly along +x, so most waves travel that way (the current).
    // Amplitudes are kept small: it's a CALM creek. (Try doubling them!)
    vec2 slope = vec2(0.0);
    slope += waveSlope(p, vec2( 1.0,  0.25),  3.0, 1.6, 0.022); // long, slow swell
    slope += waveSlope(p, vec2( 0.8, -0.6 ),  5.5, 2.2, 0.012);
    slope += waveSlope(p, vec2( 1.0,  0.9 ),  9.0, 3.1, 0.007); // small ripples
    slope += waveSlope(p, vec2(-0.3,  1.0 ), 14.0, 2.4, 0.004); // tiny cross-ripples

    // Turn the slope into a normal: a flat surface's normal is (0, 1, 0); tilting it
    // by the slope gives (-slope.x, 1, -slope.y). normalize() makes its length 1.
    vec3 waterNormalWorld = normalize(vec3(-slope.x, 1.0, -slope.y));

    // three.js does its lighting in VIEW space (relative to the camera), so convert.
    // 'normal' is the variable the rest of three.js's lighting code reads.
    normal = normalize((viewMatrix * vec4(waterNormalWorld, 0.0)).xyz);
  }
`

export function createWater() {
  // One flat plane the size of the world, at WATER_LEVEL (the Step 4 trick: only the
  // parts above the carved creek bed are visible; the ground hides the rest).
  const geometry = new THREE.PlaneGeometry(40, 40)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color: 0x2f6f7c, // teal creek water
    roughness: 0.08, // very smooth → crisp sun glints and a clear mirror of the sky
    metalness: 0,
    transparent: true, // see the creek bed through it
    opacity: 0.8,
  })

  // onBeforeCompile runs once, just before three.js compiles the material's shaders.
  // `shader.vertexShader` / `shader.fragmentShader` are the full GLSL source as text,
  // built from named pieces ("chunks") like '#include <begin_vertex>'. We find a chunk
  // and replace it with: the same chunk + our code right after it.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + vertexHeader)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + vertexMain)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + fragmentHeader)
      // normal_fragment_maps is where three.js applies normal maps — the perfect spot
      // to override the normal with our waves.
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + fragmentMain)
      // Step 12: cap the brightness. The low sun reflecting on smooth water produces
      // HUGE values (far above 1). Before bloom, tone mapping just turned them white;
      // with bloom they flooded half the screen with glare. opaque_fragment is where
      // the final colour (gl_FragColor) is written — right after it, we clamp it:
      // the glints still sparkle and glow, just not blindingly.
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n' + 'gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(2.5));')
  }

  const water = new THREE.Mesh(geometry, material)
  water.position.y = WATER_LEVEL
  return water
}
