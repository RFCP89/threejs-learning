# Step 8 — Atmosphere: sky, environment, fog, shadows, tone mapping

The step with the most visual impact and the fewest new objects: it's all about **light**.

## 1. One sun direction for everything (`src/atmosphere.js`)

```js
export const SUN = { elevation: 5, azimuth: 225 }   // degrees
new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
```

Spherical coordinates: a radius + two angles → a 3D direction. The **same** vector feeds the
Sky shader (where the sun glows) and the DirectionalLight (where light comes from).

## 2. The Sky addon

A huge box drawn from the inside. Its **shader** computes physically-based sky colours
(Preetham model). We tune it through **uniforms** — a shader's inputs:
`turbidity` (haze), `rayleigh` (blue scattering), `mieCoefficient` (sun glow), clouds,
and `time` (we update it each frame to drift the clouds).

The box must fit inside the camera's `far` plane (100) → `sky.scale.setScalar(90)`.

## 3. Environment map (image-based lighting)

`PMREMGenerator.fromScene(skyOnlyScene)` renders the sky in 6 directions and pre-blurs it.
`scene.environment = envMap` → every `MeshStandardMaterial` gets:
- soft light from the whole sky (richer than HemisphereLight's two colours),
- **reflections** — the water now mirrors the sky.

`scene.environmentIntensity` sets how strong it is. At 1, the sky drowned the sun's direction.

An object has **one parent**: `envScene.add(sky)` takes it out of anywhere else; later
`scene.add(sky)` moves it back.

## 4. Fog

`new THREE.Fog(color, near, far)` — linear fade from `near` to `far` metres. Hides the world's
edge and adds depth. Its colour must match the horizon, or you see a seam. (The Sky shader
ignores fog, which is what we want.)

## 5. Shadows — three switches

1. `renderer.shadowMap.enabled = true`
2. `sun.castShadow = true` + shadow camera box, map size, bias
3. each mesh: `castShadow` / `receiveShadow` — set for all with `scene.traverse()`

How: the scene is rendered **from the light** into a depth map; then each pixel asks
"is something closer to the sun than me?". That extra pass is why **draw calls doubled**
(206 → ~405): every shadow caster is drawn twice.

- **Shadow camera**: a box (orthographic) around the area that gets shadows. Smaller = sharper.
- **Shadow acne**: stripy self-shadowing → fixed with `bias` / `normalBias`.
- `PCFShadowMap` + `shadow.radius` for soft edges. (`PCFSoftShadowMap` was removed from three.js
  — the console told us. Old tutorials still use it!)

## 6. Tone mapping

Lighting produces values above 1; screens show 0..1. Without tone mapping, everything over 1
is clipped → flat, blown-out colours (the peach rocks of Step 5!).
`ACESFilmicToneMapping` compresses highlights smoothly, like film. `toneMappingExposure` =
how much light the "camera" lets in.

## 7. Lighting is art direction

First attempt: sun **behind** the camera (azimuth 55°). Technically correct, but we saw the cold
side of the sky, flat light, shadows hidden behind objects → it looked like noon.
Moving the sun **in front** (225°, backlight) gave the golden-hour mood: glowing sky, rim light,
long shadows towards the viewer. Same code, one number changed.

## Try it

1. `SUN.elevation`: `1` (sun touching the horizon), `30` (afternoon), `60` (noon). Watch sky,
   light and shadows all follow.
2. `SUN.azimuth = 45` — the sun behind you. Compare the mood.
3. `renderer.toneMapping = THREE.NoToneMapping` vs `THREE.AgXToneMapping`.
4. Remove the fog and zoom out — the world's edge is back.
5. Debug the shadow box: `scene.add(new THREE.CameraHelper(sun.shadow.camera))`.
6. `sun.shadow.mapSize.set(256, 256)` — blocky shadows. That's what map size buys you.
7. `scene.environmentIntensity = 1.5` — watch the sun's direction get washed away.
