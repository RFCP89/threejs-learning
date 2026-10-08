# Step 12 — Polish: bloom, performance, debug mode, publishing

## 1. Post-processing

Instead of drawing straight to the screen, render into an off-screen image and run
full-screen effects over it — like photo filters:

```js
const composer = new EffectComposer(renderer, renderTarget)
composer.addPass(new RenderPass(scene, camera))      // scene → image (HDR)
composer.addPass(new UnrealBloomPass(size, strength, radius, threshold))
composer.addPass(new OutputPass())                   // tone mapping + screen colours
composer.render()                                    // instead of renderer.render()
```

- **HDR render target** (`HalfFloatType`): colours above 1 survive until the bloom sees them.
- **MSAA** (`samples: 4`): the canvas's `antialias` doesn't apply to render targets — they need
  their own, or edges go jagged.
- Tone mapping now happens in **OutputPass**, at the very end.
- Resize the composer too, in the resize handler.

## 2. Bloom = threshold + blur + add

Everything brighter than `threshold` is blurred and added back → glow.
**The art is choosing what's bright.** We made light sources HDR on purpose
(flames ×3, halo `emissiveIntensity: 3`, fireflies up to ~4.5×) and set the threshold at 1.6.

Tuning story:
- threshold 1.0 → sunlit leaves and fire-lit robes glowed too: smeared.
- the sky's **sun disc** is thousands of times over → glare. Hidden (`showSunDisc = 0`).
- **sun glints on the water** were huge too → clamped in the water shader after
  `<opaque_fragment>`: `gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(2.5))`.
  Clamping extreme pixels is a standard trick in real renderers.
- A firefly next to the camera became a giant blob → `gl_PointSize = min(…)`.

### Follow-up fix: looking straight at the sun was blinding

Measured: the screen averaged **90 % brightness** when facing the sun — almost pure white.
Near the sun, the sky shader outputs values dozens of times above 1 → bloom + tone mapping
turn the whole screen white.

1. **Soft knee on the sky** (`atmosphere.js`, injected before the sky's `gl_FragColor`):
   below 0.8 nothing changes; above, brightness approaches 1.4 (under the bloom threshold)
   but never passes it. All three channels are scaled by the same factor → the **hue is
   kept**: the sunset stays orange instead of turning white.
2. **But not for the environment map.** The first try compressed the sky everywhere, and the
   whole scene went twice as dark (39 % → 19 %): the env map *is* the sky's light. So the knee
   has an on/off uniform (`uSoftLimit`) that `createEnvironment` switches **off** while capturing.
   Lesson: what the eye sees and what lights the scene can be treated differently.
3. **Water clamp lowered 2.5 → 1.5** — just under the bloom threshold, so glints sparkle
   without spreading glare.

Result: facing the sun 90 % → 48 % average brightness, with a visible sunset gradient.

## 3. Debug mode from the URL

```js
const DEBUG = new URLSearchParams(window.location.search).has('debug')
```

Clean by default; `?debug` shows axes, the FPS meter (`stats.module.js`) and the draw-call log.

## 4. Performance checklist (what this project already does)

| Technique | Where |
|---|---|
| Instancing (190 objects → few draw calls) | Step 5 |
| Shared geometries & materials | Step 7 |
| Animation on the GPU (water, fireflies) | Steps 9–10 |
| Pixel ratio capped at 2 | Step 1 |
| No point-light shadows; small shadow box | Steps 8, 10 |
| Raycast only the people, not the whole scene | Step 11 |
| `setAnimationLoop` pauses in hidden tabs | built-in |

`renderer.info` counts per *render call*; the composer makes several per frame, so we set
`info.autoReset = false` and call `info.reset()` once per frame.

## 5. Building & publishing

- `npm run build` → `dist/`: plain HTML/CSS/JS, ~620 kB JS (≈158 kB gzipped). Any static host works.
- `base: './'` in `vite.config.js` → relative paths, so it works in a sub-folder
  (`https://<user>.github.io/threejs-learning/`). Tested by serving `dist/` from a sub-folder.
- `.github/workflows/deploy.yml` → GitHub Actions builds and publishes on every push to `main`.
  ⚠️ GitHub Pages for a **private** repo needs a paid plan; alternatives: make the repo public,
  or deploy `dist/` to Netlify / Cloudflare Pages / Vercel.

## Try it

1. Bloom: `strength` 1.5, `radius` 1, `threshold` 0.5 — dreamy overload. Then find your own balance.
2. Remove the water clamp line — see the glare come back. Or set `uSoftLimit` to 0 and look at the sun.
3. Open `?debug`, click the FPS meter to see ms/frame. Toggle shadows off: how many ms do they cost?
4. Add another pass: `import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'` → film grain.
5. Lower `samples: 4` to `0` and look at the edges of the figures.
6. Run `docker compose exec web npm run build` and look inside `dist/assets` — that's your whole app.
