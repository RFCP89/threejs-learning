# Step 10 — Life: idle motion, campfire, fireflies

## 1. Idle animation (`src/disciples.js`)

Still figures look like statues. Three tiny motions per disciple — breathing, sway, glances —
each an **offset added to the resting pose**:

```js
person.userData.rest = { bodyX, skirtX, headY, phase, speed }   // remembered once
body.rotation.x  = rest.bodyX  + breath
skirt.rotation.x = rest.skirtX - breath    // Step 7 compensation: legs stay on the ground
```

`phase` (a per-person start offset) and `speed` (slightly different tempos) keep them out of
sync. Synchronised breathing looks robotic — de-synchronising is most of the magic.

## 2. Each module updates itself

```js
gathering.update(seconds)
campfire.update(seconds)
fireflies.update(seconds)
```

Modules return `{ object, update }`. The render loop only hands out the time. Adding a new
animated thing = one line in the loop.

## 3. The campfire (`src/campfire.js`)

- **PointLight(color, intensity, distance, decay)** — light from a point in all directions.
  `decay = 2` is physically correct: twice as far → ¼ of the light. Intensity in candela.
- **No point-light shadows**: they'd render the scene 6 more times (a cube around the light).
- **Flicker** = several sines at "unrelated" speeds (10, 23, 6.1) → never visibly repeats.
- **Flames**: `MeshBasicMaterial` (ignores light — a flame IS light) + `AdditiveBlending`
  (adds its colour to what's behind) + `depthWrite: false` + `toneMapped: false`.
- **Squash & stretch**: taller → thinner (`width = base / √stretch`) to keep the volume.
- **Rotation order**: a log is tilted inside a holder group that's turned around y. One group
  per rotation step avoids fighting with Euler-angle order.

## 4. Fireflies (`src/fireflies.js`) — particles + a full ShaderMaterial

- **THREE.Points** draws each vertex as a square "point sprite" — 90 fireflies, 1 draw call.
- A **BufferGeometry built by hand**: `position` (3 per point) and our own `aSeed` (1 per point).
- **ShaderMaterial** — both shaders from scratch (vs Step 9's injection). Fine here: fireflies
  glow, they need no lighting.
- **Attribute vs uniform**: `aSeed` differs per firefly; `uTime` is the same for all.
- **Movement on the GPU**: the vertex shader adds sine drifts to each home position.
  JS sends only the time — it'd be just as fast with 100,000 particles.
- `gl_PointSize = uSize / -viewPosition.z` → **size attenuation** (far = smaller).
- `gl_PointCoord` + `smoothstep` → a soft round dot instead of a square.
- `pow(blink, 4.0)` → mostly dim, brief flashes.
- `Math.sqrt(random()) * radius` → **evenly** spread over a disc (without sqrt, they'd clump
  in the middle, where there's less area).
- `frustumCulled = false`: three.js only knows the home positions, not the shader-moved ones.

## 5. Cost check

Draw calls ~438 (+ fire meshes; fireflies = 1). Still smooth on a desktop.

## Try it

1. Make the fire roar: `light.intensity = 15 + flicker * 4`. Make it dying: `2 + flicker * 0.5`.
2. Turn on point-light shadows (`light.castShadow = true`) and watch the draw calls jump.
3. `createFireflies(CLEARING, 2000)` — still one draw call.
4. Change `uColor` to `0x7ad9ff` — blue spirits instead of fireflies.
5. Remove `phase` from the disciples (`t = seconds * rest.speed`) — see how uncanny synced breathing is.
6. Lower `SUN.elevation` to `1` and `toneMappingExposure` to `0.5` — night falls, fire and
   fireflies take over the scene.
