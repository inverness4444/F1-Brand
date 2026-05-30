# F1 Brand Store

## Database & Auth setup

1. Create a Neon PostgreSQL database.
2. Copy the pooled Neon connection string and set it as `DATABASE_URL`. The pooled host contains `-pooler` and is used by the Next.js runtime.
3. Copy the direct Neon connection string and set it as `DIRECT_DATABASE_URL`. The direct host does not contain `-pooler` and is used by Prisma Migrate through `directUrl` in `prisma/schema.prisma`.
4. Copy `.env.example` to `.env` and fill:
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - optional `SEED_ADMIN_EMAIL`
   - optional `SEED_ADMIN_PASSWORD`
5. Install dependencies:

```bash
npm install
```

6. Generate Prisma Client:

```bash
npx prisma generate
```

7. Apply migrations:

```bash
npx prisma migrate dev
```

8. Seed demo catalog data and the admin account:

```bash
npm run db:seed
```

9. Start the app:

```bash
npm run dev
```

The seed creates neutral racing-inspired demo products and does not use official Formula 1, Ferrari, Mercedes, Red Bull or other team logos or official merchandise claims.

Default local seed admin credentials, unless overridden in `.env`:

```text
admin@example.com
Admin12345!
```

Public registration always creates a regular user. Create the first admin through `npm run db:seed`; later role changes must go through the protected admin UI.

## YooKassa payments setup

The checkout backend is prepared for YooKassa, but local development uses mock payments while `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` are empty. Secrets are read only on the server.

Required env:

- `DATABASE_URL` - pooled Neon PostgreSQL URL for the app.
- `DIRECT_DATABASE_URL` - direct Neon URL for Prisma migrations. Prisma Migrate reads it from `directUrl`; application queries keep using the pooled `DATABASE_URL`.
- `NEXT_PUBLIC_SITE_URL` and `APP_URL` - public app origin, for example `http://localhost:3000`.
- `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` - real YooKassa credentials, only for server runtime.
- `YOOKASSA_RETURN_URL` - return URL, for example `https://example.com/checkout/success`.
- `YOOKASSA_WEBHOOK_SECRET` - shared webhook secret. It is required in production; include it in the webhook URL as `?secret=...` or send it in `X-YooKassa-Webhook-Secret`/Bearer auth.
- `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN` - optional Redis/Upstash REST backend for distributed rate limiting in production. `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are also supported.

Local commands:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
npm run build
```

Webhook endpoint:

```text
POST /api/payments/yookassa/webhook
```

For local mock mode, payment creation returns a local confirmation URL:

```text
/api/payments/yookassa/mock/confirm?paymentId=...
```

The mock confirmation endpoint is disabled in production unless `ENABLE_MOCK_PAYMENTS=true` is set intentionally.

Supported statuses:

- Order: `PENDING`, `AWAITING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`.
- Payment: `NOT_STARTED`, `PENDING`, `WAITING_FOR_CAPTURE`, `SUCCEEDED`, `CANCELED`, `REFUNDED`, `FAILED`.
- Fulfillment: `NOT_FULFILLED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `RETURNED`, `CANCELLED`.

For production launch:

- Create and migrate a Neon database.
- Fill real YooKassa credentials in server env only.
- Configure YooKassa webhook URL as `/api/payments/yookassa/webhook?secret=...` on the public domain and set the same value in `YOOKASSA_WEBHOOK_SECRET`.
- Configure Redis/Upstash REST env for shared production rate limits; without it the app falls back to per-process in-memory limits for local development.
- Configure `YOOKASSA_RETURN_URL` to the checkout success page.
- Verify online cash register and 54-FZ receipt settings before enabling `YOOKASSA_RECEIPT_ENABLED=true`.
- Provide VAT/tax settings through env/config: `YOOKASSA_VAT_CODE`, `YOOKASSA_TAX_SYSTEM_CODE`, `YOOKASSA_PAYMENT_SUBJECT`, `YOOKASSA_PAYMENT_MODE`.

Receipt support is intentionally prepared but disabled by default. YooKassa fiscal receipts require correct online cash register settings, VAT/tax system code, payment subject/mode where applicable, and seller data.
