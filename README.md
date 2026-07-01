# USKO ALSAT

Knight Online (Zero) oyunculari icin sadece GB/Coin ile calisan, real-time pazar yeri ve acik artirma platformu.

## Teknoloji
- Backend: Bun + Elysia + WebSocket + Redis
- Database: PostgreSQL + Drizzle ORM
- Client: Vite + React + TypeScript + TanStack Query + Tailwind v4
- Runtime Env: development, production

## Monorepo
- apps/api
- apps/web
- packages/shared
- infra

## Gelistirme
1. Ornek ortam dosyasini kopyala:
   - `Copy-Item .env.development.example .env`
2. Local DB/Redis baslat:
   - `docker compose -f docker-compose.dev.yml up -d`
3. Bagimliliklari kur:
   - `bun install`
4. API baslat:
   - `bun run dev:api`
5. Web baslat:
   - `bun run dev:web`

## Notlar
- Platformda wallet, bakiye yukleme, POS ve odeme gecidi yoktur.
- Tum islemler oyun ici GB/Coin uzerinden alici-satici eslesmesi ile tamamlanir.
