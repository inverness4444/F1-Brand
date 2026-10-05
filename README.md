# F1 Brand Store

## Database & Auth setup

1. Create a PostgreSQL database on a provider with confirmed physical storage in Russia for customer data, including replicas and backups.
2. Set the application connection string as `DATABASE_URL`. A pooler can be used if the selected provider supports it.
3. Set the direct connection string as `DIRECT_DATABASE_URL` for Prisma Migrate. Both connections must refer to the approved Russian deployment.
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

- `DATABASE_URL` - PostgreSQL runtime URL for the app.
- `DIRECT_DATABASE_URL` - direct PostgreSQL URL for Prisma migrations. Prisma Migrate reads it from `directUrl`; application queries keep using the pooled `DATABASE_URL`.
- `PRISMA_CONNECTION_LIMIT` - optional Prisma runtime connection limit. Defaults to `5`, which avoids catalog read timeouts during parallel Next.js renders.
- `CATALOG_SOURCE` - optional public catalog source. Use `auto` by default, or `file` for the file-backed storefront. When PostgreSQL is configured, catalog saves also update products and variants in the order database, including in file mode. Without PostgreSQL, file mode is a storefront preview only.
- `NEXT_PUBLIC_SITE_URL` and `APP_URL` - public app origin, for example `https://velocityclub.ru`.
- `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` - real YooKassa credentials, only for server runtime.
- `YOOKASSA_RETURN_URL` - return URL, for example `https://velocityclub.ru/checkout/success`.
- `YOOKASSA_WEBHOOK_SECRET` - shared webhook secret. It is required in production; include it in the webhook URL as `?secret=...` or send it in `X-YooKassa-Webhook-Secret`/Bearer auth.
- `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN` - optional a verified Russian Redis REST backend for distributed rate limiting in production. `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are also supported.

Local commands:

If the storefront contains products missing from the order database, run `npm run catalog:sync` to review the missing IDs. `npm run catalog:sync -- --apply` creates and verifies a PostgreSQL backup, then imports only missing products and variants from `data/catalog-products.json`. Existing products, inventory, accounts, orders and payments are preserved. PostgreSQL tools (`pg_config`, `pg_dump`, `pg_restore`) are required for the apply step. The repair does not create orders or contact YooKassa.

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

- Create and migrate the verified Russian PostgreSQL database.
- Fill real YooKassa credentials in server env only.
- Configure YooKassa webhook URL as `/api/payments/yookassa/webhook?secret=...` on the public domain and set the same value in `YOOKASSA_WEBHOOK_SECRET`.
- Configure a verified Russian Redis REST env for shared production rate limits; without it the app falls back to per-process in-memory limits for local development.
- Configure `YOOKASSA_RETURN_URL` to the checkout success page.
- Verify online cash register and 54-FZ receipt settings before enabling `YOOKASSA_RECEIPT_ENABLED=true`.
- Provide VAT/tax settings through env/config: `YOOKASSA_VAT_CODE`, `YOOKASSA_TAX_SYSTEM_CODE`, `YOOKASSA_PAYMENT_SUBJECT`, `YOOKASSA_PAYMENT_MODE`.

Production checkout requires receipts to be enabled and the documented fiscal process to be verified. Automatic advance offsets, gift certificate advances and marked goods are currently blocked before money is debited; these scenarios require a suitable cash register integration. YooKassa fiscal receipts require correct online cash register settings, VAT/tax system code, payment subject/mode where applicable, and seller data.

The guaranteed delivery deadline is required for shipping orders in production. During `npm run dev`, checkout works without configured delivery days and saves a null deadline; it never invents a date. Payment provider selection remains unchanged: configured YooKassa credentials are used, otherwise development uses mock payments. Verify the local missing-deadline scenario with `npm run test:legal:integration -- --without-delivery-deadline`; the runner uses an isolated database and mock payments.


## Legal configuration and release

See [legal-release-checklist](docs/legal-release-checklist.md) before deployment. Run `npm run legal:check` after filling real configuration; the command does not file a Roskomnadzor notification, migrate hosting or certify goods. Register/newsletter collection and payments are guarded in production until the operator verifies infrastructure and mandatory details. Active products remain visible and purchasable without the new metadata fields; their missing documentation is listed in the internal checklist. The original homepage photo and GIF are preserved at the owner’s request. No legacy consent is inferred from registration/subscription dates.

Public seller and delivery values are compiled into the client bundle: **rebuild** after changing any `NEXT_PUBLIC_*` value and change `LEGAL_VERSION` when the displayed legal documents change. Apply pending migrations with `npm run db:migrate:deploy` before running this version against an existing database, then run `npm run db:generate`. This also applies to local development when it connects to an existing database: starting Next alone does not update its tables. The four 20261005 migrations add optional fields and preserve existing accounts and products. Do not seed production with demo identities or unverified products.
