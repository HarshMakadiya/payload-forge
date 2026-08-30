FROM node:22.13-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
RUN npm run build

FROM node:22.13-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
ARG APP
ENV PAYLOAD_FORGE_APP=${APP}
CMD ["sh", "-c", "npm run start --workspace @payload-forge/${PAYLOAD_FORGE_APP}"]

