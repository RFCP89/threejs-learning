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
  return directionFromAngles(SUN.elevation, SUN.azimuth)
}

// The same maths for ANY pair of angles. The time-of-day switch (src/timeOfDay.js) uses
// it to move the sun — and the moon — around the sky.
export function directionFromAngles(elevation, azimuth) {
  const phi = THREE.MathUtils.degToRad(90 - elevation)
  const theta = THREE.MathUtils.degToRad(azimuth)
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

  // ----- Soft limit on the sky's brightness (fix: looking at the sun was blinding) --
  // Near the sun the sky shader outputs values DOZENS of times above 1. Two things then
  // blow the screen out to white: the bloom (everything above its threshold, 1.6,
  // glows and spreads) and tone mapping (very bright → white).
  //
  // Fix: compress the sky's colour right before it's written. A "soft knee":
  //   below KNEE  → untouched (the rest of the sky looks exactly as before)
  //   above KNEE  → squeezed more and more, approaching LIMIT but never reaching it
  // LIMIT (1.4) is under the bloom threshold, so the sky itself no longer glows.
  // We scale r, g and b by the SAME factor, which keeps the HUE: the sun's
  // surroundings stay golden instead of turning white.
  //
  // onBeforeCompile works on any material, ShaderMaterial included (Step 9's trick).
  //
  // The limit is only for what the EYE sees. The environment map (below) must capture
  // the sky's FULL brightness — it's the light that reaches the whole scene; compressed,
  // the scene went twice as dark. So the limit has an on/off uniform (1 = on), which
  // createEnvironment switches off while it captures.
  sky.userData.softLimit = { value: 1 }
  // Time of day (src/timeOfDay.js): once the sun is below the horizon, the physical sky
  // model goes almost pitch black — real night skies still have a faint blue glow
  // (moonlight, starlight, city light far away). This colour is simply ADDED to the
  // sky everywhere. Black (0, 0, 0) = no change, which is what day and sunset use.
  sky.userData.nightGlow = { value: new THREE.Color(0x000000) }
  sky.material.onBeforeCompile = (shader) => {
    shader.uniforms.uSoftLimit = sky.userData.softLimit
    shader.uniforms.uNightGlow = sky.userData.nightGlow
    shader.fragmentShader = 'uniform float uSoftLimit;\nuniform vec3 uNightGlow;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      'gl_FragColor = vec4( texColor, 1.0 );',
      /* glsl */ `
        texColor += uNightGlow;
        const float KNEE = 0.8;
        const float LIMIT = 1.4;
        float peak = max(texColor.r, max(texColor.g, texColor.b)); // brightest channel
        if (uSoftLimit > 0.5 && peak > KNEE) {
          float excess = peak - KNEE;
          // excess / (1 + excess / room): grows normally at first, then flattens out
          // towards 'room' — so the new peak approaches LIMIT smoothly.
          float room = LIMIT - KNEE;
          float newPeak = KNEE + excess / (1.0 + excess / room);
          texColor *= newPeak / peak;
        }
        gl_FragColor = vec4( texColor, 1.0 );
      `,
    )
  }

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
//
// Time of day: when the sky changes, the light it gives must change too, so this runs
// again on every switch (src/timeOfDay.js). That's why it returns the whole RENDER
// TARGET (the GPU image) and not just its texture: the caller uses `.texture`, and
// calls `.dispose()` on the old one to free its GPU memory when a new one replaces it.
export function createEnvironment(renderer, sky) {
  const pmrem = new THREE.PMREMGenerator(renderer)

  // Render ONLY the sky (not the ground, people…) into the environment map.
  // An object can only have ONE parent, so adding the sky to this temporary scene
  // takes it out of wherever it was — we remember where, and put it back after.
  // (The first time, the sky isn't in any scene yet; main.js adds it.)
  const parent = sky.parent
  const envScene = new THREE.Scene()
  envScene.add(sky)

  // The sun disc must be hidden while capturing: a tiny, super-bright dot makes
  // splotchy reflections. (The tip comes straight from the Sky addon's documentation.)
  // (Since Step 12 the disc is hidden everywhere — see createSky — so nothing to toggle.)
  // The soft brightness limit IS toggled: off while capturing (full-strength light for
  // the scene), back on afterwards (comfortable sky for the eye).
  sky.userData.softLimit.value = 0
  const envMap = pmrem.fromScene(envScene)
  sky.userData.softLimit.value = 1

  parent?.add(sky) // ?. = only if it had a parent
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
