# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# VITE_* env vars are baked at build-time; pass them via --build-arg.
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Single-page-app rewrite so client-side routes (/projects/:id, etc.)
# resolve to index.html instead of 404.
RUN printf 'server {\n\
  listen 5173;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5173
