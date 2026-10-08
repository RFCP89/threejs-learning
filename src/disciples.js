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
// `about` (Step 11) is shown in the label when you click someone.
export const TWELVE = [
  { name: 'Simon Peter', about: 'Fisherman from Bethsaida. Jesus called him Cephas, “the rock”.', robe: 0xb9a684, mantle: 0x4f6b8a, skin: SKIN.medium, hair: HAIR.grey, pose: 'leaning' },
  { name: 'Andrew', about: 'Fisherman, Peter’s brother — the first to follow Jesus.', robe: 0xcfc2a1, mantle: 0x6b7a4a, skin: SKIN.medium, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'James, son of Zebedee', about: 'Fisherman, brother of John. One of the “sons of thunder”.', robe: 0xa98f6a, mantle: 0x8c3b2e, skin: SKIN.dark, hair: HAIR.black, pose: 'hugging' },
  // John is traditionally the youngest: no beard.
  { name: 'John', about: 'Fisherman, brother of James — traditionally the youngest.', robe: 0xe3d9c2, mantle: 0x3f6f7a, skin: SKIN.light, hair: HAIR.brown, beard: false, pose: 'relaxed' },
  { name: 'Philip', about: 'From Bethsaida. He brought Nathanael to meet Jesus.', robe: 0xc4b08c, mantle: 0x7a4a6b, skin: SKIN.medium, hair: HAIR.brown, pose: 'leaning' },
  { name: 'Bartholomew', about: 'Often identified with Nathanael of Cana.', robe: 0xb3a07a, mantle: 0x5e5a3a, skin: SKIN.dark, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'Thomas', about: 'Called Didymus, “the twin”.', robe: 0xd2c4a6, mantle: 0x4a5a7a, skin: SKIN.light, hair: HAIR.black, pose: 'hugging' },
  { name: 'Matthew', about: 'A tax collector, also called Levi.', robe: 0xe0d4b8, mantle: 0x9a7b3c, skin: SKIN.medium, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'James, son of Alphaeus', about: 'Sometimes called James the Less.', robe: 0xbfae8e, mantle: 0x6a4a3a, skin: SKIN.dark, hair: HAIR.brown, pose: 'leaning' },
  { name: 'Thaddaeus', about: 'Also known as Judas, son of James.', robe: 0xa89878, mantle: 0x3e5a4a, skin: SKIN.light, hair: HAIR.dark, pose: 'relaxed' },
  { name: 'Simon the Zealot', about: 'Known as “the Zealot”.', robe: 0xc9b896, mantle: 0x7a2e2e, skin: SKIN.medium, hair: HAIR.black, pose: 'hugging' },
  { name: 'Judas Iscariot', about: 'He kept the group’s money bag.', robe: 0xb7a68a, mantle: 0x5a5a5a, skin: SKIN.dark, hair: HAIR.black, pose: 'relaxed' },
]

const JESUS = { name: 'Jesus', about: 'The teacher from Nazareth.', robe: 0xf2ead8, mantle: 0x9e2b25, halo: true, pose: 'relaxed' }

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

  // ----- Step 10: idle life -------------------------------------------------------
  // Real people are never perfectly still. Each disciple gets three tiny motions:
  //   breathing — the upper body leans a hair forward/back
  //   sway      — a slow side-to-side drift
  //   glances   — the head turns a little around its resting direction
  // Every motion is an OFFSET added to the pose's own rotation, so first we remember
  // each joint's resting values (set by poseSitting and the head turn above).
  const disciples = group.children.filter((person) => person !== jesus)
  disciples.forEach((person, i) => {
    const { body, skirt, head } = person.userData.parts
    person.userData.rest = {
      bodyX: body.rotation.x,
      skirtX: skirt.rotation.x,
      headY: head.rotation.y,
      phase: i * 2.4, // a different starting point per person → nobody moves in sync
      speed: 0.8 + (i % 4) * 0.12, // and slightly different tempos
    }
  })

  function update(seconds) {
    disciples.forEach((person) => {
      const { body, skirt, head } = person.userData.parts
      const rest = person.userData.rest
      const t = seconds * rest.speed + rest.phase

      // Breathing: ~one breath every 4 s. The skirt gets the OPPOSITE offset so the
      // legs stay flat on the ground — the Step 7 compensation trick again.
      const breath = Math.sin(t * 1.5) * 0.02
      body.rotation.x = rest.bodyX + breath
      skirt.rotation.x = rest.skirtX - breath

      // Sway (no compensation needed: a tiny sideways tilt is invisible on the legs).
      body.rotation.z = Math.sin(t * 0.4) * 0.025

      // Glance around the resting direction, and nod very slightly.
      head.rotation.y = rest.headY + Math.sin(t * 0.3) * 0.15
      head.rotation.x = Math.sin(t * 0.55) * 0.05
    })
  }

  return { group, jesus, update }
}
