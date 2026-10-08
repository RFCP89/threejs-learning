# Step 9 — Animated water: your first GLSL

## 1. What a shader is

Small programs that run **on the GPU**, in parallel, written in **GLSL** (C-like):

| Shader | Runs once per… | Job |
|---|---|---|
| **vertex** | vertex | where the point lands on screen |
| **fragment** | pixel | what colour the pixel is |

Every three.js material is a pair of shaders three.js writes for you.

## 2. Two ways to write your own

- **`ShaderMaterial`** — write both shaders from scratch. Total control, but no free lighting,
  reflections, fog or shadows: you'd rebuild all of Step 8 by hand.
- **`onBeforeCompile`** (what we did) — take `MeshStandardMaterial` and **inject** lines into
  its shaders. Keep everything three.js gives you, change only what you need.

```js
material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uniforms.uTime
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <normal_fragment_maps>',
    '#include <normal_fragment_maps>\n' + ourCode)
}
```

three.js shaders are assembled from named **chunks** (`#include <…>`). Browse them in
`node_modules/three/src/renderers/shaders/ShaderChunk/` to see where to hook in.

## 3. Uniforms and varyings

- **uniform** — a value from JavaScript, the same for every vertex/pixel in a frame.
  `uTime` is updated every frame by `updateWater(seconds)`. We pass the *same object*
  to the shader, so changing `.value` in JS updates the GPU.
- **varying** — a value the vertex shader hands to the fragment shader, blended across
  the triangle. We pass the world position (`vWaterWorldPos`) so each pixel knows where it is.

## 4. The trick: fake waves with normals

The water is still a flat 2-triangle plane! We only change its **normals** per pixel.
Lighting and reflections come from normals (Step 2), so the sun glints and mirrored sky
move as if the surface rippled. (This is the idea behind *normal maps*.)

For each wave: `height = amp · sin(dot(dir, p) · frequency − time · speed)`.
We need only the **slope**: `dir · amp · frequency · cos(…)` (derivative of sin = cos).
Summing 4 waves with different directions/sizes/speeds → a natural, non-repeating pattern.
`− time · speed` makes the waves *travel* along `dir` → the current flows along the creek.

Slope → normal: `normalize(vec3(-slope.x, 1.0, -slope.y))`, then converted to view space
with `viewMatrix`, because three.js lights in camera space.

## 5. GLSL survival kit

```glsl
float a = 1.0;             // decimals need the .0 — `1` is an int, GLSL is strict!
vec2 p = vec2(1.0, 2.0);   // vectors: vec2, vec3, vec4
p.x; p.xy; v.xyz;          // "swizzling": pick components
dot(a, b); normalize(v); sin(x); cos(x); mix(a, b, t); smoothstep(e0, e1, x);
```

A GLSL error doesn't show in your editor — it appears in the browser console as a
shader compile error with a line number.

## Try it

1. Double all the `amp` values → a choppy, windy creek.
2. Make the current flow the other way: negate the `uTime * speed` term (`+ uTime * speed`).
3. Remove all but the first wave — see how artificial a single wave looks.
4. Set `roughness: 0.4` on the water — reflections blur, glints spread.
5. Break the GLSL on purpose (write `1` instead of `1.0` in a vec3) and read the console error.
6. Debug-colour the slope: after the normal line add `diffuseColor.rgb = vec3(slope * 10.0 + 0.5, 0.5);`
   … it won't work there (diffuseColor is used earlier) — figure out which chunk to hook instead! (Hint: `<color_fragment>`.)
