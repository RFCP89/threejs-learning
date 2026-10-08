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

### Upgrade: a face-to-face close-up with a tween

Clicking now **flies** the camera to 1.3 m in front of the person's face:

```js
person.userData.parts.head.getWorldPosition(headWorld)   // where the face is
person.getWorldDirection(facing)                          // which way they face (+z)
position = headWorld + facing * 1.3  (+ 0.2 up)
```

The lerp became a **tween**: fixed duration (1.4 s), progress `t` from 0 to 1, shaped by an
**easing** curve (`easeInOutCubic`: slow start, fast middle, slow end). Camera position AND
`controls.target` are tweened together with `lerpVectors`, so it travels and turns at once.

- Lerp-per-frame: abrupt start, length depends on frame rate. Tween: known length, smooth both ends.
- `controls.addEventListener('start', …)` cancels the flight if the user grabs the mouse.
- Empty click → fly back to the stored overview.
- `controls.minDistance` lowered 2 → 0.8, or OrbitControls would push the camera back out.

## 7. Data-driven again

The descriptions live in `TWELVE` (`about:`), next to names and colours — the label just reads
`person.userData.about`.

## 8. Why a ring and not "light him up"?

Tempting: `material.emissive = …` on hover. But since Step 7, materials are **shared** — every
disciple with the same robe colour would light up too! A separate ring mesh avoids the problem.
(To highlight one person you'd clone their materials, or use an outline post-process — Step 12.)

## Try it

1. Make the label show on **hover** instead of click (move the label code into `pointermove`).
2. Change `flight.duration` (`3` cinematic, `0.5` snappy) or swap the easing for linear (`return t`).
3. Close-up from the side instead: rotate `facing` by 45° (`facing.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)`).
4. Test the shared-material bug on purpose: on hover, set
   `hovered.userData.parts.head.children[0].material.emissive.set(0x333333)` — watch who else glows.
5. Make the trees clickable too — what would `intersectObject` return for an InstancedMesh?
   (Hint: `hits[0].instanceId`.)
6. Press **Escape** to close the label: `window.addEventListener('keydown', …)`.
