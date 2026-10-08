// =============================================================
// Low-poly 3D clouds (extra step, after Step 12)
// =============================================================
// Each cloud is a little cluster of chunky, flat-shaded "puffs" (icosahedrons, like our
// rocks — Step 1 — just white and fluffy). A cloud = 5–8 puffs; 14 clouds = ~90 puffs.
//
// Reusing Step 5: ALL the puffs of ALL the clouds go into ONE InstancedMesh → the whole
// sky of clouds is a single draw call.
//
// Building a puff's matrix needs TWO levels of transform: where the CLOUD is in the sky,
// and where the PUFF sits inside its cloud. Multiplying two matrices combines them —
// exactly what the scene graph does for parents and children (Step 6), done by hand.

import * as THREE from 'three'

// Same seeded random as nature.js (Step 5): the same sky on every reload.
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

const CLOUD_COUNT = 14

export function createClouds(center) {
  const random = createRandom(11)

  // ----- First, decide every puff (cloud transform × puff transform) -----
  const cloudMatrix = new THREE.Matrix4()
  const puffMatrix = new THREE.Matrix4()
  const dummy = new THREE.Object3D()
  const puffs = [] // the final matrices, one per puff

  for (let c = 0; c < CLOUD_COUNT; c++) {
    // Where the cloud floats: in a ring 20–40 m from the clearing, 9–15 m up — low
    // enough to hang above the treeline, like evening clouds near the horizon.
    // (The sky box reaches 45 m and the camera sees up to 100 m — both comfortably fit.)
    const angle = (c / CLOUD_COUNT) * Math.PI * 2 + random() * 0.4
    const distance = 20 + random() * 20
    dummy.position.set(
      center.x + Math.sin(angle) * distance,
      9 + random() * 6,
      center.z + Math.cos(angle) * distance,
    )
    dummy.rotation.set(0, random() * Math.PI * 2, 0)
    dummy.scale.setScalar(1.8 + random() * 1.6) // some small, some big
    dummy.updateMatrix()
    cloudMatrix.copy(dummy.matrix)

    // The puffs of this cloud: spread along the cloud's own x axis (clouds are wider
    // than tall), biggest in the middle, flattened at the bottom.
    const puffCount = 5 + Math.floor(random() * 4)
    for (let p = 0; p < puffCount; p++) {
      const along = (p / (puffCount - 1)) * 2 - 1 // -1 … +1 across the cloud
      const size = (1 - Math.abs(along) * 0.55) * (0.9 + random() * 0.4)
      dummy.position.set(along * 3.4 + (random() - 0.5) * 0.8, random() * 0.35, (random() - 0.5) * 1.6)
      dummy.rotation.set(random() * 3, random() * 3, random() * 3)
      dummy.scale.set(size * 1.4, size * 0.7, size) // wide and squashed: fluffy, not round
      dummy.updateMatrix()
      puffMatrix.copy(dummy.matrix)

      // cloudMatrix × puffMatrix = "first place the puff inside the cloud, then place
      // the cloud in the sky". Order matters with matrices (like with rotations).
      puffs.push(new THREE.Matrix4().multiplyMatrices(cloudMatrix, puffMatrix))
    }
  }

  // ----- Then build the single InstancedMesh -----
  const geometry = new THREE.IcosahedronGeometry(1, 1) // 80 faces: chunky but roundish
  const material = new THREE.MeshStandardMaterial({
    color: 0xfff1ea, // warm white: the sunset tints them further
    roughness: 1,
    flatShading: true, // the low-poly look
    // Self-light, so the sides facing away from the low sun read as soft sunset pink,
    // not grey rocks hanging in the sky. (First tried a dim lilac: too heavy.)
    // Real sunset clouds are lit by the whole glowing sky, not just the sun.
    emissive: 0xd9a39a,
    emissiveIntensity: 0.55,
    // Our fog fades everything beyond ~40 m to the haze colour (Step 8). Clouds live
    // out there, so they'd vanish — fog: false lets them ignore it.
    fog: false,
  })

  const clouds = new THREE.InstancedMesh(geometry, material, puffs.length)
  puffs.forEach((matrix, i) => clouds.setMatrixAt(i, matrix))
  clouds.name = 'Clouds'
  // Clouds neither cast nor receive our shadows (the shadow box only covers the
  // clearing anyway — Step 8).
  clouds.castShadow = false
  clouds.receiveShadow = false

  // ----- Drift: the whole sky of clouds turns slowly around the clearing -----
  // We rotate the InstancedMesh itself; its pivot must be the clearing, so we move the
  // mesh there and shift every puff back by the same amount. (The pivot trick from
  // Step 6, applied to an InstancedMesh.)
  clouds.position.set(center.x, 0, center.z)
  const shift = new THREE.Matrix4().makeTranslation(-center.x, 0, -center.z)
  const m = new THREE.Matrix4()
  for (let i = 0; i < puffs.length; i++) {
    clouds.getMatrixAt(i, m)
    clouds.setMatrixAt(i, m.premultiply(shift))
  }
  clouds.instanceMatrix.needsUpdate = true
  // The bounding sphere (used to skip off-screen objects) must include every puff.
  clouds.computeBoundingSphere()

  function update(seconds) {
    clouds.rotation.y = seconds * 0.004 // one full turn every ~26 minutes: lazy drift
  }

  return { mesh: clouds, update }
}
