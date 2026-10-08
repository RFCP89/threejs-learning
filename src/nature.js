// =============================================================
// Step 5 — Nature: lots of rocks and trees with INSTANCING
// =============================================================
// The problem: every Mesh we add costs one "draw call" — one round-trip where the CPU
// tells the GPU "now draw this". 200 trees as 200 Meshes = 200+ draw calls per frame,
// 60 times a second. Draw calls, not triangles, are usually what makes scenes slow.
//
// The solution: InstancedMesh. ONE geometry + ONE material + a list of transforms
// (position/rotation/scale, one per copy). The GPU draws ALL copies in ONE draw call.
// The catch: all copies share the same shape and material (but colours CAN vary).

import * as THREE from 'three'
import { CREEK_HALF_WIDTH, creekCenterZ, distanceToCreek, getTerrainHeight } from './terrain.js'

// The clearing: an open patch of grass where Jesus and the disciples will gather
// (Steps 6–7). No trees may grow here. Exported so other modules can use the same spot.
export const CLEARING = { x: 1, z: 3, radius: 6 }

// How far out from the centre we place things (the ground is 40×40, so ±20; we stay
// a little inside the edge).
const WORLD_HALF_SIZE = 18

// ----- A seeded random number generator ----------------------------------------
// Math.random() gives different numbers every page load → trees would jump around
// on every reload. A SEEDED generator gives the same "random" sequence every time
// for the same seed: random-looking, but reproducible. Change SEED → a new forest.
// (This is "mulberry32", a tiny well-known generator. You don't need to understand
// the bit-twiddling — just that it returns numbers between 0 and 1, like Math.random.)
const SEED = 7
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

// A few helpers built on top of a random() function.
function between(random, min, max) {
  return min + random() * (max - min)
}

function isInClearing(x, z) {
  // Pythagoras: distance between two points = √(dx² + dz²). Math.hypot does exactly that.
  return Math.hypot(x - CLEARING.x, z - CLEARING.z) < CLEARING.radius
}

// =============================================================
// Rocks — scattered along the creek, some in the water
// =============================================================
export function createRocks(count = 70) {
  const random = createRandom(SEED)

  const geometry = new THREE.IcosahedronGeometry(1, 0) // same chunky shape as our hero rock
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, // white: the per-instance colours below are multiplied with this
    roughness: 0.9,
    flatShading: true,
  })

  // InstancedMesh(geometry, material, how many copies)
  const rocks = new THREE.InstancedMesh(geometry, material, count)

  // A "dummy" Object3D: an invisible helper we use only to BUILD each transform with
  // the friendly position/rotation/scale API, then copy out as a matrix.
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    // Most rocks hug the creek: pick a point along it, then step sideways a bit.
    const x = between(random, -WORLD_HALF_SIZE, WORLD_HALF_SIZE)
    const side = random() < 0.5 ? -1 : 1
    const z = creekCenterZ(x) + side * between(random, 0, CREEK_HALF_WIDTH * 1.6)

    // Random size: small stones to boulders. Non-uniform → each one a different shape.
    const size = between(random, 0.12, 0.45)
    dummy.scale.set(size * between(random, 0.8, 1.5), size * between(random, 0.5, 0.9), size)
    dummy.rotation.set(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI)
    // Sink each rock ~40% into the ground (like the hero rock in Step 3).
    dummy.position.set(x, getTerrainHeight(x, z) + dummy.scale.y * 0.4, z)

    // updateMatrix() packs position + rotation + scale into one 4×4 MATRIX — the
    // compact form the GPU uses for transforms. setMatrixAt stores it for copy i.
    dummy.updateMatrix()
    rocks.setMatrixAt(i, dummy.matrix)

    // Per-instance colour: slightly different greys/browns so they don't look cloned.
    // setHSL(hue 0..1, saturation 0..1, lightness 0..1) — often easier than hex
    // for "a bit more of this, a bit less of that".
    // Kept dark and barely saturated: the warm orange sun already tints them a lot.
    color.setHSL(between(random, 0.08, 0.12), between(random, 0.02, 0.08), between(random, 0.2, 0.34))
    rocks.setColorAt(i, color)
  }

  return rocks
}

// =============================================================
// Trees — a simple low-poly tree: trunk + round canopy
// =============================================================
// One tree = 2 shapes with 2 materials (brown wood, green leaves). An InstancedMesh
// has only ONE material, so we use TWO InstancedMeshes (trunks, canopies) that share
// exactly the same list of transforms. 2 draw calls for the whole forest.
export function createTrees(count = 120) {
  // Different seed than the rocks, so the two don't follow the same pattern.
  const random = createRandom(SEED + 1)

  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments).
  // Geometries are built CENTRED on (0,0,0) — half the trunk would be underground.
  // translate() moves the vertices so the trunk's BASE sits at y = 0 and the canopy
  // sits on top. Now a tree's position = the point where it meets the ground. Handy!
  const trunkGeometry = new THREE.CylinderGeometry(0.08, 0.13, 1.4, 6)
  trunkGeometry.translate(0, 0.7, 0) // half its height up

  const canopyGeometry = new THREE.IcosahedronGeometry(0.85, 1) // 80 faces, roundish
  canopyGeometry.translate(0, 1.75, 0) // on top of the trunk

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3f2a, roughness: 1, flatShading: true })
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true })

  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count)
  const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, count)

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  let placed = 0
  let attempts = 0
  // "Rejection sampling": throw a random point; if it's in a forbidden place
  // (creek, clearing), throw again. Stop after enough trees or too many tries.
  while (placed < count && attempts < count * 20) {
    attempts++
    const x = between(random, -WORLD_HALF_SIZE, WORLD_HALF_SIZE)
    const z = between(random, -WORLD_HALF_SIZE, WORLD_HALF_SIZE)

    if (distanceToCreek(x, z) < CREEK_HALF_WIDTH + 1.5) continue // too wet
    if (isInClearing(x, z)) continue // keep the gathering place open

    const size = between(random, 0.8, 1.6)
    dummy.scale.set(size, size * between(random, 0.9, 1.3), size)
    dummy.rotation.set(0, random() * Math.PI * 2, 0) // only spin around y — trees grow up!
    dummy.position.set(x, getTerrainHeight(x, z) - 0.05, z) // base just below the surface
    dummy.updateMatrix()

    // The SAME matrix for both parts, so the canopy always sits on its own trunk.
    trunks.setMatrixAt(placed, dummy.matrix)
    canopies.setMatrixAt(placed, dummy.matrix)

    // Olive-to-fresh greens for the leaves.
    color.setHSL(between(random, 0.2, 0.3), between(random, 0.35, 0.55), between(random, 0.22, 0.35))
    canopies.setColorAt(placed, color)

    placed++
  }

  // If rejection sampling gave up early, only draw the copies we actually placed.
  trunks.count = placed
  canopies.count = placed

  // A Group bundles several objects so they can be added/moved as one.
  const trees = new THREE.Group()
  trees.add(trunks, canopies)
  return trees
}
