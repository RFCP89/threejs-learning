# =============================================================
# Development image: Node + Vite, serving the project with hot reload.
# =============================================================

# Base image: official Node.js (LTS line) on Alpine Linux — a tiny distro (~50 MB).
FROM node:24-alpine

# All following commands run inside /app in the container.
WORKDIR /app

# The official image ships a non-root user "node" (uid 1000 — same as most Linux
# desktop users). Running as it means files the container creates in your project
# folder belong to YOU, not to root.
RUN chown node:node /app
USER node

# Copy ONLY the dependency lists first, then install.
# Docker caches each step ("layer"): as long as package*.json don't change,
# rebuilding skips the slow `npm ci` and reuses the cached node_modules.
COPY --chown=node:node package.json package-lock.json ./
# `npm ci` = clean install of the exact versions in package-lock.json.
RUN npm ci

# Now copy the rest of the source code.
# (In development, compose.yaml mounts your live folder over this anyway.)
COPY --chown=node:node . .

# Document the port Vite listens on.
EXPOSE 5173

# Start the dev server. Host/port settings live in vite.config.js.
CMD ["npm", "run", "dev"]
