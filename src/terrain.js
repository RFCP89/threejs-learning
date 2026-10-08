// =============================================================
// Step 4 — The terrain: ground with a creek carved into it, and the water
// =============================================================
// This is our first MODULE: a separate file that `export`s things, which main.js
// then `import`s. Splitting code by topic keeps each file small and readable.
//
// The big idea of this step: a geometry is just a list of VERTICES (points) that we
// can read and move with code. We start from a flat, finely divided plane and push
// every vertex up or down using a height function → hills, banks and a creek bed.

import * as THREE from 'three'

// ----- Shape of the creek (all in metres) --------------------------------------
// Step 5: exported, so nature.js can keep trees out of the creek.
export const CREEK_HALF_WIDTH = 1.5 // from the centre line to the water's edge (roughly)
const CREEK_DEPTH = 0.8 // how deep the bed is carved at the centre
const BANK_WIDTH = 1.0 // how far the slope extends beyond the edge, into the grass

// The water surface is one flat plane at this height. Where the ground dips below it
// (the creek bed) we see water; everywhere else the ground covers it. Cheap trick!
export const WATER_LEVEL = -0.35

// The creek's centre line: for every x along the world, which z is the middle of the
// creek? A sine wave gives a lazy, natural-looking meander.
//   -2   → the creek runs 2 m behind the origin (behind our rock)
//   1.5  → it swings 1.5 m either side of that
//   0.25 → how stretched the bends are (smaller = longer, gentler bends)
export function creekCenterZ(x) {
  return -2 + Math.sin(x * 0.25) * 1.5
}

// Step 5: how far is a point from the creek's centre line? (Measured along z only —
// a good-enough approximation since the bends are gentle.) Used by the height function
// below AND by nature.js to decide where trees may grow.
export function distanceToCreek(x, z) {
  return Math.abs(z - creekCenterZ(x))
}

// ----- The height function: the heart of the terrain ---------------------------
// Given any (x, z) on the ground, return the ground's height y there.
// It's exported so other code can ask "how high is the ground here?" — e.g. to
// place rocks (and later, people and trees) exactly ON the surface.
export function getTerrainHeight(x, z) {
  // 1. Gentle rolling ground: a couple of sine waves mixed together.
  //    Small amplitudes (0.12, 0.05) → soft bumps, not mountains.
  const rolling = 0.12 * Math.sin(x * 0.5) * Math.cos(z * 0.4) + 0.05 * Math.sin(x * 1.3 + z * 0.9)

  // 2. The creek channel. First: how far is this point from the creek's centre line?
  const distance = distanceToCreek(x, z)

  // smoothstep(value, min, max) returns 0 below min, 1 above max, and a smooth
  // S-curve in between. Here: 0 near the centre → 1 out on the grass.
  // We flip it (1 − …) so `carve` is 1 in the middle of the creek, 0 far away.
  const carve =
    1 - THREE.MathUtils.smoothstep(distance, CREEK_HALF_WIDTH * 0.4, CREEK_HALF_WIDTH + BANK_WIDTH)

  // 3. Combine: rolling ground, pushed down by the creek where `carve` is high.
  return rolling - CREEK_DEPTH * carve
}

// ----- Colours for the ground (per vertex) --------------------------------------
const grassColor = new THREE.Color(0x5c7a3e)
const bankColor = new THREE.Color(0x8a7655) // muddy-sand bank
const bedColor = new THREE.Color(0x5a4b38) // dark wet creek bed

// ----- Build the ground mesh -----------------------------------------------------
export function createGround() {
  // PlaneGeometry(width, height, widthSegments, heightSegments).
  // In Step 3 it had 1×1 segments (just 2 triangles, 4 vertices) — you can't carve a
  // creek into 4 points! 160×160 segments = 161×161 = 25,921 vertices: enough detail.
  const geometry = new THREE.PlaneGeometry(40, 40, 160, 160)

  // In Step 3 we rotated the MESH (ground.rotation.x). Here we rotate the GEOMETRY
  // instead: rotateX moves the vertices themselves. After this, each vertex's own
  // x/y/z ARE world-like coordinates: x = right, y = up, z = forward. That makes the
  // height maths below simple: just set y.
  geometry.rotateX(-Math.PI / 2)

  // The vertex positions live in an "attribute": one long flat array of numbers
  // [x0, y0, z0, x1, y1, z1, ...]. getX(i)/setY(i) read and write vertex number i.
  const positions = geometry.attributes.position

  // We'll also give each vertex its own colour. 3 numbers (r, g, b) per vertex.
  const colors = new Float32Array(positions.count * 3)
  const color = new THREE.Color() // reused for every vertex (no garbage per loop)

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const y = getTerrainHeight(x, z)
    positions.setY(i, y)

    // Colour by height: below the water → dark bed; around the waterline → bank
    // mud; higher → grass. lerpColors(a, b, t) blends a→b by t (0..1).
    if (y < WATER_LEVEL) {
      color.lerpColors(bedColor, bankColor, THREE.MathUtils.smoothstep(y, WATER_LEVEL - 0.3, WATER_LEVEL))
    } else {
      color.lerpColors(bankColor, grassColor, THREE.MathUtils.smoothstep(y, WATER_LEVEL, WATER_LEVEL + 0.35))
    }
    colors[i * 3 + 0] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  // Attach the colours as a new attribute called "color" (3 numbers per vertex).
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // VERY IMPORTANT: lighting uses each vertex's NORMAL (the direction the surface
  // faces, Step 2). We moved the vertices, but the normals still say "flat, facing up"
  // → the hills would be lit like a flat floor. This recomputes them from the new shape.
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    // vertexColors: use our per-vertex "color" attribute. The material's own `color`
    // is MULTIPLIED with it, so it stays white (= ×1, no change).
    vertexColors: true,
    roughness: 1,
  })

  return new THREE.Mesh(geometry, material)
}

// (Step 9: createWater() moved to its own module, src/water.js, and got a shader.)
