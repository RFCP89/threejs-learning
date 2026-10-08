// =============================================================
// Step 6 — People: a low-poly figure built from simple shapes
// Step 7 — Shared geometries & materials, and a sitting pose
// =============================================================
// The big idea: the SCENE GRAPH. Every object can have children, and a child's
// position/rotation/scale are RELATIVE TO ITS PARENT ("local" coordinates).
// Move the parent → all its children come along. Rotate the parent → they swing
// around the parent's origin, which acts as a PIVOT (a joint).
//
// Our figure's hierarchy (indentation = "is a child of"):
//
//   person            ← origin at the FEET, on the ground. Move this to place him.
//   └─ body           ← origin at the HIPS (0.85 m up)
//      ├─ skirt       ← lower robe, hangs DOWN from the hips (pivot = hips)
//      │  └─ feet       (follow the skirt — so when he sits, his feet go with it)
//      ├─ torso, belt, shawl, neck
//      ├─ head        ← origin at the centre of the head (pivot = turning the head)
//      │  └─ face skin, hair, beard, halo
//      ├─ leftArm     ← origin at the SHOULDER (pivot = shoulder joint)
//      │  └─ sleeve, hand
//      └─ rightArm    ← same
//
// The trick for joints: put each limb in its own Group whose origin is the JOINT,
// then shift the limb's geometry so it hangs from that origin. Rotating the group
// then swings the limb around the joint, like a real shoulder.

import * as THREE from 'three'

const HIP_HEIGHT = 0.85

// ----- Step 7: SHARED geometries --------------------------------------------------
// In Step 6, createPerson() built brand-new geometries every time it ran. With 13
// people that's 13 identical copies of every shape in memory (and uploaded to the GPU).
// A geometry can be used by any number of meshes, so we build each shape ONCE, here
// at the top of the module (this code runs a single time, when the file is imported),
// and every person's meshes point at the same ones.
const GEOMETRY = {
  // The skirt hangs DOWN from the hips: translate it so its TOP is at the origin.
  skirt: new THREE.CylinderGeometry(0.22, 0.3, HIP_HEIGHT, 10).translate(0, -HIP_HEIGHT / 2, 0),
  foot: new THREE.BoxGeometry(0.09, 0.05, 0.18),
  // The torso stands UP from the hips: bottom at the origin.
  torso: new THREE.CylinderGeometry(0.19, 0.22, 0.5, 10).translate(0, 0.25, 0),
  belt: new THREE.CylinderGeometry(0.228, 0.228, 0.07, 10),
  shawl: new THREE.CylinderGeometry(0.2, 0.26, 0.2, 10),
  neck: new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6),
  face: new THREE.IcosahedronGeometry(0.12, 1),
  // Hair: the top part of a sphere. SphereGeometry's last 4 arguments cut out a slice:
  // (phiStart, phiLength) go AROUND, (thetaStart, thetaLength) go from top to bottom.
  // thetaLength = 0.55π → a cap covering the top ~half.
  hairCap: new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hairBack: new THREE.CylinderGeometry(0.11, 0.1, 0.16, 8),
  beard: new THREE.ConeGeometry(0.065, 0.12, 6),
  halo: new THREE.TorusGeometry(0.2, 0.012, 6, 32),
  // The sleeve hangs DOWN from the shoulder: translate its top to the origin.
  sleeve: new THREE.CylinderGeometry(0.055, 0.075, 0.5, 6).translate(0, -0.25, 0),
  hand: new THREE.IcosahedronGeometry(0.045, 0),
}
// (Note: .translate() returns the geometry itself, so it can be chained right after `new`.)

// ----- Step 7: SHARED materials (a cache) -----------------------------------------
// Same idea for materials: two disciples in the same brown mantle can share ONE
// material. A Map remembers every material we've made, keyed by colour; asking for a
// colour we've seen before returns the existing material instead of a new one.
const materialCache = new Map()

function material(color) {
  if (!materialCache.has(color)) {
    // flatShading for the low-poly look (Step 2).
    materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }))
  }
  return materialCache.get(color)
}

// The halo's glowing material is special (emissive), and only Jesus has one.
// `emissive` = light the material gives off ITSELF: it glows even in shadow, without
// lighting anything else. (In Step 12, a "bloom" effect will make it softly shine.)
const haloMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd27a,
  emissive: 0xffb84a,
  emissiveIntensity: 0.8,
  roughness: 0.4,
})

// Small helper: create a mesh, set its position, add it to a parent — in one line.
function part(geometry, mat, parent, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}

// Default look. Every option can be overridden: createPerson({ robe: 0x88aacc })
// The `...defaults, ...options` trick below merges them: options win.
const defaults = {
  name: 'Someone',
  robe: 0xd8cdb4, // undyed linen
  mantle: 0x7a5b3a, // brown shawl & belt
  skin: 0xb98660,
  hair: 0x3b2618,
  beard: true,
  halo: false,
}

export function createPerson(options = {}) {
  const look = { ...defaults, ...options }

  const robeMat = material(look.robe)
  const mantleMat = material(look.mantle)
  const skinMat = material(look.skin)
  const hairMat = material(look.hair)
  const sandalMat = material(0x4a3524)

  // ----- person: the root. Origin = between the feet, on the ground. -----
  const person = new THREE.Group()
  // Every Object3D has a `name` — handy for debugging, and for Step 11 (click → name).
  person.name = look.name

  // ----- body: origin at hip height. Everything else hangs off this. -----
  const body = new THREE.Group()
  body.position.y = HIP_HEIGHT // LOCAL: 0.85 m above the person's origin
  person.add(body)

  // ----- skirt (lower robe): hangs DOWN from the hips (pivot = hip joint) -----
  const skirt = new THREE.Group()
  body.add(skirt)
  part(GEOMETRY.skirt, robeMat, skirt)

  // Feet peek out at the front of the robe hem. Children of the skirt (y = -0.85 is
  // the ground, measured from the hips). +z is the figure's FRONT.
  part(GEOMETRY.foot, sandalMat, skirt, -0.09, -HIP_HEIGHT + 0.025, 0.2)
  part(GEOMETRY.foot, sandalMat, skirt, 0.09, -HIP_HEIGHT + 0.025, 0.2)

  // ----- torso, belt, shawl, neck -----
  part(GEOMETRY.torso, robeMat, body)
  part(GEOMETRY.belt, mantleMat, body, 0, 0.02, 0)
  part(GEOMETRY.shawl, mantleMat, body, 0, 0.42, 0)
  part(GEOMETRY.neck, skinMat, body, 0, 0.56, 0)

  // ----- head: its own group, so it can turn (origin = centre of the head) -----
  const head = new THREE.Group()
  head.position.y = 0.7
  body.add(head)

  const face = part(GEOMETRY.face, skinMat, head)
  face.scale.set(0.92, 1.08, 0.98) // a little taller than wide

  const hair = part(GEOMETRY.hairCap, hairMat, head, 0, 0.015, -0.015)
  // Straight on, the cap's rim sits at eye level and hides the face. Tilting it BACK
  // (negative x-rotation, around the head's centre) lifts the rim at the front up to
  // the forehead and drops it at the back towards the neck — like real hair.
  hair.rotation.x = -0.6
  // Longer hair at the back: a short cylinder behind the head, down to the neck.
  part(GEOMETRY.hairBack, hairMat, head, 0, -0.06, -0.04)

  if (look.beard) {
    // A cone pointing DOWN (rotated 180° = π around x), under the chin at the front.
    const beard = part(GEOMETRY.beard, hairMat, head, 0, -0.11, 0.065)
    beard.rotation.x = Math.PI
  }

  if (look.halo) {
    part(GEOMETRY.halo, haloMaterial, head, 0, 0.04, -0.09)
  }

  // ----- arms: each in a group whose origin is the SHOULDER joint -----
  function createArm(side) {
    // side = +1 → the +x side, -1 → the -x side. Careful: the figure FACES +z (towards
    // the starting camera), like a person facing you — so HIS left hand is on YOUR
    // right, at +x. Mirror-image thinking is a classic 3D head-scratcher!
    const arm = new THREE.Group()
    arm.position.set(side * 0.24, 0.46, 0) // shoulder, relative to the hips
    body.add(arm)

    part(GEOMETRY.sleeve, robeMat, arm)
    part(GEOMETRY.hand, skinMat, arm, 0, -0.53, 0)

    // Rest pose: arms slightly away from the body (rotate around z = sideways swing).
    arm.rotation.z = side * 0.12
    return arm
  }
  const leftArm = createArm(1) // his left = +x
  const rightArm = createArm(-1) // his right = -x

  // userData is a free "pocket" on every object for our own data. We keep handy
  // references to the joints so other code can pose and animate the figure.
  person.userData.parts = { body, skirt, head, leftArm, rightArm }
  return person
}

// =============================================================
// Step 7 — Poses
// =============================================================
// A pose is just a set of joint rotations. Because every limb hangs from a pivot,
// sitting down is: swing the skirt (legs) forward 90° at the hips, and lower the hips.
//
// Sitting on the grass with legs stretched out, the hips are about 0.2 m up
// (roughly the flattened skirt's thickness, so the robe rests ON the ground).
const SITTING_HIP_HEIGHT = 0.2

export function poseSitting(person, style = 'relaxed') {
  const { body, skirt, leftArm, rightArm } = person.userData.parts

  body.position.y = SITTING_HIP_HEIGHT
  // −90° around x swings the skirt from "hanging down" to "pointing forward" (+z).
  skirt.rotation.x = -Math.PI / 2
  // A round 60 cm-wide cylinder pointing forward looks like a log, not two legs under
  // a robe. Fabric lies flatter when you sit, so we squash it. Careful — scale is in
  // the skirt's LOCAL axes, which rotated with it: local y now points FORWARD (length,
  // keep 1), local z now points UP (thickness → 0.6), local x is still width (→ 0.8).
  skirt.scale.set(0.8, 1, 0.6)

  if (style === 'relaxed') {
    // Upright, hands resting on the lap: arms swung forward a little.
    leftArm.rotation.set(-0.55, 0, 0.15)
    rightArm.rotation.set(-0.55, 0, -0.15)
  } else if (style === 'leaning') {
    // Leaning back on both hands. Tilting the BODY tilts everything in it — including
    // the legs, which would lift off the ground! So we lean the body back by `lean`
    // and rotate the skirt the opposite way by the same amount: in WORLD space the
    // legs stay flat. (Child rotations ADD to their parent's: −lean + lean = 0.)
    const lean = 0.3
    body.rotation.x = -lean
    skirt.rotation.x = -Math.PI / 2 + lean
    // Arms reach back and out to prop him up.
    leftArm.rotation.set(0.75, 0, 0.35)
    rightArm.rotation.set(0.75, 0, -0.35)
  } else if (style === 'hugging') {
    // Leaning forward, arms reaching for the knees.
    const lean = 0.25
    body.rotation.x = lean
    skirt.rotation.x = -Math.PI / 2 - lean
    leftArm.rotation.set(-1.1, 0, 0.05)
    rightArm.rotation.set(-1.1, 0, -0.05)
  }
}
