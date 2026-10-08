# Step 11 — Interaction: raycasting, projection, click vs drag, lerp

## 1. Raycasting: pixel → object

"Which 3D object is under the mouse?" → shoot a ray from the camera through that pixel.

```js
pointer.x =  ((clientX - rect.left) / rect.width)  * 2 - 1   // pixels → NDC (-1..+1)
pointer.y = -((clientY - rect.top)  / rect.height) * 2 + 1   // note the minus: +y is UP in NDC
raycaster.setFromCamera(pointer, camera)
const hits = raycaster.intersectObject(people, true)        // true = include all descendants
```

`hits` is sorted nearest-first; each has `.object`, `.point` (where it hit), `.distance`.

**Test only what matters** (the people group), not the whole scene: faster and no false hits.

## 2. Walking up the scene graph

The ray hits a *mesh* — a sleeve, a beard. We want the *person*. So we climb parents until we
find the object that has `userData.parts` (only person groups do):

```js
while (object && !object.userData.parts) object = object.parent
```

## 3. Projection: 3D point → pixel

The reverse, to place the HTML label:

```js
head.getWorldPosition(v)   // WORLD position (head.position is LOCAL to the body!)
v.project(camera)          // → NDC
x = rect.left + (v.x + 1) / 2 * rect.width
y = rect.top  + (1 - v.y) / 2 * rect.height
```

Redone **every frame** — the camera and the head both move. `v.z > 1` → behind the camera → hide.

## 4. HTML on top of WebGL

Text is far easier (and crisper) in HTML. `#label` and `.hint` are normal elements with
`position: fixed` over the canvas and `pointer-events: none` so clicks pass through.

## 5. Click vs drag

OrbitControls drags end in a mouse-up the browser also calls a click. We record where the
press started and ignore it if the pointer moved more than 5 px.

## 6. Lerp: smooth movement

```js
controls.target.lerp(focusTarget, 0.06)   // move 6% of the REMAINING distance per frame
```

Big steps when far, tiny when near → a natural ease-out. Stop when close so we don't fight
the user's own orbiting.

## 7. Data-driven again

The descriptions live in `TWELVE` (`about:`), next to names and colours — the label just reads
`person.userData.about`.

## 8. Why a ring and not "light him up"?

Tempting: `material.emissive = …` on hover. But since Step 7, materials are **shared** — every
disciple with the same robe colour would light up too! A separate ring mesh avoids the problem.
(To highlight one person you'd clone their materials, or use an outline post-process — Step 12.)

## Try it

1. Make the label show on **hover** instead of click (move the label code into `pointermove`).
2. Change the lerp factor: `0.01` (slow, cinematic) vs `0.3` (snappy).
3. Also move the camera closer on click: lerp `camera.position` towards a point in front of the person.
4. Test the shared-material bug on purpose: on hover, set
   `hovered.userData.parts.head.children[0].material.emissive.set(0x333333)` — watch who else glows.
5. Make the trees clickable too — what would `intersectObject` return for an InstancedMesh?
   (Hint: `hits[0].instanceId`.)
6. Press **Escape** to close the label: `window.addEventListener('keydown', …)`.
