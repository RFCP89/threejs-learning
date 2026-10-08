// =============================================================
// Step 1 — Scene, Camera, Renderer, and the Render Loop
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

// Material: MeshNormalMaterial colours each face by the direction it points.
// It's a debugging material that needs NO lights — perfect for a first step,
// because without lights most materials render pitch black. (Lights = Step 2.)
// flatShading makes each triangle a single flat colour → crisp facets.
const rockMaterial = new THREE.MeshNormalMaterial({ flatShading: true })

const rock = new THREE.Mesh(rockGeometry, rockMaterial)
// Squash it a little so it looks like a creek pebble rather than a gem.
rock.scale.set(1.2, 0.7, 1)

// Nothing is visible until it's added to the scene.
scene.add(rock)

// -------------------------------------------------------------
// 5. The renderer
// -------------------------------------------------------------
// WebGLRenderer draws with the GPU onto our canvas.
// antialias smooths the jagged edges of triangles.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
// High-DPI screens (phones, retina) have 2–3 real pixels per CSS pixel.
// Matching that makes it sharp, but capping at 2 keeps it fast.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// -------------------------------------------------------------
// 6. Handle window resizing
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
// 7. The render loop
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
