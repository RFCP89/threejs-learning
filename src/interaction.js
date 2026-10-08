// =============================================================
// Step 11 — Interaction: hover & click people with RAYCASTING
// =============================================================
// The question: "the mouse is at pixel (x, y) — which 3D object is under it?"
//
// RAYCASTING answers it: shoot an invisible ray from the camera, through that pixel,
// out into the world, and list every object it hits, nearest first. (Same idea as a
// laser pointer — and as how shadows were tested in Step 8.)
//
// Then the opposite question, for the label: "this 3D point (a head) — which pixel is
// it on?" That's PROJECTION: vector.project(camera).

import * as THREE from 'three'

export function createInteraction({ camera, canvas, controls, people }) {
  const raycaster = new THREE.Raycaster()
  // The mouse position in "normalized device coordinates" (NDC): the raycaster wants
  // x and y from -1 to +1 across the canvas, with +y UP (screen pixels have +y DOWN).
  const pointer = new THREE.Vector2()

  const label = document.querySelector('#label')
  const labelName = label.querySelector('.label-name')
  const labelAbout = label.querySelector('.label-about')

  let hovered = null // the person under the mouse right now (or null)
  let selected = null // the person whose label is showing (or null)

  // ----- Camera flights (close-up on click, back to the overview on empty click) -----
  // A "tween" (from in-between): animate from a START to an END over a fixed DURATION.
  // Each frame: progress t = elapsed / duration (0 → 1), shaped by an EASING curve,
  // then position = start + (end − start) · eased(t).
  // (Step 11 first used a lerp: "6 % of the remaining way per frame" — simple, but it
  // starts abruptly and its duration depends on the frame rate. A tween has a known
  // length and a gentle start AND finish.)
  const flight = {
    active: false,
    startTime: 0,
    duration: 1.4, // seconds
    fromPosition: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toPosition: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  }

  // Remember the starting view, so an empty click can fly back to it.
  const overview = { position: camera.position.clone(), target: controls.target.clone() }
  let inCloseUp = false

  // Ease-in-out cubic: slow start, fast middle, slow end — like a camera operator
  // pushing a dolly. Plot it: an S-shaped curve from (0,0) to (1,1).
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function flyTo(position, target) {
    flight.fromPosition.copy(camera.position)
    flight.fromTarget.copy(controls.target)
    flight.toPosition.copy(position)
    flight.toTarget.copy(target)
    flight.startTime = performance.now() / 1000 // performance.now(): ms since page load
    flight.active = true
  }

  // If the user grabs the controls mid-flight (drag, scroll), they win: stop flying.
  // OrbitControls fires a 'start' event whenever an interaction begins.
  controls.addEventListener('start', () => {
    flight.active = false
  })

  // Close-up: where should the camera go to look a person in the face?
  const headWorld = new THREE.Vector3()
  const facing = new THREE.Vector3()
  function closeUpOn(person) {
    // The head's position in the WORLD (it's nested inside body → person, Step 6).
    person.userData.parts.head.getWorldPosition(headWorld)
    // getWorldDirection: which way the object's +z (its FRONT, Step 6) points, in the
    // world. Everyone faces the fire (Step 7's lookAt), so this points at the fire.
    person.getWorldDirection(facing)
    // 1.3 m in front of the face, a little above eye level (looking slightly down
    // feels natural for a seated person).
    const position = headWorld.clone().addScaledVector(facing, 1.3)
    position.y += 0.2
    flyTo(position, headWorld)
    inCloseUp = true
  }

  // ----- A golden ring on the ground under the hovered person -----
  // RingGeometry(innerRadius, outerRadius, segments): a flat ring, created standing up
  // like PlaneGeometry (Step 3) — so we lay it down.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.55, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8, toneMapped: false }),
  )
  ring.visible = false
  people.parent.add(ring) // into the same scene as the people

  // ----- From a pixel to a person -----
  function personAt(clientX, clientY) {
    // 1. Pixel → NDC. getBoundingClientRect: where the canvas sits on the page.
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1

    // 2. Aim the ray from the camera through that point.
    raycaster.setFromCamera(pointer, camera)

    // 3. Test only the people (not trees, ground…): faster, and nothing else matters.
    //    `true` = recursive: check children, grandchildren… all the body parts.
    const hits = raycaster.intersectObject(people, true)
    if (hits.length === 0) return null

    // 4. We hit a MESH — a hand, a sleeve, a beard… Walk UP the scene graph (Step 6)
    //    until we reach the person group: the one that has a name and userData.parts.
    let object = hits[0].object
    while (object && !object.userData.parts) object = object.parent
    return object
  }

  // ----- Hover -----
  canvas.addEventListener('pointermove', (event) => {
    hovered = personAt(event.clientX, event.clientY)
    // A hand cursor tells people "this is clickable" — tiny detail, big difference.
    canvas.style.cursor = hovered ? 'pointer' : ''
    ring.visible = hovered !== null
    if (hovered) ring.position.set(hovered.position.x, hovered.position.y + 0.03, hovered.position.z)
  })

  // ----- Click (but not drag!) -----
  // OrbitControls also uses the mouse: dragging to orbit ends with a mouse-up, which
  // the browser ALSO reports as a "click". So we remember where the press started and
  // only count it as a click if the pointer barely moved.
  const down = { x: 0, y: 0 }
  canvas.addEventListener('pointerdown', (event) => {
    down.x = event.clientX
    down.y = event.clientY
  })
  canvas.addEventListener('pointerup', (event) => {
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y)
    if (moved > 5) return // it was a drag → OrbitControls' business, not ours

    selected = personAt(event.clientX, event.clientY)
    if (selected) {
      labelName.textContent = selected.name
      labelAbout.textContent = selected.userData.about
      label.hidden = false
      closeUpOn(selected) // fly in for a face-to-face close-up
    } else {
      label.hidden = true // clicked on empty space → close the label…
      if (inCloseUp) {
        // …and fly back out to the overview.
        flyTo(overview.position, overview.target)
        inCloseUp = false
      }
    }
  })

  // ----- Every frame -----
  const headPosition = new THREE.Vector3()

  function update() {
    // Camera flight: move BOTH the camera and the point it looks at, so it travels
    // AND turns at the same time. lerpVectors(a, b, t) = a + (b − a) · t.
    if (flight.active) {
      const elapsed = performance.now() / 1000 - flight.startTime
      const t = Math.min(elapsed / flight.duration, 1) // clamp: never past the end
      const eased = easeInOutCubic(t)
      camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased)
      if (t === 1) flight.active = false // arrived: hand control back to the user
    }

    if (!selected) return

    // 3D → 2D: where is the head on screen right now? (The camera and the head both
    // move, so we redo this every frame.)
    // getWorldPosition: the head's position in WORLD space — its own .position is
    // LOCAL to the body (Step 6), which would put the label in the wrong place.
    selected.userData.parts.head.getWorldPosition(headPosition)
    headPosition.y += 0.25 // a bit above the head (and the halo)

    // project() turns a world position into NDC (-1..+1)… the reverse of what we did
    // for the mouse. Then NDC → CSS pixels.
    headPosition.project(camera)
    const rect = canvas.getBoundingClientRect()
    const x = rect.left + ((headPosition.x + 1) / 2) * rect.width
    const y = rect.top + ((1 - headPosition.y) / 2) * rect.height

    // z > 1 means the point is BEHIND the camera — don't show a label for it.
    label.hidden = headPosition.z > 1
    label.style.left = `${x}px`
    label.style.top = `${y}px`
  }

  return { update }
}
