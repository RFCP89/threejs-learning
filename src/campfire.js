// =============================================================
// Step 10 — The campfire: a PointLight that flickers, and flames that "add light"
// =============================================================
// New ideas:
//   - PointLight: light from ONE POINT in all directions, fading with distance —
//     like a bulb, a candle… or a fire. (Step 2 had the other kinds.)
//   - Flicker: a light whose intensity changes every frame, driven by a few
//     sine waves at odd speeds so it never looks like a regular pulse.
//   - Additive blending: flames don't BLOCK what's behind them, they ADD light to it.

import * as THREE from 'three'

export function createCampfire() {
  const fire = new THREE.Group()
  fire.name = 'Campfire'

  // ----- Stones in a ring (polar coordinates again — Step 7) -----
  const stoneGeometry = new THREE.IcosahedronGeometry(0.11, 0)
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x5b5650, roughness: 0.95, flatShading: true })
  const STONES = 9
  for (let i = 0; i < STONES; i++) {
    const angle = (i / STONES) * Math.PI * 2
    const stone = new THREE.Mesh(stoneGeometry, stoneMaterial)
    stone.position.set(Math.sin(angle) * 0.42, 0.04, Math.cos(angle) * 0.42)
    stone.rotation.set(i, i * 2, i * 3) // any "random-looking" but fixed rotation
    stone.scale.set(1.2, 0.7, 1)
    fire.add(stone)
  }

  // ----- Logs: 4 cylinders leaning into a little teepee -----
  const logGeometry = new THREE.CylinderGeometry(0.035, 0.045, 0.6, 6).translate(0, 0.3, 0)
  const logMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 1, flatShading: true })
  for (let i = 0; i < 4; i++) {
    // A Group per log so we can turn it around y (which side it's on) and THEN tilt it
    // inwards around x — order matters with rotations, a group per step keeps it simple.
    const holder = new THREE.Group()
    holder.rotation.y = (i / 4) * Math.PI * 2 + 0.4
    const log = new THREE.Mesh(logGeometry, logMaterial)
    log.position.z = 0.22 // start out at the edge…
    log.rotation.x = -0.65 // …and lean in towards the centre
    holder.add(log)
    fire.add(holder)
  }

  // ----- Flames: glowing cones that ADD light -----
  // MeshBasicMaterial ignores lighting (a flame doesn't need light to be seen — it IS
  // light). AdditiveBlending: the flame's colour is ADDED to whatever is behind it, so
  // overlapping flames get brighter, like real fire, and dark edges never appear.
  // depthWrite: false — transparent glowing things shouldn't hide each other.
  // toneMapped: false keeps them saturated instead of being compressed by ACES.
  const flameGeometry = new THREE.ConeGeometry(0.12, 0.5, 7).translate(0, 0.25, 0) // base at y=0
  const flameColors = [0xff5a1f, 0xff8a2a, 0xffc04a] // outer red-orange → inner yellow
  const flames = flameColors.map((color, i) => {
    const flame = new THREE.Mesh(
      flameGeometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    const size = 1 - i * 0.25 // each inner flame a bit smaller
    flame.scale.setScalar(size)
    flame.position.y = 0.05
    flame.userData.baseScale = size
    flame.castShadow = false // flames are light, they don't cast shadows
    fire.add(flame)
    return flame
  })

  // ----- The light -----
  // PointLight(color, intensity, distance, decay)
  //   intensity — in candela (three.js uses real-world units since r155)
  //   distance  — 0 = no hard cut-off; the light just fades physically
  //   decay     — 2 = physically correct: brightness ∝ 1 / distance²
  //               (twice as far → a QUARTER of the light)
  const light = new THREE.PointLight(0xff8a3a, 6, 0, 2)
  light.position.y = 0.35 // in the heart of the flames
  // No shadows from this light: a point light's shadow means rendering the scene 6
  // more times (one per direction of a cube) — expensive, and hardly visible here.
  light.castShadow = false
  fire.add(light)

  // ----- Animation: called every frame from the render loop -----
  function update(seconds) {
    // Flicker = a few sine waves with "unrelated" speeds added together. Because the
    // speeds don't line up, the pattern takes ages to repeat — it feels random.
    const flicker =
      Math.sin(seconds * 10.0) * 0.5 + Math.sin(seconds * 23.0 + 1.3) * 0.3 + Math.sin(seconds * 6.1 + 2.1) * 0.4
    light.intensity = 6 + flicker * 1.5

    // Each flame stretches, squashes and sways at its own pace.
    // "Squash & stretch" (a classic animation principle): when it gets taller it gets
    // thinner — dividing the width by √stretch keeps its volume about the same.
    flames.forEach((flame, i) => {
      const base = flame.userData.baseScale
      const stretch = 1 + Math.sin(seconds * (7 + i * 2.3) + i) * 0.15
      flame.scale.set(base / Math.sqrt(stretch), base * stretch, base / Math.sqrt(stretch))
      flame.rotation.y = seconds * (0.8 + i * 0.5)
      flame.rotation.z = Math.sin(seconds * (3 + i)) * 0.08
    })
  }

  return { group: fire, update }
}
