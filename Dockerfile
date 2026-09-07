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

FROM caddy:2-builder-alpine AS caddy-build
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
