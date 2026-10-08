// =============================================================
// Step 7 — The gathering: Jesus and the twelve, sitting in a circle
// =============================================================
// Two lessons in this file:
//  1. DATA vs CODE. Who the twelve are (names, colours, poses) is plain data in an
//     array. The code below just loops over it. Want to change John's mantle? Edit
//     the data — no logic to touch.
//  2. PLACING THINGS IN A CIRCLE with sin/cos ("polar coordinates").

import * as THREE from 'three'
import { createPerson, poseSitting } from './people.js'
import { getTerrainHeight } from './terrain.js'

// Skin tones and hair colours used below (named, so the data reads clearly).
const SKIN = { light: 0xc79a72, medium: 0xb98660, dark: 0x9a6a48 }
const HAIR = { black: 0x221812, dark: 0x3b2618, brown: 0x5a3a22, grey: 0x8a8580 }

// The twelve, in the order of Matthew 10:2–4. Robes are undyed linens and wools;
// mantles use the earthy dyes of the time (madder red, indigo, ochre, olive…).
// `pose` is one of the styles in people.js → poseSitting().
export const TWELVE = [
  { name: 'Simon Peter', robe: 0xb9a684, mantle: 0x4f6b8a, skin: SKIN.medium, hair: HAIR.grey, pose: 'leaning' },
  { name: 'Andrew', robe: 0xcfc2a1, mantle: 0x6b7a4a, skin: SKIN.medium, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'James, son of Zebedee', robe: 0xa98f6a, mantle: 0x8c3b2e, skin: SKIN.dark, hair: HAIR.black, pose: 'hugging' },
  // John is traditionally the youngest: no beard.
  { name: 'John', robe: 0xe3d9c2, mantle: 0x3f6f7a, skin: SKIN.light, hair: HAIR.brown, beard: false, pose: 'relaxed' },
  { name: 'Philip', robe: 0xc4b08c, mantle: 0x7a4a6b, skin: SKIN.medium, hair: HAIR.brown, pose: 'leaning' },
  { name: 'Bartholomew', robe: 0xb3a07a, mantle: 0x5e5a3a, skin: SKIN.dark, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'Thomas', robe: 0xd2c4a6, mantle: 0x4a5a7a, skin: SKIN.light, hair: HAIR.black, pose: 'hugging' },
  { name: 'Matthew', robe: 0xe0d4b8, mantle: 0x9a7b3c, skin: SKIN.medium, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'James, son of Alphaeus', robe: 0xbfae8e, mantle: 0x6a4a3a, skin: SKIN.dark, hair: HAIR.brown, pose: 'leaning' },
  { name: 'Thaddaeus', robe: 0xa89878, mantle: 0x3e5a4a, skin: SKIN.light, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'Simon the Zealot', robe: 0xc9b896, mantle: 0x7a2e2e, skin: SKIN.medium, hair: HAIR.black, pose: 'hugging' },
  { name: 'Judas Iscariot', robe: 0xb7a68a, mantle: 0x5a5a5a, skin: SKIN.dark, hair: HAIR.black, pose: 'relaxed' },
]

const JESUS = { name: 'Jesus', robe: 0xf2ead8, mantle: 0x9e2b25, halo: true, pose: 'relaxed' }

// How far each person sits from the centre of the circle (metres). Their legs
// stretch ~1 m towards the centre, leaving room in the middle for a fire (Step 10).
const CIRCLE_RADIUS = 2.2

// Build all 13 and arrange them in a circle around `center` ({ x, z }).
// `viewFrom` ({ x, z }) is where the camera starts: Jesus gets the seat on the FAR
// side of the circle, so he faces the viewer across the circle.
export function createGathering(center, viewFrom) {
  const group = new THREE.Group()
  group.name = 'Gathering'

  // Jesus first, then the twelve: 13 people, 13 seats.
  const everyone = [JESUS, ...TWELVE]

  // ----- Polar coordinates -----
  // A point on a circle is described by an ANGLE and a RADIUS. To turn that into x/z:
  //     x = centre.x + radius · sin(angle)
  //     z = centre.z + radius · cos(angle)
  // (angle 0 → straight along +z; growing angle → going around the circle.)
  //
  // Math.atan2 does the reverse: from a direction (dx, dz) back to an angle.
  // The angle pointing at the viewer, + π (half a turn) = the opposite side.
  const angleToViewer = Math.atan2(viewFrom.x - center.x, viewFrom.z - center.z)
  const startAngle = angleToViewer + Math.PI
  // A full circle is 2π radians; split it into 13 equal slices.
  const step = (Math.PI * 2) / everyone.length

  let jesus = null

  everyone.forEach((data, i) => {
    const person = createPerson(data)
    poseSitting(person, data.pose)

    const angle = startAngle + i * step
    const x = center.x + CIRCLE_RADIUS * Math.sin(angle)
    const z = center.z + CIRCLE_RADIUS * Math.cos(angle)
    person.position.set(x, getTerrainHeight(x, z), z)

    // Everyone faces the middle of the circle (their legs point inwards).
    person.lookAt(center.x, person.position.y, center.z)

    // A little life: each disciple turns his head slightly, by a different amount.
    // (Using the index i instead of random → the same every reload, no seed needed.)
    if (i > 0) person.userData.parts.head.rotation.y = Math.sin(i * 1.7) * 0.35

    group.add(person)
    if (i === 0) jesus = person
  })

  return { group, jesus }
}
