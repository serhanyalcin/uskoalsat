# Backlog ve Sprint Taslagi

## Sprint 0 - Foundation
1. Repo monorepo setup, env ve docker compose
2. API/Web baseline CI + quality gates
3. Domain modelleri ve drizzle migration altyapisi

## Sprint 1 - Auth ve Uye Yasami
1. Register/Login/Refresh/Revoke (JWT)
2. Aktivasyon, sifre sifirlama, oturum yonetimi
3. RBAC ve route guards

## Sprint 2 - Canli Market
1. Listing CRUD + filtreleme + cursor pagination
2. Bid akisi + websocket + redis pub/sub
3. Anti-snipe (son 10 saniye +30s)

## Sprint 3 - Merchant ve Trade Room
1. Merchant inventory dashboard
2. Buy-now ve otomatik eslesme
3. Trade odasi + islem kodu (#TRD-xxxx)

## Sprint 4 - Guven ve Moderasyon
1. Dispute acma ve kanit upload
2. Strike politikasi ve otomatik ban
3. Admin moderation paneli

## Sprint 5 - Price Feed ve Bildirim
1. Price history aggregate + grafik endpointleri
2. In-app realtime bildirim merkezi
3. Mobil PWA takip akisi iyilestirmeleri

## Sprint 6 - Hardening
1. Rate limit, audit log, security hardening
2. Performans ve load testleri
3. Production release checklist
