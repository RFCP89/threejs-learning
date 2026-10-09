# Extra — Time of day: Day / Sunset / Night

Three buttons in the bottom-left corner switch the scene between three times of day,
blending smoothly over 2.5 s. Code: `src/timeOfDay.js` (+ small hooks in `atmosphere.js`,
`fireflies.js`, `main.js` section 8c, `index.html`, `style.css`).

Open straight on one time with `?time=day` / `?time=night` (default: sunset).

## 1. A time of day is just data

Changing the hour touches a dozen values that must all agree (Step 8's lesson). So each
time of day is one plain object — a **preset**:

```js
export const TIMES = {
  day:    { skySun: { elevation: 50, azimuth: 200 }, sunColor: 0xfff4e2, fogColor: 0xc9d9e4, … },
  sunset: { … },   // exactly Step 8's values
  night:  { … },
}
```

Adding "Dawn" later = adding one more object and one more button.

## 2. Blending (tweening)

A switch doesn't jump: every value goes from where it is **now** to the new preset.

```js
out.x = THREE.MathUtils.lerp(from.x, to.x, t)   // numbers
out.color.lerpColors(from.color, to.color, t)   // colours
```

- `t` runs 0 → 1 over `DURATION`, advanced by the **time since the last frame** (`delta`) —
  so it takes 2.5 s on a 60 Hz *and* a 144 Hz screen.
- `t` goes through an **ease-in-out** curve (`t² (3 − 2t)`): slow start, slow end.
- "From" is a copy of what's on screen, so clicking again mid-blend never jumps.
- Colours are objects → copying a state must `.clone()` them, or both copies share one colour.

## 3. Sun vs moon: one light, two directions

Night isn't "the sun, darker". The sky's sun sinks **below the horizon** (−12°), while the
DirectionalLight becomes the **moon**: high, cool blue, ~⅕ the strength — and still casting
shadows. So presets have two directions: `skySun` (what the sky draws) and `light`.

## 4. The night sky needed help

The Preetham sky model is physical: no sun → almost **black**. Real night skies have a
faint blue glow, so `atmosphere.js` adds a colour (`uNightGlow`) to the sky shader — black by
day, deep navy at night. The **fog uses the same colour**, so the ground melts into the sky.

## 5. The environment map must follow the sky

The environment map (Step 8) is a capture of the sky — a stale capture lights a night scene
with noon light. So `createEnvironment` now runs on every switch:

- It returns the whole **render target**: we `.dispose()` the old one, or every switch would
  leak GPU memory.
- Capturing = rendering 6 views + blurring. Too heavy for every frame, so during a blend it
  re-captures at most every 0.15 s (and once at the end). The eye doesn't notice.

## 6. Tuning story: Day was blinding

First try: day sun intensity 3.0 (like sunset). White robes blazed and glowed.

- A **high** sun hits surfaces head-on; a sunset sun only grazes them → same intensity, far
  more light. Lowered to 1.6.
- Lowering the exposure didn't help the glow: **bloom runs before exposure** (Step 12's
  pipeline: RenderPass → Bloom → OutputPass/tone mapping). The light itself had to drop.
- The real culprit: the **noon sky** is very bright, and `environmentIntensity` 0.6 turned
  it into a milky flood. 0.2 → clear colours and proper shadows.

## 7. The buttons

Real `<button>`s (keyboard + screen readers for free), `data-time="night"` read as
`button.dataset.time`, and `aria-pressed="true"` marks the active one — the CSS styles that
same attribute, so state and look can't drift apart. On narrow screens the hint moves up so
it doesn't cover them.
