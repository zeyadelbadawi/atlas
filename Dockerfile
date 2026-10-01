# Atlas frontend — production image.
#
# Phase 7. Three stages: build the static SPA (Vite — no Node server
# needed in production, confirmed by the Phase 7 readiness audit), build a
# custom Caddy binary with the Cloudflare DNS plugin (needed for DNS-01
# wildcard certificate issuance against *.atlass.dpdns.org — HTTP-01 can't
# validate a wildcard), then assemble a minimal runtime image: Caddy
# serving the built static assets directly and reverse-proxying /api/* to
# the backend container. One container does both jobs (per the confirmed
# Phase 7 decision: let the reverse proxy serve the SPA, no separate Node
# server).

FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Phase 8 — the public Academy website's server renderer
# (Reports/SSR_ARCHITECTURE_ANALYSIS.md): the same build, plus the SSR
# bundle, run by Node on the internal network only. Caddy (below) stays
# the edge and serves the single-page app whenever this is off, slow,
# failing or stopped. Built with `--target ssr`; the default target is
# still the Caddy image below.
FROM build AS ssr-build
RUN pnpm run build:ssr

FROM node:20-alpine AS ssr-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Runtime packages only (the SSR bundle imports React, the router, i18n
# and the other app dependencies from node_modules). No lifecycle
# scripts: nothing the renderer loads needs a build step.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:20-alpine AS ssr
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=ssr-deps /app/node_modules ./node_modules
COPY --from=ssr-build /app/dist ./dist
COPY --from=ssr-build /app/dist-ssr ./dist-ssr
COPY server/ssr/handler.mjs server/ssr/server.mjs ./server/ssr/
USER node
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/__ssr/health || exit 1
CMD ["node", "server/ssr/server.mjs"]

FROM caddy:2-builder-alpine AS caddy-build
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
