# Step 4 — The creek: carving terrain with code

## 1. Modules

`src/terrain.js` is our first own module.

```js
// terrain.js
export function getTerrainHeight(x, z) { … }   // shared
const CREEK_DEPTH = 0.8                        // private (no export)

// main.js
import { createGround, createWater, getTerrainHeight } from './terrain.js'
```

`export` = "others may use this". Anything not exported stays private to the file.
`'./terrain.js'` = a file next to this one (vs `'three'` = a package from node_modules).

## 2. A geometry is just a list of vertices

`PlaneGeometry(40, 40, 160, 160)` → 160×160 squares → **161×161 = 25,921 vertices**.
Positions are stored in an **attribute**, one flat array: `[x0, y0, z0, x1, y1, z1, …]`.

```js
const positions = geometry.attributes.position
positions.getX(i)       // read vertex i
positions.setY(i, h)    // move vertex i up/down
```

More segments = more detail, but more work for the GPU. 26k vertices is nothing for a
modern GPU; a million would start to matter.

## 3. `geometry.rotateX` vs `mesh.rotation.x`

- `mesh.rotation.x` (Step 3): the vertices stay as they were; the *object* is turned when drawn.
- `geometry.rotateX` (Step 4): the vertices themselves are moved, once.

We rotate the geometry so each vertex's `y` really is "up" — then carving is simply `setY`.

## 4. The height function

`getTerrainHeight(x, z)` = rolling bumps − creek carve:

- **Rolling**: small sine waves mixed together → soft hills.
- **Creek**: distance from the creek's centre line (`creekCenterZ(x)`, itself a sine wave →
  meanders), passed through **`smoothstep`** → a smooth S-shaped bank instead of a sharp cliff.

```
smoothstep(v, min, max):  0 ──────╮
                                  ╰─────── 1      (smooth S between min and max)
```

Because it's a function, **anything** can ask the ground's height: the rocks do
(`getTerrainHeight(0, 0) + 0.4`), and later the people and trees will.

## 5. Vertex colours

Each vertex gets its own (r, g, b) in a `color` attribute, coloured by height:
under water → dark bed; near the waterline → muddy bank; higher → grass.
The material needs `vertexColors: true`. GPU blends colours smoothly between vertices.

## 6. `computeVertexNormals()` — don't forget it!

Lighting uses **normals** (Step 2). Moving vertices doesn't update them, so the hills would
be lit as if still flat. `computeVertexNormals()` recalculates them from the new shape.

## 7. The water trick

ONE flat transparent plane at `WATER_LEVEL` covering the whole world. Wherever the ground
is higher, it hides the water; only the carved channel shows it. No need to model the creek's
shape twice.

## Try it

1. Comment out `geometry.computeVertexNormals()`. The hills lose all shading — see why it matters.
2. `PlaneGeometry(40, 40, 10, 10)`: blocky creek. `(40, 40, 400, 400)`: smooth (and heavier).
3. In `creekCenterZ`: change `1.5` → `4` (wild meanders) or `0.25` → `0.6` (tight bends).
4. Change `CREEK_DEPTH` and `WATER_LEVEL`. Raise the water to `0` — flood!
5. Make the hills bigger: `0.12` → `0.8` in `rolling`. Notice the rocks still sit on the
   surface — because they ask `getTerrainHeight`.
6. On the material in `createGround`, add `wireframe: true` to see all the triangles.
