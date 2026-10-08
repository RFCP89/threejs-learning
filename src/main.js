// =============================================================
// Step 1 — Scene, Camera, Renderer, and the Render Loop
// Step 2 — Lights & Materials (sections 4 and 5)
// =============================================================
// Every three.js app is built from the same three pieces:
//
//   SCENE    → the "world": a container holding everything (objects, lights)
//   CAMERA   → the "eye": decides what part of the world we see
//   RENDERER → the "painter": takes scene + camera and draws a picture on the <canvas>
//
// Then a LOOP asks the renderer to paint a new picture ~60 times per second.
// Change something between pictures (e.g. rotate an object) → animation!

// Import the whole library under the name THREE.
// Vite resolves 'three' to node_modules/three for us.
import * as THREE from 'three'

// -------------------------------------------------------------
// 1. The canvas — the HTML element we draw on (see index.html)
// -------------------------------------------------------------
const canvas = document.querySelector('#scene')

// -------------------------------------------------------------
// 2. The scene — an empty world
// -------------------------------------------------------------
const scene = new THREE.Scene()
// A background colour for the world. Hex colours work like in CSS: 0xRRGGBB.
scene.background = new THREE.Color(0x0b1a14) // deep forest green

// -------------------------------------------------------------
// 3. The camera
// -------------------------------------------------------------
// PerspectiveCamera mimics a real eye/lens: far things look smaller.
// Its 4 arguments:
//   fov    — field of view, vertical, in degrees (how "wide" the lens is)
//   aspect — width / height of the image (must match the canvas or it stretches)
//   near   — anything closer than this is not drawn
//   far    — anything further than this is not drawn
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// Coordinates in three.js: x = right, y = up, z = towards you (out of the screen).
// The camera starts at (0,0,0) — the same spot as our object, so we'd see nothing.
// Move it back (z) and a little up (y):
camera.position.set(0, 1, 5)
// Point the camera at the centre of the world.
camera.lookAt(0, 0, 0)

// -------------------------------------------------------------
// 4. An object — our first rock
// -------------------------------------------------------------
// A visible object is a MESH = GEOMETRY (the shape) + MATERIAL (the surface).

// Geometry: an icosahedron (20 triangles). radius 1, detail 0 = chunky and low-poly,
// which already looks a lot like a stylised stone.
const rockGeometry = new THREE.IcosahedronGeometry(1, 0)

// Material (Step 2): MeshStandardMaterial is three.js's "physically based" (PBR)
// material — it reacts to light the way real surfaces do. It is described by:
//   color     — the base colour of the surface (in light, not in shadow)
//   roughness — 0 = mirror-smooth (sharp shiny highlight), 1 = chalky/matte (no shine)
//   metalness — 0 = non-metal (stone, wood, skin, cloth), 1 = metal. Stone is 0.
// Unlike Step 1's MeshNormalMaterial, it is BLACK without lights (see section 5).
// flatShading makes each triangle a single flat tone → crisp low-poly facets.
const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x8f8778, // warm grey stone
  roughness: 0.9, // dry stone: almost no shine
  metalness: 0,
  flatShading: true,
})

const rock = new THREE.Mesh(rockGeometry, rockMaterial)
// Squash it a little so it looks like a creek pebble rather than a gem.
rock.scale.set(1.2, 0.7, 1)

// Nothing is visible until it's added to the scene.
scene.add(rock)

// A second, smaller pebble — this one wet and worn SMOOTH by the creek.
// Two differences from the rock, each teaching something:
//  1. LOW roughness (0.2) + darker colour → a shiny highlight, like wet stone.
//  2. SMOOTH shading: more triangles (detail 2 = 320 faces instead of 20) and no
//     flatShading. three.js then blends the lighting across faces, so the surface
//     looks rounded and the highlight shows up as a soft bright spot.
//     (With flat facets, the highlight only appears if one facet happens to sit at
//     exactly the right angle between sun and camera — usually none does.)
const wetPebbleGeometry = new THREE.IcosahedronGeometry(1, 2)
const wetPebbleMaterial = new THREE.MeshStandardMaterial({
  color: 0x4f4a42,
  roughness: 0.2,
  metalness: 0,
})
const wetPebble = new THREE.Mesh(wetPebbleGeometry, wetPebbleMaterial)
wetPebble.scale.set(0.5, 0.3, 0.45) // smaller and flatter
wetPebble.position.set(1.9, -0.35, 0.6) // to the right, a bit lower and closer to us
scene.add(wetPebble)

// -------------------------------------------------------------
// 5. Lights — golden hour by the creek
// -------------------------------------------------------------
// Real scenes are lit by a mix of DIRECT light (the sun: one direction, makes clear
// bright and dark sides) and INDIRECT light (light bounced around by sky and ground,
// which keeps shadows from being pitch black). We fake both with two lights:

// HemisphereLight = soft light from everywhere: one colour from above (the sky),
// another from below (light bouncing off the ground), blending in between.
// It has no position that matters — it lights every surface by which way it faces.
const skyLight = new THREE.HemisphereLight(
  0xffe2b8, // sky colour: warm evening haze
  0x2f4a3a, // ground colour: green, bounced off grass
  1.0, // intensity
)
scene.add(skyLight)

// DirectionalLight = the sun. Its rays are parallel (the sun is very far away), so only
// the DIRECTION matters: it shines from `position` towards `target` (default: 0,0,0).
// Low on the horizon + orange = golden hour.
const sun = new THREE.DirectionalLight(0xffb36b, 3.0)
sun.position.set(4, 2.5, 3) // right, slightly up, in front → light from the front-right
scene.add(sun)

// Helpers are debug visuals: this draws a small square + line showing where the sun is
// and which way it points. Set DEBUG to false to hide it.
const DEBUG = true
if (DEBUG) {
  scene.add(new THREE.DirectionalLightHelper(sun, 0.5))
}

// -------------------------------------------------------------
// 6. The renderer
// -------------------------------------------------------------
// WebGLRenderer draws with the GPU onto our canvas.
// antialias smooths the jagged edges of triangles.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
// High-DPI screens (phones, retina) have 2–3 real pixels per CSS pixel.
// Matching that makes it sharp, but capping at 2 keeps it fast.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// -------------------------------------------------------------
// 7. Handle window resizing
// -------------------------------------------------------------
// Without this, resizing the browser stretches/squashes the picture.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  // Cameras cache their maths; after changing settings you must tell them to recompute.
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// -------------------------------------------------------------
// 8. The render loop
// -------------------------------------------------------------
// setAnimationLoop calls our function once per screen refresh (usually 60×/s).
// It passes `time`: milliseconds since the page started.
renderer.setAnimationLoop((time) => {
  const seconds = time / 1000

  // Rotation is in RADIANS (a full turn = 2π ≈ 6.28).
  // Basing rotation on elapsed time (not "+0.01 per frame") means it spins at the
  // same speed on a 60 Hz and a 144 Hz monitor.
  rock.rotation.y = seconds * 0.5 // half a radian per second
  // A gentle bob up and down. Math.sin swings smoothly between -1 and 1.
  rock.position.y = Math.sin(seconds * 1.5) * 0.15

  // Paint one picture of the scene, as seen by the camera.
  renderer.render(scene, camera)
})
