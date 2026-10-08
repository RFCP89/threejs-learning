# Step 0 — Project setup

## The files

| File | What it is |
|---|---|
| `package.json` | The project's ID card: name, scripts, and which packages it depends on. |
| `package-lock.json` | Auto-generated. Records the *exact* version of every package installed, so everyone gets identical installs. Commit it, never edit it. |
| `node_modules/` | Where npm puts the downloaded packages. Huge, recreatable → ignored by git. |
| `index.html` | The page the browser loads. Holds a `<canvas>` and loads `src/main.js`. |
| `src/main.js` | Our JavaScript — all the three.js code goes here (and later in more files). |
| `src/style.css` | Makes the canvas fill the window. |
| `.gitignore` | Files git should not track. |

## Key ideas

- **npm** downloads JavaScript libraries. `npm install three` adds three.js to
  `dependencies` (needed by the app). `npm install --save-dev vite` adds Vite to
  `devDependencies` (only needed while developing/building).
- **Vite** is a dev server + bundler. Browsers can't understand `import * as THREE from 'three'`
  on their own (they don't know where "three" lives). Vite rewrites that to the real file in
  `node_modules`, and reloads the page instantly whenever you save.
- **`"type": "module"`** in package.json tells Node our JS uses modern `import`/`export` syntax.
- **`<canvas>`** is the only element WebGL can draw into. three.js is a friendly layer on top of WebGL.

## Try it

`npm run dev`, open the URL, open DevTools (F12) → Console. You should see
`Calm Creek: Vite is running ✔`. Change the message in `src/main.js`, save, and watch it update.
