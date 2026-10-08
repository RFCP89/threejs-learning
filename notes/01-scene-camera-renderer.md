# Step 1 — Scene, Camera, Renderer, Render Loop

## The mental model

Think of a film set:

- **Scene** = the set. You `scene.add(thing)` to put things on it.
- **Camera** = the camera operator. Has a position, a direction (`lookAt`) and a lens (`fov`).
- **Renderer** = the film. `renderer.render(scene, camera)` takes ONE photo.
- **Render loop** = shooting 60 photos per second. Change things between photos → motion.

## Mesh = Geometry + Material

- **Geometry**: the shape — a list of triangles (vertices). `IcosahedronGeometry`, `BoxGeometry`, `SphereGeometry`…
- **Material**: how the surface looks. `MeshNormalMaterial` needs no light (debug colours).
  Most "real" materials need lights, otherwise they render black — that's Step 2.
- **Mesh**: puts them together and gives them a `position`, `rotation`, `scale`.

## Coordinates & units

- `x` → right, `y` → up, `z` → towards the viewer.
- Units are arbitrary — we'll treat **1 unit = 1 metre**, so a person will be ~1.75 tall.
- Rotations are in **radians**: `Math.PI` = half a turn, `Math.PI * 2` = full turn.

## Time-based animation

`setAnimationLoop((time) => …)` gives milliseconds since start. Using
`rotation = seconds * speed` gives the same speed on every monitor, whereas
`rotation += 0.01` per frame would spin 2.4× faster on a 144 Hz screen.

## Try it (break things to learn!)

1. Change `camera.position.set(0, 1, 5)` to `(0, 5, 5)` — you look down from above.
2. Change fov `50` → `20` (zoom lens) and `90` (fish-eye).
3. Change `IcosahedronGeometry(1, 0)` detail from `0` to `1`, `2`, `5`. Watch it become a sphere.
4. Swap the geometry for `new THREE.TorusKnotGeometry(0.8, 0.25, 100, 16)` just for fun.
5. Remove `flatShading: true`. What changes?
6. Make the rock also rotate on `x`. Make it bob faster.
7. Comment out the `resize` listener, then resize the window. See the stretching?
