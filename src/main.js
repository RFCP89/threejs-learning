// =============================================================
// Step 1 — Scene, Camera, Renderer, and the Render Loop
// Step 2 — Lights & Materials (sections 5 and 6)
// Step 3 — The ground & camera controls (sections 3 and 4)
// Step 4 — The creek: carved terrain + water (section 4, and src/terrain.js)
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
// "Addons" are official extras that ship with three.js but aren't part of the core,
// so they're imported one by one from 'three/addons/...'. Curly braces = a named import.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// Step 4: our OWN module. './' means "a file next to this one". We import only the
// names we need; terrain.js decides what it shares with the `export` keyword.
import { createGround, createWater, getTerrainHeight } from './terrain.js'

// -------------------------------------------------------------
// 1. The canvas — the HTML element we draw on (see index.html)
// -------------------------------------------------------------
const canvas = document.querySelector('#scene')

// -------------------------------------------------------------
// 2. The scene — an empty world
// -------------------------------------------------------------
const scene = new THREE.Scene()
// A background colour for the world. Hex colours work like in CSS: 0xRRGGBB.
// Step 3: now that there's a ground and a horizon, a warm evening-sky colour
// reads much better than the dark green we had. (A real sky comes in Step 8.)
scene.background = new THREE.Color(0xe8c9a0)

// -------------------------------------------------------------
// 3. The camera + controls
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
// Move it back (z), up (y) and a bit to the right (x) for a 3/4 view of the ground:
camera.position.set(4, 3, 7)

// OrbitControls (Step 3) let you move the camera with the mouse / touch:
//   left-drag  → orbit (circle around a point)
//   scroll     → zoom (dolly in/out)
//   right-drag → pan (slide sideways)
// The camera always orbits around and looks at `controls.target`.
// It needs the camera to move and the canvas to listen for mouse events on.
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, -1) // between the rock and the creek behind it

// Damping = inertia: after you let go, the camera glides to a stop instead of halting.
// Feels much smoother, but REQUIRES controls.update() every frame (see the render loop).
controls.enableDamping = true
controls.dampingFactor = 0.05

// Limits, so the visitor can't get lost:
controls.minDistance = 2 // can't zoom into the rock
controls.maxDistance = 20 // can't zoom out past the edge of the world
// Polar angle = how far the camera tilts from straight-up (0) to straight-down (π).
// π/2 is level with the horizon; stopping a little before it keeps us above ground.
controls.maxPolarAngle = Math.PI / 2 - 0.1

// -------------------------------------------------------------
// 4. The ground & the creek (built in src/terrain.js)
// -------------------------------------------------------------
// Step 3 had a flat 2-triangle plane here. Step 4 replaces it with a finely divided
// plane whose vertices are pushed up/down to carve a winding creek — see terrain.js.
const ground = createGround()
scene.add(ground)

// A flat sheet of water at WATER_LEVEL: it only shows where the creek dips below it.
const water = createWater()
scene.add(water)

// -------------------------------------------------------------
// 5. The rocks
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
// Step 3: the rock now RESTS on the ground. Its squashed height is about 0.7 below
// its centre, so lifting the centre 0.4 above the ground leaves it partly sunk into
// the earth — real rocks are half-buried, never perfectly balanced on top.
// Step 4: the ground isn't flat any more, so we ASK the terrain how high it is here.
rock.position.y = getTerrainHeight(0, 0) + 0.4
// A slight tilt so it doesn't look placed by a machine.
rock.rotation.set(0.1, 0.6, -0.05)

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
// To the right of the rock, on the slope down to the water — resting on the ground.
wetPebble.position.set(1.9, getTerrainHeight(1.9, 0.6) + 0.15, 0.6)
scene.add(wetPebble)

// -------------------------------------------------------------
// 6. Lights — golden hour by the creek
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

// Helpers are debug visuals. Set DEBUG to false to hide them all.
const DEBUG = true
if (DEBUG) {
  // A small square + line showing where the sun is and which way it points.
  scene.add(new THREE.DirectionalLightHelper(sun, 0.5))
  // Step 3: AxesHelper draws the 3 axes from the origin (0,0,0), 2 metres long:
  //   RED = x (right)   GREEN = y (up)   BLUE = z (towards the starting camera)
  // Orbit around and watch them — it's the best way to build a feel for 3D space.
  // (Lifted 1 cm so the ground doesn't hide the red & blue lines lying on it.)
  const axes = new THREE.AxesHelper(2)
  axes.position.y = 0.01
  scene.add(axes)
}

// -------------------------------------------------------------
// 7. The renderer
// -------------------------------------------------------------
// WebGLRenderer draws with the GPU onto our canvas.
// antialias smooths the jagged edges of triangles.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
// High-DPI screens (phones, retina) have 2–3 real pixels per CSS pixel.
// Matching that makes it sharp, but capping at 2 keeps it fast.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// -------------------------------------------------------------
// 8. Handle window resizing
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
// 9. The render loop
// -------------------------------------------------------------
// setAnimationLoop calls our function once per screen refresh (usually 60×/s).
// It passes `time` (milliseconds since the page started) — unused this step.
//
// Step 3: the rock no longer spins or bobs — it rests on the ground, and now it's
// YOU who moves (the camera). The time-based animation from Step 1 will come back
// for things that really move: water, people breathing, fireflies.
renderer.setAnimationLoop(() => {
  // Apply damping: nudges the camera a little further along its glide each frame.
  controls.update()

  // Paint one picture of the scene, as seen by the camera.
  renderer.render(scene, camera)
})
