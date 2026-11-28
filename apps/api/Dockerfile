# Medi Cloud API. Build from the repo root: docker build -f apps/api/Dockerfile .
#
# Two images:
#   runtime (the default): the API only. Plain Alpine with the Node binary, production dependencies and the
#     built bundle. No npm, compilers or dev tools.
#   tools (--target tools): the full toolchain, for migrations, demo data and the super admin. Its default
#     command applies pending migrations; docker compose runs it once before the API as the `migrate` service.

# Node's Alpine image and the runtime's Alpine must be the same release: the Node binary is copied across.
ARG ALPINE=3.24

FROM node:22-alpine${ALPINE} AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# Everything needed to build, migrate and seed. The runtime image copies the built API from here.
FROM manifests AS tools
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN npm ci --workspace @medi-cloud/api --include-workspace-root=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @medi-cloud/api
WORKDIR /app/apps/api
CMD ["npx", "prisma", "migrate", "deploy"]

# Production dependencies only.
# - No install scripts: the Prisma client and the shared package are already in the bundle.
# - npm counts the Prisma CLI and TypeScript as optional peers of @prisma/client: hence --omit=optional/peer.
# - Prisma ships query engines for five databases in two sizes (~66 MB); the API loads only PostgreSQL's fast
#   one. The Docker job in CI runs the image against PostgreSQL, so it fails if that ever changes.
# - Source maps of dependencies aren't needed at runtime.
FROM manifests AS prod-deps
RUN npm ci --omit=dev --omit=optional --omit=peer --workspace @medi-cloud/api --include-workspace-root=false \
    --ignore-scripts \
  && rm -rf node_modules/@medi-cloud \
  && mkdir -p apps/api/node_modules \
  && find node_modules/@prisma/client/runtime -name 'query_compiler_*' \
    ! -name 'query_compiler_fast_bg.postgresql.*' -delete \
  && find node_modules apps/api/node_modules -name '*.map' -delete

FROM alpine:${ALPINE} AS runtime
RUN apk add --no-cache libstdc++ \
  && addgroup -g 1000 node \
  && adduser -u 1000 -G node -s /bin/sh -D node
COPY --from=manifests /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY --from=tools /app/apps/api/package.json ./
COPY --from=tools /app/apps/api/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
