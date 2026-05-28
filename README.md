# F1 Brand Store

## Database & Auth setup

1. Create a Neon PostgreSQL database.
2. Copy the pooled connection string from Neon and set it as `DATABASE_URL`.
3. Copy `.env.example` to `.env` and fill:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - optional `DIRECT_DATABASE_URL`
   - optional `SEED_ADMIN_EMAIL`
   - optional `SEED_ADMIN_PASSWORD`
   - optional `ADMIN_EMAILS`
4. Install dependencies:

```bash
npm install
```

5. Generate Prisma Client:

```bash
npx prisma generate
```

6. Apply migrations:

```bash
npx prisma migrate dev
```

7. Seed demo catalog data and the admin account:

```bash
npm run db:seed
```

8. Start the app:

```bash
npm run dev
```

The seed creates neutral racing-inspired demo products and does not use official Formula 1, Ferrari, Mercedes, Red Bull or other team logos or official merchandise claims.

Default local seed admin credentials, unless overridden in `.env`:

```text
admin@example.com
Admin12345!
```
