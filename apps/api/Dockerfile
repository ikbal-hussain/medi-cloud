# Medi Cloud API. Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN npm ci --workspace @medi-cloud/api --include-workspace-root=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @medi-cloud/api

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/package.json /app/apps/api/prisma.config.ts ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/scripts ./apps/api/scripts
COPY --from=build /app/apps/api/src ./apps/api/src
WORKDIR /app/apps/api
USER node
EXPOSE 3000
# Apply any pending migrations, then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
