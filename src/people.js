// =============================================================
// Step 6 — People: a low-poly figure built from simple shapes
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

// One material per colour. flatShading for the low-poly look (Step 2).
function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...options })
}

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

  // ----- body: origin at hip height. Everything else hangs off this. -----
  const HIP_HEIGHT = 0.85
  const body = new THREE.Group()
  body.position.y = HIP_HEIGHT // LOCAL: 0.85 m above the person's origin
  person.add(body)

  // ----- skirt (lower robe): a cone-ish cylinder hanging DOWN from the hips -----
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
  // Geometry is centred on its own origin, so we translate it down by half its height:
  // now its TOP is at the origin → the skirt's group origin is the hip joint.
  const skirt = new THREE.Group()
  body.add(skirt)
  const skirtGeometry = new THREE.CylinderGeometry(0.22, 0.3, HIP_HEIGHT, 10)
  skirtGeometry.translate(0, -HIP_HEIGHT / 2, 0)
  part(skirtGeometry, robeMat, skirt)

  // Feet peek out at the front of the robe hem. Children of the skirt (y = -0.85 is
  // the ground, measured from the hips). +z is the figure's FRONT.
  const footGeometry = new THREE.BoxGeometry(0.09, 0.05, 0.18)
  part(footGeometry, sandalMat, skirt, -0.09, -HIP_HEIGHT + 0.025, 0.2)
  part(footGeometry, sandalMat, skirt, 0.09, -HIP_HEIGHT + 0.025, 0.2)

  // ----- torso: from the hips up to the shoulders -----
  const torsoGeometry = new THREE.CylinderGeometry(0.19, 0.22, 0.5, 10)
  torsoGeometry.translate(0, 0.25, 0) // bottom at the hips
  part(torsoGeometry, robeMat, body)

  // Belt (a short, slightly wider cylinder at the hips) and a shawl over the shoulders.
  part(new THREE.CylinderGeometry(0.228, 0.228, 0.07, 10), mantleMat, body, 0, 0.02, 0)
  part(new THREE.CylinderGeometry(0.2, 0.26, 0.2, 10), mantleMat, body, 0, 0.42, 0)

  // Neck
  part(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6), skinMat, body, 0, 0.56, 0)

  // ----- head: its own group, so it can turn (origin = centre of the head) -----
  const head = new THREE.Group()
  head.position.y = 0.7
  body.add(head)

  const face = part(new THREE.IcosahedronGeometry(0.12, 1), skinMat, head)
  face.scale.set(0.92, 1.08, 0.98) // a little taller than wide

  // Hair: the top part of a sphere. SphereGeometry's last 4 arguments cut out a slice:
  // (phiStart, phiLength) go AROUND, (thetaStart, thetaLength) go from top to bottom.
  // thetaLength = 0.55π → a cap covering the top ~half.
  const hairGeometry = new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)
  const hair = part(hairGeometry, hairMat, head, 0, 0.015, -0.015)
  // Straight on, the cap's rim sits at eye level and hides the face. Tilting it BACK
  // (negative x-rotation, around the head's centre) lifts the rim at the front up to
  // the forehead and drops it at the back towards the neck — like real hair.
  hair.rotation.x = -0.6
  // Longer hair at the back: a short cylinder behind the head, down to the neck.
  part(new THREE.CylinderGeometry(0.11, 0.1, 0.16, 8), hairMat, head, 0, -0.06, -0.04)

  if (look.beard) {
    // A cone pointing DOWN (rotated 180° = π around x), under the chin at the front.
    const beard = part(new THREE.ConeGeometry(0.065, 0.12, 6), hairMat, head, 0, -0.11, 0.065)
    beard.rotation.x = Math.PI
  }

  if (look.halo) {
    // A thin golden ring behind the head. `emissive` = light the material gives off
    // ITSELF: it glows even in shadow, without lighting anything else. (In Step 12,
    // a "bloom" effect will make emissive things softly shine.)
    const haloMat = material(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 0.8, roughness: 0.4 })
    part(new THREE.TorusGeometry(0.2, 0.012, 6, 32), haloMat, head, 0, 0.04, -0.09)
  }

  // ----- arms: each in a group whose origin is the SHOULDER joint -----
  function createArm(side) {
    // side = +1 → the +x side, -1 → the -x side. Careful: the figure FACES +z (towards
    // the starting camera), like a person facing you — so HIS left hand is on YOUR
    // right, at +x. Mirror-image thinking is a classic 3D head-scratcher!
    const arm = new THREE.Group()
    arm.position.set(side * 0.24, 0.46, 0) // shoulder, relative to the hips
    body.add(arm)

    // The sleeve hangs DOWN from the shoulder: translate its top to the origin.
    const sleeveGeometry = new THREE.CylinderGeometry(0.055, 0.075, 0.5, 6)
    sleeveGeometry.translate(0, -0.25, 0)
    part(sleeveGeometry, robeMat, arm)
    part(new THREE.IcosahedronGeometry(0.045, 0), skinMat, arm, 0, -0.53, 0) // hand

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
