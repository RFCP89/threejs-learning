# Step 3 — The ground & camera controls

## The ground: a rotated plane

`PlaneGeometry(40, 40)` is a flat 40×40 m rectangle made of 2 triangles. It is born
**standing up** (in the x/y plane, facing +z — like a wall facing the camera).
To make a floor we rotate it `-Math.PI / 2` (−90°) around **x**.

Why minus? Planes are **one-sided**: only the front face is drawn (saves GPU work).
Rotating −90° turns the front face UP. +90° would turn it down → invisible from above.
(`side: THREE.DoubleSide` on the material draws both faces, but costs more.)

Convention from now on: **y = 0 is the ground**; everything is positioned relative to it.
Rocks sit partly **sunk** into the ground — real rocks are half-buried.

## Addons

The core library (`import * as THREE from 'three'`) holds the essentials. Extras live in
`three/addons/…` and are imported individually:

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
```

Other addons we'll use later: `GLTFLoader` (3D models), `EffectComposer` (post-processing).
Browse them all in `node_modules/three/examples/jsm/`.

## OrbitControls

| Input | Action |
|---|---|
| left-drag | orbit around `controls.target` |
| scroll / pinch | zoom |
| right-drag / two-finger drag | pan |

- `controls.target` — the point the camera orbits around and looks at (replaces `camera.lookAt`).
- `enableDamping` — inertia. **Requires `controls.update()` every frame**, or it does nothing.
- `minDistance` / `maxDistance` — zoom limits.
- `maxPolarAngle` — tilt limit. 0 = looking straight down from above, `Math.PI / 2` = level
  with the horizon. We stop just above it so you can't go under the ground.

## AxesHelper — feel the 3D space

Red = **x** (right), Green = **y** (up), Blue = **z** (towards the starting camera).
Orbit around and notice: the axes never move — the camera does. Positions like
`(1.9, 0.15, 0.6)` now mean something you can *see*: 1.9 along red, 0.15 up green, 0.6 along blue.

## What we removed

The rock's spin/bob. Things on the ground should be still; the motion now comes from
you. Time-based animation comes back for water, people, fireflies.

## Try it

1. Orbit all the way around. Look at the rocks from behind — see the dark shadow side.
2. Change `ground.rotation.x` to `+Math.PI / 2`. Ground vanishes from above! Orbit below
   (temporarily remove `maxPolarAngle`) to find it.
3. Set `controls.enableDamping = false` — compare the feel.
4. Add `controls.autoRotate = true` and `controls.autoRotateSpeed = 0.5` — a gentle showcase
   orbit (needs `controls.update()`, which we already call).
5. Set `maxDistance` to 100 and zoom out. You'll see the square edge of the world —
   in Step 8, fog will hide it.
6. Move `controls.target` to the wet pebble: `controls.target.set(1.9, 0.15, 0.6)`.
