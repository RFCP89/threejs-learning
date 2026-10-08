# Step 2 — Lights & Materials

## Why everything turned black-then-golden

`MeshNormalMaterial` (Step 1) ignores light. Real materials compute
**colour = surface properties × the light hitting it**. No light → black.

## MeshStandardMaterial (PBR)

PBR = *Physically Based Rendering*: a few real-world properties instead of tweaking magic numbers.

| Property | Meaning | Our rock | Wet pebble |
|---|---|---|---|
| `color` | base colour | `0x8f8778` warm grey | `0x4f4a42` darker (wet things look darker) |
| `roughness` | 0 = mirror, 1 = matte | `0.9` | `0.2` → visible highlight |
| `metalness` | 0 = stone/wood/skin, 1 = metal | `0` | `0` |
| `flatShading` | one tone per triangle | `true` (faceted) | `false` (smooth) |

Other materials, for reference (cheapest → most realistic):
`MeshBasicMaterial` (ignores light, flat colour) → `MeshLambertMaterial` (matte only) →
`MeshPhongMaterial` (shiny, old-school) → `MeshStandardMaterial` → `MeshPhysicalMaterial`
(adds clearcoat, glass/transmission, sheen for cloth… we may use it for the water).

## Flat vs smooth shading

Each vertex stores a **normal**: the direction the surface faces there. Lighting is computed
from normals.
- **Flat**: one normal per triangle → each face one tone → low-poly look.
- **Smooth**: normals are blended across the triangle → looks rounded. Needs more triangles
  to look good (`IcosahedronGeometry(1, 2)`: 320 faces vs 20).

A shiny highlight is a reflection of the light; it only shows where the surface is angled
exactly between light and eye. Smooth surfaces always have such a spot somewhere; flat
facets rarely do.

## The two lights

| Light | Fakes | Notes |
|---|---|---|
| `HemisphereLight(sky, ground, intensity)` | indirect light bounced from sky & ground | no position; lights by surface direction. Keeps shadows from being pitch black |
| `DirectionalLight(color, intensity)` | the sun | parallel rays from `position` towards `target` (0,0,0). Creates bright and dark sides |

Other lights you'll meet: `AmbientLight` (flat, everywhere — dull), `PointLight` (a bulb —
we'll use one for a campfire), `SpotLight` (a cone, like a torch).

**Helpers** (`DirectionalLightHelper`) draw debug visuals for invisible things. Toggle `DEBUG`.

## Try it

1. Set `sun.position.set(-4, 2.5, 3)` — light from the left. Then `(0, 5, 0)` — noon.
2. Change the sun colour to `0xffffff` (white noon) or `0x6b8cff` (moonlight) and lower its intensity.
3. Set `skyLight` intensity to `0` — see how black the shadow side gets without indirect light.
4. Wet pebble: try `roughness` `0`, `0.5`, `1`. Watch the highlight sharpen, blur, vanish.
5. Set the rock's `metalness: 1` — it goes dark: metals only reflect their surroundings,
   and we have no surroundings yet (that's an *environment map*, a later step).
6. Animate the sun! In the render loop: `sun.position.x = Math.sin(seconds) * 4`.
