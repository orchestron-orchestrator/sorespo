FROM oven/bun:1.3.14 AS build

ENV PUBLIC_DEMO=0

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run check && bun run build

FROM node:24-bookworm-slim AS runtime

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/build ./build

USER node

EXPOSE 3000

CMD ["node", "build"]