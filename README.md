# LayoutDesk — Nuxt 3 + Supabase + PostGraphile

Clients submit graphic layout requests (Google sign-in, reference uploads). The studio owner manages everything from an admin dashboard. Data lives in **Supabase Postgres** with **Row Level Security**; **PostGraphile** runs **inside the Nuxt/Nitro server** on the same port (e.g. `3000`) at `POST /api/graphql`, using the same Supabase JWT as the rest of the app.

## Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project
- Docker is **not** required (optional `docker-compose.yml` exists only if you want a standalone PostGraphile process)

## 1. Supabase

1. Create a project and run the SQL in `supabase/migrations/20260410140000_init.sql` (SQL editor or Supabase CLI).
2. **Auth → Providers → Google**: enable and add OAuth client ID/secret from Google Cloud Console.
3. **Auth → URL configuration**: add redirect URLs:
   - `http://localhost:3000/confirm`
   - your production `https://your-domain/confirm`
4. **API**: copy **Project URL**, **anon public** key, and the **JWT signing secret** used to verify access tokens (in the dashboard this is often still labeled **JWT Secret** under *Legacy JWT secret* or *JWT Settings*). It is a long secret string — **not** the `service_role` key and **not** the `sb_secret_…` database API key (those are for REST/admin, not for verifying user session JWTs with PostGraphile).
5. **Database**: for **PostGraphile / `DATABASE_URL`**, use a string your machine can reach:
   - **Windows or “infinite loading” on `/my-requests`**: the **direct** host `db.<ref>.supabase.co` is often **IPv6-only**. If Node logs `ENOTFOUND` or GraphQL never returns, open the dashboard **Connect** button → choose **Session pooler** → copy the URI (user looks like `postgres.<project_ref>`, host like `aws-0-<region>.pooler.supabase.com`, port **5432**). Paste that as `DATABASE_URL`.
   - **Linux/macOS with working IPv6**: direct URI on port `5432` is fine.

## 2. PostGraphile (embedded)

PostGraphile is started **in-process** when the Nuxt server handles `POST /api/graphql`. It connects to your Supabase database with `DATABASE_URL` and verifies user JWTs with `SUPABASE_JWT_SECRET` (same rules as §1 — must be the real JWT signing secret).

No second terminal and no port `5000` are required for the app to work.

**Optional — standalone GraphiQL on port 5000** (debugging only):

```bash
npm run postgraphile
```

Then open `http://localhost:5000/graphiql`. Alternatively use **Docker Compose** (`docker compose up postgraphile`) if you prefer a container.

## 3. Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `DATABASE_URL` | Postgres URI for PostGraphile — use **Session pooler** from Connect if direct `db.*.supabase.co` fails (IPv4 / Windows) |
| `SUPABASE_JWT_SECRET` | JWT signing secret — required for PostGraphile (see §1) |
| `NUXT_DATABASE_URL` / `NUXT_SUPABASE_JWT_SECRET` | Optional overrides for the same values (e.g. on a host that only injects `NUXT_*` vars) |
| `NUXT_PUBLIC_SITE_URL` | Site origin for OAuth redirect (no trailing slash) |

## 4. Owner account

New Google users get `public.users.role = 'client'`. Promote the artist in SQL:

```sql
update public.users set role = 'owner' where email = 'you@example.com';
```

## 5. Run the app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. GraphQL is served at **`POST /api/graphql`** on the same port.

If GraphQL returns **503**, check `.env` has valid `DATABASE_URL` and `SUPABASE_JWT_SECRET`, and that the database is reachable from your machine.

### Troubleshooting

- **`getaddrinfo ENOTFOUND db.<ref>.supabase.co`** — The direct DB hostname is often **IPv6-only**; many Windows networks never resolve or reach it. **Fix:** Supabase Dashboard → **Connect** → **Session pooler** → copy the URI (user `postgres.<ref>`, host `aws-0-….pooler.supabase.com:5432`) into `DATABASE_URL`, restart `npm run dev`. See [Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).
- **`Invalid Refresh Token: Refresh Token Not Found`** — Usually stale data in the browser after rotating keys or switching projects. **Clear site data** for `localhost:3000` (or use DevTools → Application → Local storage → clear), then sign in again. The app also clears a broken local session on load when it detects this error.
- **Header shows “New request” / “My requests” while logged out** — Same as above: broken session left a user object without a valid access token. Clear storage or click **Sign out** if visible; after a refresh you should only see **Sign in** until OAuth completes.

## Routes

| Path | Who |
|------|-----|
| `/` | Public |
| `/login` | Google OAuth |
| `/confirm` | OAuth return |
| `/submit` | Clients only |
| `/my-requests` | Signed-in |
| `/dashboard` | Owner only |

## GraphQL (PostGraphile)

The app calls `POST /api/graphql` (Bearer token + Nitro handler). PostGraphile is mounted in `server/api/graphql.ts` / `server/utils/postgraphileSingleton.ts`. Query helpers live in `composables/useGraphql.ts`. For ad-hoc exploration, use optional `npm run postgraphile` and GraphiQL on port 5000, or introspect against `/api/graphql` with a valid access token.

## Stack

- Nuxt 3, Vue 3 Composition API, Tailwind CSS, `@nuxtjs/color-mode`, `@nuxtjs/supabase`, `@vueuse/nuxt`
- Supabase Auth (Google), Storage buckets `reference-images` and `layouts`
- PostGraphile 4 over Postgres

## Production build

```bash
npm run build
node .output/server/index.mjs
```

Set the same environment variables on the host (`DATABASE_URL`, `SUPABASE_JWT_SECRET`, etc.). Keep **`postgraphile` and `pg` installed** (they are normal `dependencies`) so the server can load them at runtime from `node_modules`. Run the process from the **project root** (or ensure `node_modules` is available on `NODE_PATH`) so those packages resolve. Ensure `NUXT_PUBLIC_SITE_URL` and Supabase redirect URLs match your deployment domain.
