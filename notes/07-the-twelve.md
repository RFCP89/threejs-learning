# Step 7 — The twelve: data, circles, poses, sharing

## 1. Data vs code

`src/disciples.js` holds the twelve as plain **data**: an array of objects
(name, robe, mantle, skin, hair, beard, pose), in the order of Matthew 10:2–4.
The code just loops over it. To change John's mantle, edit the data — no logic to touch.

```js
const everyone = [JESUS, ...TWELVE]       // spread: one array of 13
everyone.forEach((data, i) => { … })      // one person per entry
```

## 2. Polar coordinates: placing things in a circle

A point on a circle = an **angle** + a **radius**:

```js
x = center.x + radius * Math.sin(angle)
z = center.z + radius * Math.cos(angle)
```

A full circle is `2π`; 13 seats → `step = 2π / 13`.
`Math.atan2(dx, dz)` goes the other way: direction → angle. We find the angle towards the
camera and add `π` (half a turn) → Jesus sits on the far side, facing the viewer.

Then `person.lookAt(center)` turns everyone to face the middle.

## 3. Poses = joint rotations

Thanks to Step 6's pivots, sitting is just:

```js
body.position.y = 0.2               // lower the hips
skirt.rotation.x = -Math.PI / 2     // swing the legs forward at the hips
```

Three styles: `relaxed`, `leaning` (back on the hands), `hugging` (forward, arms to the knees).

### Compensating a parent's rotation
Leaning the **body** back also tilts its child, the **skirt** — the legs would lift off the
ground. Child rotations add to their parent's, so we rotate the skirt the *opposite* way:

```js
body.rotation.x = -lean
skirt.rotation.x = -Math.PI / 2 + lean   // in world space: still flat
```

### Scale is local too
`skirt.scale.set(0.8, 1, 0.6)` — after the −90° rotation, the skirt's local **y** points
*forward* and local **z** points *up*. So "thinner" is z, not y. (First version: logs for legs!)

## 4. Sharing geometries and materials

Step 6 created new geometries/materials inside `createPerson()`. ×13 = 13 copies of everything.

- **Geometries** now live in a `GEOMETRY` object at the top of `people.js` — built *once* when
  the module loads, shared by every mesh. (`new X().translate()` chains: translate returns the geometry.)
- **Materials** come from a **cache** (`Map`): same colour → same material object.

Saves memory and GPU uploads. It does NOT reduce draw calls — each mesh still draws itself.

## 5. Draw calls: 206

13 people × ~16 parts = ~200 meshes. A desktop GPU shrugs at this; a phone might feel it.
Options, if we ever need them:
- **Merge** each person's parts into one geometry (`BufferGeometryUtils.mergeGeometries`) → 13
  draw calls, but no more joints to animate.
- **Instancing** per part (13 heads in one InstancedMesh…) → ~16 draw calls, but posing gets
  harder.
Classic trade-off: flexibility vs. speed. For learning, flexibility wins.

## 6. Bugs we met on the way (each one a lesson)

- Seats landed **on the hero rocks** → we checked distances and moved the clearing to z = 4.
- The pulled-back camera started **inside a tree canopy** → the camera must stand inside the
  clearing; we widened it to radius 7.
- **Log legs** → flatten with local scale.

## Try it

1. Change `CIRCLE_RADIUS` to `1.6` (crowded) or `3.5` (spread out).
2. Give everyone the same pose: replace `data.pose` with `'leaning'`.
3. Invent a 4th pose in `poseSitting` — e.g. `'praying'`: both arms forward and up
   (`rotation.x ≈ -1.6`), slight forward lean.
4. Put Jesus in the CENTRE instead: skip him in the loop and place him at `center`.
5. Count the materials: `console.log(materialCache.size)` at the end of people.js (temporarily export it or log inside).
6. Use `Math.random()` for head turns instead of `Math.sin(i * 1.7)` — reload a few times.
