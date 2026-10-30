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
#
# Base images are pulled through mirror.gcr.io, Google's public pull-through
# cache of Docker Hub's official images (same content and digests). The
# deploy runner pulls anonymously, and Docker Hub's anonymous rate limit on
# shared GitHub runner IPs failed two deploys in a row with 429.
#
# B0-OPS-12 — every base image is pinned to the multi-arch index digest its
# tag resolved to when it was pinned (amd64 and arm64 builds both resolve
# through it), so every build pulls the same bytes. The tags stay for
# readability; Dependabot (.github/dependabot.yml) proposes digest updates
# as reviewable PRs, and src/ci-supply-chain-pins.test.ts fails CI if a
# FROM loses its digest.

# The build runs on the build host's own architecture (like the Caddy
# compile below): its output — HTML, CSS, JS bundles, images — is the same
# for every platform. Under QEMU emulation, `pnpm install` crashed node
# with an illegal instruction and hung the deploy until its timeout
# whenever package.json changed (the cached layer had hidden it).
FROM --platform=$BUILDPLATFORM mirror.gcr.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
# Stale-tab recovery — this build's own chunk list, named by its build time.
# Later deploys keep a previous build's chunks while its list is under 14
# days old (see the deploy workflow's "Carry the previous builds' assets").
RUN ls dist/assets > "dist/assets/.build-$(date +%s).list"
# B1 (DL-50) — the static marketing site (`dist/marketing/`, written by
# `pnpm build`; its hashed CSS/JS stay in dist/assets) and its public images
# (`/marketing-assets/`) move to their own tree, served by Caddy from
# /srv-marketing on the platform apex ONLY. Keeping them out of /srv means an
# academy subdomain or connected domain can never be served a marketing
# page, llms.txt, pricing.md or a marketing image (its `try_files` only
# sees /srv). The build above fetched the live plans catalog: it fails
# rather than ship the snapshot (MARKETING_PLANS_ALLOW_SNAPSHOT is never set
# here).
RUN mkdir -p dist-marketing \
 && if [ -d dist/marketing ]; then cp -R dist/marketing/. dist-marketing/ && rm -rf dist/marketing; fi \
 && if [ -d dist/marketing-assets ]; then mv dist/marketing-assets dist-marketing/marketing-assets; fi
# DL-57 — the help center (`dist/docs/`, written by `pnpm build`: pages,
# its own hashed assets, screenshots, search indexes) moves to /srv-docs,
# served by Caddy on docs.<base> ONLY. It is never under /srv, so an academy
# host can never be served a help page, and the docs host serves nothing
# from the app.
RUN mkdir -p dist-docs \
 && if [ -d dist/docs ]; then cp -R dist/docs/. dist-docs/ && rm -rf dist/docs; fi

# Phase 8 — the public Academy website's server renderer
# (Reports/SSR_ARCHITECTURE_ANALYSIS.md): the same build, plus the SSR
# bundle, run by Node on the internal network only. Caddy (below) stays
# the edge and serves the single-page app whenever this is off, slow,
# failing or stopped. Built with `--target ssr`; the default target is
# still the Caddy image below.
FROM build AS ssr-build
RUN pnpm run build:ssr

FROM --platform=$BUILDPLATFORM mirror.gcr.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS ssr-deps
ARG TARGETARCH
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Runtime packages only (the SSR bundle imports React, the router, i18n
# and the other app dependencies from node_modules). No lifecycle
# scripts: nothing the renderer loads needs a build step. Installed
# natively, but any platform-specific package is chosen for the image's
# own platform (linux, musl, TARGETARCH), never the build host's.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts \
      --os=linux --libc=musl --cpu="$(case "$TARGETARCH" in amd64) echo x64 ;; *) echo "$TARGETARCH" ;; esac)"

FROM mirror.gcr.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS ssr
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=ssr-deps /app/node_modules ./node_modules
COPY --from=ssr-build /app/dist ./dist
COPY --from=ssr-build /app/dist-ssr ./dist-ssr
# B3 — the marketing blog is rendered here at request time with the
# marketing prerender bundle and its build context (blog-context.json,
# written by scripts/marketing/prerender.mjs in the build stage), so its
# pages share this build's hashed stylesheet, scripts, header and footer.
COPY --from=ssr-build /app/dist-marketing-ssr ./dist-marketing-ssr
COPY server/ssr/handler.mjs server/ssr/server.mjs server/ssr/blog.mjs ./server/ssr/
USER node
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/__ssr/health || exit 1
CMD ["node", "server/ssr/server.mjs"]

# Cross-compiled on the build host's own architecture: Go builds a static
# linux/arm64 Caddy natively in about a minute, where compiling it under
# QEMU emulation took close to an hour.
FROM --platform=$BUILDPLATFORM mirror.gcr.io/library/caddy:2-builder-alpine@sha256:d6161a2c82fd58b3205048958fb6246d0c5d892beee8a47e90944610c4efd100 AS caddy-build
ARG TARGETOS
ARG TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=0 \
    xcaddy build --with github.com/caddy-dns/cloudflare

FROM mirror.gcr.io/library/caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
# Stale-tab recovery — the previous builds' hashed chunks, carried forward
# by the deploy workflow (each build's for 14 days), so a tab opened before this
# deploy can still load the routes it has not visited yet. The current
# build is copied over them, so its files always win. Empty (just
# `.gitkeep`) for a local build.
COPY previous-assets/ /srv/assets/
COPY --from=build /app/dist /srv
COPY --from=build /app/dist-marketing /srv-marketing
COPY --from=build /app/dist-docs /srv-docs
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
