# Step 6 — People: the scene graph, local coordinates & pivots

## 1. The scene graph

Every `Object3D` (Mesh, Group, Light, Camera, even the Scene) can have **children**:
`parent.add(child)`. The whole scene is a tree:

```
scene
├─ ground, water, rocks, trees, lights…
└─ jesus (Group, origin at his feet)
   └─ body (origin at the hips, 0.85 m up)
      ├─ skirt → feet
      ├─ torso, belt, shawl, neck
      ├─ head  → face, hair, beard, halo
      ├─ leftArm  → sleeve, hand
      └─ rightArm → sleeve, hand
```

A `Group` is an invisible Object3D whose only job is to hold and move children.

## 2. Local coordinates

A child's `position/rotation/scale` are **relative to its parent**.
`head.position.y = 0.7` means "0.7 above the hips", not above the ground.
Move `jesus` → everything follows. Rotate `body` → head and arms swing with it.

The DEBUG `AxesHelper` on the right shoulder shows the **arm's own** axes: they rotate with it.

## 3. Pivots (joints)

An object rotates around **its own origin**. Geometries are centred, so a raw cylinder
would spin around its middle — wrong for an arm. The recipe:

1. Make a `Group` positioned at the **joint** (the shoulder).
2. Translate the limb's geometry so it **hangs from** the origin: `geometry.translate(0, -length/2, 0)`.
3. Rotate the group → the limb swings around the joint.

Same idea for the skirt (pivot = hips). In Step 7, rotating the skirt 90° forward will make
the figures **sit** with their legs stretched out on the grass.

## 4. Front, left, right — the mirror trap

Our figure's front is **+z** (that's also what `lookAt` uses). Facing you, *his* left hand is
on *your* right, at +x. Get this wrong and arms swap sides.

## 5. lookAt

`object.lookAt(x, y, z)` rotates an object so its +z faces a point. We pass his own `y`
so he turns towards the camera without tilting.

## 6. New shapes & tricks

- `SphereGeometry(r, wSeg, hSeg, phiStart, phiLength, thetaStart, thetaLength)` — the last 4
  cut a slice: `thetaLength = 0.55π` → a cap (the hair). Tilted back (`rotation.x = -0.6`)
  so its rim sits on the forehead, not over the eyes. (The first version hid his face!)
- `ConeGeometry` flipped (`rotation.x = π`) → a beard pointing down.
- `TorusGeometry` → the halo. **`emissive`** = light the material gives off itself: it glows
  even in shadow (but doesn't light anything else).
- `userData` — a free pocket on every object for your own data. We keep the joints there.
- `{ ...defaults, ...options }` — merge objects; later keys win. Our "options" pattern.

## 7. Animating joints

```js
rightArm.rotation.x = -1.0 - Math.sin(seconds * 0.8) * 0.25  // blessing gesture
head.rotation.y = Math.sin(seconds * 0.4) * 0.35             // looking around
```

We animate the **groups** (joints), never individual meshes.

## 8. Cost

Draw calls went from 10 → 27: each part is its own Mesh (~17 parts). Fine for 1 person;
for 13 we'll think about it in Step 7.

## Try it

1. `createPerson({ robe: 0x3a5f8f, mantle: 0xc9a227, beard: false })` — a different person.
2. Rotate the whole body: in the loop add `jesus.userData.parts.body.rotation.z = Math.sin(seconds) * 0.2` — he sways; head and arms follow.
3. Wave! Animate `leftArm.rotation.z` between `0.12` and `2.8`.
4. Sit him down (preview of Step 7): `skirt.rotation.x = -Math.PI / 2` and `body.position.y = 0.25`.
5. Remove the `geometry.translate` on the sleeve — now the arm rotates around its middle. See why pivots matter.
6. Set `hair.rotation.x = 0` to see the "no face" bug.
