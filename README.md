# Calm Creek — a three.js learning project

A peaceful 3D scene of a creek at golden hour, with Jesus and the twelve disciples
resting along its banks. Built one small step at a time to learn three.js.

## Run it (Docker — recommended)

```bash
docker compose up        # build (first time) + start → open http://localhost:5180
docker compose down      # stop and remove the container
```

Node and npm live **inside** the container, so nothing needs to be installed on your machine
except Docker. Edits to your files reload the page instantly. See [`notes/docker.md`](notes/docker.md).

## Run it (without Docker)

```bash
npm install     # once, downloads three.js and vite into node_modules/
npm run dev     # starts the dev server — open the URL it prints
```

## How to study this repo

Every step is **one git commit** plus a note in [`notes/`](notes/).

```bash
git log --oneline          # see all steps
git checkout <commit>      # jump back to any step and run it
git checkout main          # come back to the latest
git show <commit>          # see exactly what changed in a step
```

## Roadmap

| Step | Topic | Status |
|---|---|---|
| 0 | Project setup: Vite, npm, files | ✅ |
| 0.5 | Docker: run the dev server in a container | ✅ |
| 1 | Scene, camera, renderer, the render loop — a spinning rock | ✅ |
| 2 | Lights & materials — the rock gets real shading | ✅ |
| 3 | The ground & camera controls (OrbitControls) | ✅ |
| 4 | Building the creek: water plane, banks | ✅ |
| 5 | Nature: rocks & trees with instancing | ✅ |
| 6 | People: building a low-poly figure from simple shapes | ✅ |
| 7 | Thirteen figures: groups, cloning, placing them in a circle | |
| 8 | Atmosphere: sky, fog, golden-hour lighting, shadows | |
| 9 | Animating water with a shader | |
| 10 | Life: idle animations, fireflies (particles), a campfire | |
| 11 | Interaction: click a figure to see their name (raycasting) | |
| 12 | Polish: post-processing (bloom), performance, deploy | |
