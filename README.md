# PixelArena — 1,000,000 Pixel USDT Marketplace

Production-ready full stack marketplace.
**1 Pixel = 1 USDT (ERC20)**
**Recipient Wallet:** `0x98598Caa0F0b67D32503DA73c3719C3514C12643`
**USDT Contract:** `0xdAC17F958D2ee523a2206206994597C13D831ec7` (Ethereum Mainnet)

RTL Persian • Dark Theme • Vanilla JS • Node.js + Express + MongoDB + Redis + Socket.IO

---

## Features (Production)

- 1,000,000 individually ownable pixels (1000x1000 canvas)
- USDT ERC20 on-chain verification, 12 confirmations
- Prevent double spending, duplicate tx rejection
- MetaMask / WalletConnect / Coinbase / Trust Wallet
- JWT access + refresh, 2FA, email verification, Google OAuth
- Image upload: Cloudinary, Sharp compression, WebP, 10MB max, moderation hooks
- Canvas: infinite smooth zoom, pan, touch, minimap, selection box, coordinate search
- Teams: Football, Basketball, F1, Esports, Celebrities + custom admin categories
- Marketplace: available / sold / trending / leaderboard
- User dashboard: owned pixels, transactions, analytics, image replace
- Admin panel: revenue, users, ban, refund, manual verification, backup/restore, logs
- Security: Helmet, CSP, rate-limit, CSRF, XSS, mongo-sanitize, bcrypt-12, audit logs
- Performance: Redis caching, virtual canvas rendering, CDN ready, compression
- PWA, offline mode, push notifications, SEO structured data
- Docker / Docker Compose / Nginx / PM2 / GitHub Actions CI ready

---

## Quick Start

```bash
git clone <repo>
cd pixelarena/backend
cp .env.example .env
# edit MONGO, REDIS, ETH_RPC_URL, CLOUDINARY, SMTP, JWT_SECRET
npm install
npm run seed   # creates 1,000,000 pixels ~3min
npm run dev
# API http://localhost:4000
# Frontend: open frontend/index.html or serve frontend/public
```

### Docker Production

```bash
docker-compose up -d --build
# nginx → https://pixelarena.com
# api → http://api:4000
# mongo + redis included
```

---

## API (v1)

- `POST /api/v1/auth/register` /login /wallet-login /refresh /logout
- `GET  /api/v1/pixels?x1=0&y1=0&x2=99&y2=99&team=football`
- `GET  /api/v1/pixels/:x/:y`
- `PATCH /api/v1/pixels/:x/:y` (owner: title, description, link)
- `POST /api/v1/payment/verify` {txHash, pixels:[{x,y}], wallet}
- `GET  /api/v1/payment/status/:txHash`
- `POST /api/v1/upload/pixel/:x/:y` multipart image
- `GET  /api/v1/stats` /pixels/stats/map /pixels/leaderboard
- Admin: `/api/v1/admin/dashboard`, `/users`, `/transactions`

Full docs: `docs/API_DOCUMENTATION.md`

---

## Blockchain Payment Flow

1. User selects pixels in canvas → frontend calculates `count * 1 USDT`
2. User sends USDT ERC20 `transfer(recipient, amount)` via MetaMask
3. Frontend posts `txHash + pixel coordinates` to `/api/v1/payment/verify`
4. Backend:
   - Check tx not already processed
   - Verify pixels are unsold (transactional lock)
   - `ethers.js` verify Transfer event → to = `0x98598…2643`, amount >= pixels
   - Wait confirmations (12), store txHash, blockNumber
   - Atomic bulkWrite assigns ownership + history
   - Socket.IO emits `pixel:sold` globally
5. Pixels permanently owned. Image/link editable by owner.

No mock payments. 100% on-chain.

---

## Project Structure

```
pixelarena/
├── frontend/
│   ├── index.html          # RTL Persian SPA, 1200+ lines production canvas
│   ├── public/
│   ├── src/css/
│   └── src/js/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/ (db, redis, socket)
│   │   ├── models/ User, Pixel, Transaction, Category, Notification
│   │   ├── controllers/ auth, pixel, payment, admin
│   │   ├── routes/
│   │   ├── middleware/ auth, rateLimiter, errorHandler
│   │   ├── services/ blockchain, email, cron
│   │   └── utils/ logger
│   └── package.json
├── docker-compose.yml
├── nginx/
├── docs/
└── scripts/
```

---

## Environment

See `backend/.env.example` – all production keys documented.

Required for launch:
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `ETH_RPC_URL` (Infura/Alchemy)
- `CLOUDINARY_*`
- `SMTP_*`

---

## Deployment

- `docker-compose.yml` → api, mongo, redis, nginx
- `nginx/pixelarena.conf` → SSL, gzip, rate limit, proxy
- `ecosystem.config.js` → PM2 cluster mode
- `.github/workflows/deploy.yml` → CI/CD
- Daily Mongo backup cron → S3

See `docs/DEPLOYMENT.md`

---

## Security & Compliance

- bcrypt 12, JWT 15m + refresh 7d rotation
- Helmet CSP, HPP, XSS-clean, mongo-sanitize
- Rate limit: 300/15m API, 20/15m auth, 10/min payment
- 2FA TOTP, email verification, audit logs
- Input validation express-validator, output escaping
- IP blocking, brute force lock (5 attempts → 30min)

---

## License

Proprietary – PixelArena © 2026
