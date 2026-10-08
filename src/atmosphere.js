// =============================================================
// Step 8 — Atmosphere: sky, sun direction, environment map, fog
// =============================================================
// Until now, the "sky" was a flat background colour and the sun was a light we
// positioned by hand. Here, ONE sun direction drives everything, so it all agrees:
//   - the Sky shader draws the glowing sun and the sky colours for that direction
//   - the DirectionalLight shines from that direction (and casts shadows, in main.js)
//   - an ENVIRONMENT MAP made from the sky gives every material soft sky-light and
//     something to reflect (the water finally mirrors the sky)

import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'

// ----- Where is the sun? ----------------------------------------------------------
// Two angles, like a real sun-position chart:
//   elevation — degrees above the horizon (0 = sunset, 90 = straight overhead)
//   azimuth   — degrees around the horizon (0 = towards +z, 90 = towards +x)
// Golden hour = a LOW sun: long shadows, warm light, a glowing horizon.
// Azimuth 225° puts the sun IN FRONT of the starting camera, low over the creek and a
// little to the left: we see the sunset, the figures get a warm rim of light, and
// their long shadows stretch towards us. (Try 45°: sun behind us — flat and bluish.)
export const SUN = { elevation: 5, azimuth: 225 }

// Turn those two angles into a direction vector (x, y, z) of length 1.
// Spherical coordinates: radius 1, phi = angle DOWN from straight up, theta = around.
export function getSunDirection() {
  const phi = THREE.MathUtils.degToRad(90 - SUN.elevation)
  const theta = THREE.MathUtils.degToRad(SUN.azimuth)
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
}

// ----- The sky --------------------------------------------------------------------
// Sky is a giant box, drawn from the INSIDE, whose shader computes the colour of the
// sky in every direction using a physical model of how air scatters sunlight
// (the "Preetham model"). It's what makes sunsets orange and noon skies blue.
export function createSky(sunDirection) {
  const sky = new Sky()
  // The box must fit inside the camera's far plane (100), or it gets clipped away.
  // 90 → it reaches 45 m in every direction: well beyond our 40×40 m world.
  sky.scale.setScalar(90)

  const u = sky.material.uniforms // "uniforms" = the inputs a shader exposes
  u.turbidity.value = 10 // haze/dust in the air: more = milkier, warmer sunset
  u.rayleigh.value = 3 // how much air scatters blue light: more = deeper colours
  u.mieCoefficient.value = 0.006 // the bright glow around the sun
  u.mieDirectionalG.value = 0.85 // how tightly that glow hugs the sun
  u.sunPosition.value.copy(sunDirection)
  u.cloudCoverage.value = 0.35 // soft, drifting clouds (animated via u.time in main.js)
  u.cloudDensity.value = 0.35
  // Step 12: hide the sun's disc. Its brightness is thousands of times above the bloom
  // threshold, so with bloom on it flooded half the screen with glare. The warm glow
  // AROUND the sun (mie scattering) is part of the sky colour and stays.
  u.showSunDisc.value = 0

  return sky
}

// ----- Environment map: light & reflections from the sky -------------------------
// An environment map is a 360° picture of the surroundings. MeshStandardMaterial uses
// it for two things:
//   1. soft ambient light coming from every direction (blue-ish from above, orange
//      from the sunset side) — much richer than our HemisphereLight's two colours
//   2. reflections — shiny things (water, the wet pebble) now mirror the sky
//
// PMREMGenerator renders a scene in all 6 directions and pre-blurs the result at
// several levels, so rough materials get blurry reflections and smooth ones sharp.
export function createEnvironment(renderer, sky) {
  const pmrem = new THREE.PMREMGenerator(renderer)

  // Render ONLY the sky (not the ground, people…) into the environment map.
  // An object can only have ONE parent, so adding the sky to this temporary scene
  // takes it out of wherever it was. main.js adds it back to the real scene after.
  const envScene = new THREE.Scene()
  envScene.add(sky)

  // The sun disc must be hidden while capturing: a tiny, super-bright dot makes
  // splotchy reflections. (The tip comes straight from the Sky addon's documentation.)
  // (Since Step 12 the disc is hidden everywhere — see createSky — so nothing to toggle.)
  const envMap = pmrem.fromScene(envScene).texture

  pmrem.dispose() // free the generator's GPU memory; we keep only the result
  return envMap
}

// ----- Fog ------------------------------------------------------------------------
// Fog(color, near, far): objects fade towards `color`, starting at `near` metres from
// the camera and fully fogged at `far`. Real air does this (distant hills look pale).
// It also hides the square edge of our 40×40 world. The colour must match the sky
// near the horizon, or you'd see a seam where foggy ground meets the sky.
export function createFog() {
  return new THREE.Fog(0xe3b98c, 14, 42)
}
