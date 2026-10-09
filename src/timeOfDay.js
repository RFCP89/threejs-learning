// =============================================================
// Time of day — Day, Sunset, Night (extra step, after Step 12)
// =============================================================
// Step 8 lit the scene for ONE moment: golden hour. Changing the time of day means
// changing many things at once, and they must all agree with each other:
//   - where the sun is (the sky shader AND the DirectionalLight that casts shadows)
//   - the sun's colour and strength
//   - the sky's air (haze, how blue it scatters)
//   - the fog colour (it must match the sky at the horizon — Step 8)
//   - the soft fill light, the camera exposure, the cloud tint, the fireflies
//   - the environment map, captured from the sky (Step 8) — new sky, new capture
//
// So each time of day is just DATA: a "preset" object listing all those values.
// Switching doesn't jump from one preset to the next — every value BLENDS from where it
// is now to the new preset over a couple of seconds ("tweening"). A number blends with
// THREE.MathUtils.lerp, a colour with Color.lerpColors.
//
// At night the DirectionalLight becomes the MOON: same light, new direction, cool blue
// and much weaker. The sky's sun, meanwhile, sinks below the horizon. That's why the
// presets have two directions: `skySun` (what the sky shader draws) and `light` (where
// the DirectionalLight shines from). By day and at sunset they're the same.

import * as THREE from 'three'
import { createEnvironment, directionFromAngles } from './atmosphere.js'

// ----- The presets ------------------------------------------------------------------
// Colours are written as hex, like everywhere else in the project.
// `sunset` is exactly the look from Step 8 (the values in main.js / atmosphere.js).
export const TIMES = {
  day: {
    skySun: { elevation: 50, azimuth: 200 }, // high sun: short shadows, blue sky
    light: { elevation: 50, azimuth: 200 },
    sunColor: 0xfff4e2, // almost white, a touch warm
    // Weaker than the sunset's 3.2! A HIGH sun hits surfaces head-on, so they catch far
    // more of it than from a grazing sunset sun. At 3.0 the white robes went over the
    // bloom threshold (1.6) and glowed like lamps. Bloom happens BEFORE exposure
    // (Step 12), so lowering the exposure couldn't fix that — the light itself had to drop.
    sunIntensity: 1.6,
    turbidity: 2.5, // clear air
    rayleigh: 1.2, // a normal blue sky
    mieCoefficient: 0.004,
    mieDirectionalG: 0.8,
    nightGlow: 0x000000,
    fogColor: 0xc9d9e4, // pale blue-grey haze
    hemiSky: 0xdcecff,
    hemiGround: 0x3d5c3a,
    hemiIntensity: 0.3,
    // The noon sky is VERY bright, and the environment map captures all of it (Step 8):
    // at sunset's 0.6 it flooded everything in a milky white. A small value keeps it a
    // soft blue fill and lets the sun make proper shadows.
    environmentIntensity: 0.2,
    exposure: 0.95,
    cloudColor: 0xffffff,
    cloudEmissive: 0xc8d2dc, // shade side: soft grey-blue, lit by the blue sky
    cloudEmissiveIntensity: 0.35,
    fireflies: 0, // invisible in daylight
  },
  sunset: {
    skySun: { elevation: 5, azimuth: 225 },
    light: { elevation: 5, azimuth: 225 },
    sunColor: 0xffc285,
    sunIntensity: 3.2,
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.85,
    nightGlow: 0x000000,
    fogColor: 0xe3b98c,
    hemiSky: 0xffe2b8,
    hemiGround: 0x2f4a3a,
    hemiIntensity: 0.35,
    environmentIntensity: 0.6,
    exposure: 0.85,
    cloudColor: 0xfff1ea,
    cloudEmissive: 0xd9a39a,
    cloudEmissiveIntensity: 0.55,
    fireflies: 1,
  },
  night: {
    skySun: { elevation: -12, azimuth: 225 }, // well below the horizon: the sky goes dark
    light: { elevation: 40, azimuth: 150 }, // the moon, high and off to one side
    sunColor: 0x9db4ff, // cool blue moonlight
    sunIntensity: 0.7,
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.85,
    nightGlow: 0x0b1530, // deep navy, added to the sky (see atmosphere.js)
    fogColor: 0x0b1530, // the SAME colour, so foggy ground meets the sky seamlessly
    hemiSky: 0x3a4f8a,
    hemiGround: 0x0c1610,
    hemiIntensity: 0.6,
    environmentIntensity: 1.0,
    exposure: 1.1, // a dark scene → let in more light (your eyes adjust too)
    cloudColor: 0x8a98b8,
    cloudEmissive: 0x161e33,
    cloudEmissiveIntensity: 0.5,
    fireflies: 1,
  },
}

const DURATION = 2.5 // seconds a switch takes
// Re-capturing the environment map renders the sky 6 times and blurs it — fine now
// and then, too heavy for every frame. During a switch we re-capture at most this
// often (in seconds); the light still LOOKS like it changes smoothly.
const ENVIRONMENT_INTERVAL = 0.15

// The numbers and colours we blend. (skySun / light are blended as their two angles.)
const NUMBERS = [
  'sunIntensity', 'turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG',
  'hemiIntensity', 'environmentIntensity', 'exposure', 'cloudEmissiveIntensity', 'fireflies',
]
const COLORS = ['sunColor', 'nightGlow', 'fogColor', 'hemiSky', 'hemiGround', 'cloudColor', 'cloudEmissive']

// Turn a preset (hex colours, nested angles) into a "state" we can blend: every colour
// becomes a THREE.Color, every angle a plain number.
function toState(preset) {
  const state = {
    skyElevation: preset.skySun.elevation,
    skyAzimuth: preset.skySun.azimuth,
    lightElevation: preset.light.elevation,
    lightAzimuth: preset.light.azimuth,
  }
  for (const key of NUMBERS) state[key] = preset[key]
  for (const key of COLORS) state[key] = new THREE.Color(preset[key])
  return state
}

// A copy of a state. Colours are objects, so they must be cloned too — otherwise the
// copy would share them, and changing one would change both.
function cloneState(state) {
  const copy = { ...state }
  for (const key of COLORS) copy[key] = state[key].clone()
  return copy
}

// state = from + (to − from) × t, for every value. t: 0 → `from`, 1 → `to`.
function blendStates(out, from, to, t) {
  for (const key of ['skyElevation', 'skyAzimuth', 'lightElevation', 'lightAzimuth', ...NUMBERS]) {
    out[key] = THREE.MathUtils.lerp(from[key], to[key], t)
  }
  for (const key of COLORS) out[key].lerpColors(from[key], to[key], t)
}

// Ease-in-out: starts slowly, speeds up, slows down at the end — like a real dusk,
// and much nicer to watch than a constant speed. (The classic "smoothstep" curve.)
function easeInOut(t) {
  return t * t * (3 - 2 * t)
}

export function createTimeOfDay({ renderer, scene, sky, sun, hemiLight, clouds, fireflies, initial = 'sunset' }) {
  const current = toState(TIMES[initial]) // what the scene shows right now
  let from = null // the state a switch started from…
  let to = null // …and where it's heading
  let progress = 1 // 0 → 1 during a switch; 1 = nothing to do
  let environmentTimer = 0
  let environmentTarget = null // the render target of the current environment map

  const sunDirection = new THREE.Vector3()

  // Push the blended state into the actual three.js objects.
  function apply(state) {
    // The sky shader's sun…
    const u = sky.material.uniforms
    u.sunPosition.value.copy(directionFromAngles(state.skyElevation, state.skyAzimuth))
    u.turbidity.value = state.turbidity
    u.rayleigh.value = state.rayleigh
    u.mieCoefficient.value = state.mieCoefficient
    u.mieDirectionalG.value = state.mieDirectionalG
    sky.userData.nightGlow.value.copy(state.nightGlow)

    // …and the light that casts shadows (sun by day, moon at night). Same trick as
    // main.js: 30 m back from the target, along the light's direction.
    sunDirection.copy(directionFromAngles(state.lightElevation, state.lightAzimuth))
    sun.position.copy(sun.target.position).addScaledVector(sunDirection, 30)
    sun.color.copy(state.sunColor)
    sun.intensity = state.sunIntensity

    hemiLight.color.copy(state.hemiSky)
    hemiLight.groundColor.copy(state.hemiGround)
    hemiLight.intensity = state.hemiIntensity

    scene.fog.color.copy(state.fogColor)
    scene.environmentIntensity = state.environmentIntensity
    // OutputPass (Step 12) reads the exposure from the renderer on every frame.
    renderer.toneMappingExposure = state.exposure

    const cloudMaterial = clouds.mesh.material
    cloudMaterial.color.copy(state.cloudColor)
    cloudMaterial.emissive.copy(state.cloudEmissive)
    cloudMaterial.emissiveIntensity = state.cloudEmissiveIntensity

    fireflies.setFade(state.fireflies)
  }

  // New sky → capture a new environment map, and free the old one's GPU memory.
  function updateEnvironment() {
    const previous = environmentTarget
    environmentTarget = createEnvironment(renderer, sky)
    scene.environment = environmentTarget.texture
    previous?.dispose()
  }

  // Start a switch. `instant: true` skips the blend (used once at start-up).
  function set(newName, { instant = false } = {}) {
    if (!TIMES[newName]) return
    // Start from what's on screen NOW — even halfway through another switch, so
    // clicking quickly never makes the scene jump.
    from = cloneState(current)
    to = toState(TIMES[newName])
    progress = instant ? 1 : 0
    if (instant) {
      blendStates(current, from, to, 1)
      apply(current)
      updateEnvironment()
    }
  }

  // Called every frame from the render loop with the time since the last frame.
  function update(delta) {
    if (progress >= 1) return
    progress = Math.min(progress + delta / DURATION, 1)
    blendStates(current, from, to, easeInOut(progress))
    apply(current)

    environmentTimer += delta
    if (environmentTimer >= ENVIRONMENT_INTERVAL || progress === 1) {
      environmentTimer = 0
      updateEnvironment()
    }
  }

  set(initial, { instant: true })

  return { set, update }
}
