FROM oven/bun:1.2.20 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .
RUN bun run --cwd packages/shared build
RUN bun run --cwd apps/web build

FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
