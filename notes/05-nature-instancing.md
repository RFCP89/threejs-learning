# Step 5 — Nature: instancing, seeded randomness, scattering

## 1. Draw calls — the real cost

Every `Mesh` = at least one **draw call**: the CPU telling the GPU "draw this now".
Draw calls are expensive; triangles are cheap. 200 trees as 200 Meshes would be slow.

Open DevTools → Console. With `DEBUG = true` you'll see something like:

```
Draw calls: 10 | Triangles: 65282
```

~190 objects and 65k triangles in **10** draw calls.

## 2. InstancedMesh

```js
const rocks = new THREE.InstancedMesh(geometry, material, count)
rocks.setMatrixAt(i, matrix)   // where/how big/rotated copy i is
rocks.setColorAt(i, color)     // optional: its own colour
```

One geometry + one material + a list of transforms → all copies in ONE draw call.
Limits: every copy has the same shape and material (colours can vary per instance).

A tree has 2 materials (wood, leaves) → **2 InstancedMeshes** sharing the same matrices.

## 3. The dummy & matrices

A **matrix** (4×4 numbers) packs position + rotation + scale into one value the GPU likes.
Nobody writes matrices by hand. We use an invisible `Object3D` as a calculator:

```js
dummy.position.set(…); dummy.rotation.set(…); dummy.scale.set(…)
dummy.updateMatrix()             // → dummy.matrix
mesh.setMatrixAt(i, dummy.matrix)
```

## 4. Moving a geometry's origin with `translate`

Geometries are created centred at (0,0,0). `trunkGeometry.translate(0, 0.7, 0)` shifts the
vertices so the base is at y=0. Then a tree's *position* = where it touches the ground,
and scaling grows it upwards instead of into the ground.

## 5. Seeded randomness

`Math.random()` → a new forest on every reload. A **seeded** generator (`mulberry32`)
gives the same sequence for the same seed → the same forest every time.

⚠️ The sequence is consumed in order. Add or remove ONE `random()` call and every value
after it changes — the whole layout reshuffles. (We hit this while building the step!)

## 6. Scattering rules

- **Rocks**: pick an x, then place near the creek centre line → they cluster along the water.
- **Trees**: *rejection sampling* — throw a random point, reject it if it's in the creek or
  the clearing (`CLEARING`, where the 13 figures will gather), try again.
- Everyone asks `getTerrainHeight` so they sit on the ground.

## 7. Colour & light

Rocks are dark grey-brown, yet look peach: an orange sun tints everything (that's golden hour).
Object colour × light colour = what you see. Tone mapping (Step 8) will help balance it.

`color.setHSL(hue, saturation, lightness)` is handy for "random but within a range":
hue 0.2–0.3 = yellow-green → green.

## Try it

1. Change `SEED` to any other number → a new forest.
2. `createTrees(1000)` — check the console: still the same number of draw calls!
3. Remove the `isInClearing` check — the clearing fills up with trees.
4. Make the canopy a cone: `new THREE.ConeGeometry(0.7, 1.8, 7)` → pine forest.
5. Swap `color.setHSL(...)` on canopies for autumn: hue `0.02–0.1`.
6. Replace one tree's matrix after creation: `trunks.setMatrixAt(0, …)` then
   `trunks.instanceMatrix.needsUpdate = true` — this is how you'd ANIMATE instances.
