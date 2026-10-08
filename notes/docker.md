# Docker — running the project in a container

## What changed (and what didn't)

The three.js code (`src/`, `index.html`) did **not** change at all. Docker only changes
*where* Node + Vite run: inside an isolated Linux box (a container) instead of on your machine.

New files:

| File | Purpose |
|---|---|
| `Dockerfile` | Recipe for the **image**: start from Node 24 on Alpine, `npm ci`, run `npm run dev`. |
| `compose.yaml` | How to **run** it: port mapping and volumes. One command: `docker compose up`. |
| `vite.config.js` | Tells Vite to listen on `0.0.0.0` so traffic from outside the container reaches it. |
| `.dockerignore` | Keeps `node_modules`, `dist`, `.git` out of the image build. |

## Key concepts

- **Image vs container**: the image is the recipe/snapshot (built once from the Dockerfile);
  a container is a running instance of it. Like a class vs an object.
- **Layers & cache**: each Dockerfile line is a cached layer. We copy `package*.json` and run
  `npm ci` *before* copying the code, so editing code never re-triggers the slow install.
- **Port mapping** `"5180:5173"`: `host:container`. Vite listens on 5173 inside; you open 5180.
  (5173 on this machine is already used by another project's container.)
- **Bind mount** `.:/app`: your project folder is shared live with the container → hot reload works.
- **Named volume** `node_modules:/app/node_modules`: the container keeps its own node_modules
  (installed for Linux inside the image), so the bind mount doesn't hide or clash with it.
- **`USER node`** (uid 1000 = you): files the container writes belong to you, not root.

## Everyday commands

```bash
docker compose up                 # start (Ctrl+C to stop); add -d to run in background
docker compose logs -f web        # follow Vite's output when running with -d
docker compose down               # stop + remove container
docker compose exec web sh        # open a shell inside the running container
```

## Adding an npm package (e.g. GSAP later)

Run npm **inside** the container, then rebuild so the image's node_modules includes it:

```bash
docker compose exec web npm install gsap   # updates package.json + lock on your disk
docker compose up -d --build               # rebuild image with the new dependency
```

If node_modules ever gets confused: `docker compose down -v` (the `-v` deletes the
node_modules volume) then `docker compose up --build`.
