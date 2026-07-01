FROM oven/bun:1.2.20 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .
RUN bun run --cwd packages/shared build
RUN bun run --cwd apps/api build

EXPOSE 3000
CMD ["bun", "apps/api/dist/index.js"]
