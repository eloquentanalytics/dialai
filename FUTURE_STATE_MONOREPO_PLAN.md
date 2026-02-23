# DIALAI Future State Monorepo Plan

## Strategic Split: Open Core + Proprietary Apps

### The Rule

Open what creates adoption. Close what captures revenue.

The `dialai` npm package is the open-source core that developers evaluate, trust, and build on. The commercial applications (Jury, Cost Crusher, Writing Room, etc.) are proprietary products built on top. The algorithm is auditable; the products are the moat.

---

## Licensing

| Layer | License | Rationale |
|---|---|---|
| `packages/core/` (dialai npm) | MIT | Developers need permissive license to adopt. BUSL on a library creates legal uncertainty and chills adoption. |
| `packages/db/` (@dialai/db) | MIT | Drives adoption. The moat is the hosted service, not the schema. |
| `packages/server/` (@dialai/server) | BUSL-1.1 | Hosted service infrastructure. Prevents trivial "DIAL Cloud" competitors. |
| `packages/ui/` (@dialai/ui) | BUSL-1.1 | Commercial dashboard components. |
| `apps/*` | Proprietary (closed) | The products. Never published. |
| Collected exemplar data | Proprietary | Human training decisions. Gets more valuable over time. |

### BUSL Additional Use Grant (for server/ui)

> "Additional Use Grant: You may make production use of the Licensed Work for any purpose, provided that you do not offer the Licensed Work as a hosted or managed service that substitutes for a commercial offering of Eloquent Analytics Ltd."

---

## Monorepo Structure

npm workspaces + turborepo. All packages are equal peers under `packages/`. No single package dominates the root.

```
dialai/
├── package.json                  # workspace root (private)
├── turbo.json                    # build orchestration + caching
├── tsconfig.base.json            # shared TS config
│
├── packages/
│   ├── core/                     # "dialai" — MIT, published to npm
│   │   ├── package.json
│   │   ├── LICENSE               # MIT
│   │   └── src/
│   │       ├── index.ts          # barrel export
│   │       ├── types.ts          # all interfaces (the protocol)
│   │       ├── api.ts            # core decision-cycle API
│   │       ├── engine.ts         # tick(), runSession(), selectChampion()
│   │       ├── alignment.ts      # wilsonLowerBound, updateAlignment
│   │       ├── strategies.ts     # aheadByK, firstProposal, random, weighted
│   │       ├── exemplars.ts      # createExemplar, getExemplars
│   │       ├── evaluation.ts     # alignment/accuracy computation
│   │       ├── monitoring.ts     # collapse metrics + signals (pure functions)
│   │       ├── llm.ts            # OpenAI-compatible LLM calls + webhooks
│   │       ├── mcp.ts            # MCP server (stdio)
│   │       ├── cli.ts            # dialai CLI
│   │       ├── config.ts         # env var resolution
│   │       ├── utils.ts          # UUID, validation, machine loading
│   │       ├── store.ts          # Store interface + getStore/setStore
│   │       ├── store-memory.ts   # in-memory store (default)
│   │       └── proxy-client.ts   # remote proxy
│   │
│   ├── db/                       # "@dialai/db" — MIT, published to npm
│   │   ├── package.json          # depends on "dialai"
│   │   ├── LICENSE               # MIT
│   │   └── src/
│   │       ├── index.ts          # exports createPostgresStore, runMigrations
│   │       ├── store-postgres.ts # Postgres Store implementation
│   │       ├── connection.ts     # shared Kysely connection pool
│   │       └── migrations/
│   │           ├── migrate.ts
│   │           ├── 001-initial-schema.ts
│   │           └── 002-users-credits.ts
│   │
│   ├── server/                   # "@dialai/server" — BUSL-1.1
│   │   ├── package.json          # depends on "dialai", "@dialai/db"
│   │   ├── LICENSE               # BUSL-1.1
│   │   └── src/
│   │       ├── index.ts          # entry: wire DB, load machines, start HTTP+WS
│   │       ├── routes.ts         # REST API
│   │       ├── ws.ts             # WebSocket server
│   │       ├── tick-loop.ts      # tick engine loop
│   │       ├── machine-loader.ts # discovers machines from apps/*/machines/
│   │       ├── visitors.ts       # visitor specialist store
│   │       ├── auth.ts           # Clerk JWT verification
│   │       ├── credits.ts        # credit balance check + deduction
│   │       └── stripe.ts         # Stripe checkout + webhooks
│   │
│   └── ui/                       # "@dialai/ui" — BUSL-1.1
│       ├── package.json          # depends on "dialai", react
│       ├── LICENSE               # BUSL-1.1
│       └── src/
│           ├── index.ts
│           ├── hooks/
│           │   ├── useSession.ts
│           │   └── useVisitor.ts
│           └── components/
│               ├── SessionHeader.tsx
│               ├── CollapseGauge.tsx
│               ├── ProposalList.tsx
│               ├── HistoryTimeline.tsx
│               ├── TransitionPanel.tsx
│               ├── SpecialistRoster.tsx
│               ├── TickCountdown.tsx
│               ├── VisitorRegistration.tsx
│               ├── CreditBalance.tsx
│               └── AuthGuard.tsx
│
├── apps/                         # PROPRIETARY — never published
│   ├── _template/                # scaffold for new apps (copy to create)
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── Dockerfile
│   │   ├── machines/
│   │   │   ├── _template.ts
│   │   │   └── _config.ts       # credit costs per action
│   │   ├── screens/
│   │   │   ├── index.ts
│   │   │   └── DefaultScreen.tsx
│   │   └── app/
│   │       ├── main.tsx          # ClerkProvider + createRoot
│   │       ├── App.tsx           # router + layout
│   │       └── pages/
│   │           ├── Landing.tsx
│   │           ├── Dashboard.tsx
│   │           └── Session.tsx
│   │
│   ├── demo/                     # existing hanoi/river-crossing (public example)
│   ├── jury/                     # consensus-verified answers
│   ├── cost-crusher/             # LLM cost optimization proxy
│   ├── writing-room/             # multi-LLM writing with voice learning
│   └── ...                       # future apps from TOP_DIAL_APPS.md
│
├── website/                      # Docusaurus docs (unchanged)
│
├── Dockerfile.server             # backend deployment
└── railway.toml                  # backend Railway config
```

### Dependency Graph

```
apps/demo ──┐
apps/jury ──┤──► @dialai/ui ──► dialai (core)
apps/... ───┘       │               ▲
                    │               │
            @dialai/server ─────────┤
                │                   │
                └──► @dialai/db ────┘
```

---

## Credits & Payments (Stripe)

Users buy credits upfront via Stripe Checkout, consume by using services.

### Database Schema (in packages/db, migration 002)

```sql
CREATE TABLE users (
  id                 TEXT PRIMARY KEY,      -- Clerk user ID
  email              TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_balances (
  user_id    TEXT PRIMARY KEY REFERENCES users(id),
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_transactions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  amount            INTEGER NOT NULL,       -- positive = purchase, negative = usage
  type              TEXT NOT NULL,           -- 'purchase' | 'usage' | 'bonus'
  description       TEXT,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### Credit Packs

- 50 credits — $5
- 200 credits — $15
- 500 credits — $30

### Per-App Credit Costs (configurable via machines/_config.ts)

Each app defines what actions cost. Example for Jury:
- Create session: 0 credits
- Submit query: 1 credit
- Per model response: 2 credits
- Total for a 3-model Jury query: 1 + (3 × 2) = 7 credits

### Deduction (atomic SQL)

```sql
UPDATE credit_balances
SET balance = balance - $cost, updated_at = now()
WHERE user_id = $userId AND balance >= $cost
RETURNING balance;
```

If 0 rows affected → `402 Payment Required`.

---

## Auth (Clerk)

- Free for 10K MAU
- Shared Clerk application across all DIAL apps (one user pool, one credit balance)
- Backend: `@clerk/backend` for JWT verification
- Frontend: `@clerk/clerk-react` for sign-in/up components
- Env vars: `CLERK_SECRET_KEY` (backend), `VITE_CLERK_KEY` (frontend)

---

## Railway Deployment

```
┌─────────────────────────────────────────┐
│           Railway Project               │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  dial-db     │  │  dial-api       │  │
│  │  (Postgres)  │◄─│  (backend)      │  │
│  │  managed     │  │  PORT=3001      │  │
│  └─────────────┘  │  Dockerfile.server│  │
│                    └────────┬────────┘  │
│                             │ CORS      │
│           ┌─────────────────┼──────┐    │
│           ▼                 ▼      ▼    │
│  ┌──────────────┐ ┌──────────┐ ┌─────┐ │
│  │ app-demo     │ │ app-jury │ │ ... │ │
│  │ (static)     │ │ (static) │ │     │ │
│  └──────────────┘ └──────────┘ └─────┘ │
└─────────────────────────────────────────┘
```

- **dial-api**: `DATABASE_URL`, `OPENROUTER_API_TOKEN`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Each app**: `VITE_API_URL`, `VITE_CLERK_KEY`
- Estimated cost: ~$25-35/mo for backend + DB + 5 static frontends

---

## New App Creation Process

```
1.  cp -r apps/_template apps/my-app
2.  Edit package.json → name: "@dialai/app-my-app"
3.  Edit machines/my-app.ts → define state machine + strategies
4.  Edit machines/_config.ts → set credit costs per action
5.  Edit screens/MyAppScreen.tsx → build custom UI
6.  Edit screens/index.ts → register in screen registry
7.  Edit app/pages/Landing.tsx → marketing copy
8.  npm install
9.  npm run dev --filter=@dialai/app-my-app
10. Test locally
11. Add Railway service, git push → auto-deploys
```

---

## Migration Path (current → future state)

### Phase 1: Restructure (no new features)
1. Create `packages/core/` — move `src/dialai/*` (except store-postgres, migrations)
2. Create `packages/db/` — move `store-postgres.ts` + `migrations/`
3. Create `packages/server/` — extract `examples/server/*`
4. Create `packages/ui/` — extract `examples/app/components/*` + `hooks/*`
5. Move `examples/` → `apps/demo/`
6. Add workspace config, turbo.json, tsconfig.base.json
7. Update all imports, verify build + tests pass

### Phase 2: Auth + credits + Stripe
1. Add auth.ts, credits.ts, stripe.ts to packages/server/
2. Add 002-users-credits migration to packages/db/
3. Add CreditBalance + AuthGuard components to packages/ui/
4. Wire middleware into server routes
5. Set up Stripe products, Clerk application

### Phase 3: Template + first new app
1. Create apps/_template/ scaffold
2. Build apps/jury/ as first app
3. Verify full flow: sign up → buy credits → use app → credits deducted

### Phase 4: Railway deployment
1. Dockerfiles for server + each app
2. Railway services: dial-db, dial-api, app-demo, app-jury
3. Env vars, health checks, custom domains

### Phase 5: Open source release
1. Switch packages/core/ and packages/db/ to MIT license
2. Set up packages/server/ and packages/ui/ with BUSL-1.1
3. Ensure apps/ are excluded from public repo (private or ee/ directory)
4. Publish dialai and @dialai/db to npm

---

## Lessons from Industry (for reference)

- **GitLab**: Open what individual devs need. Close what managers pay for (SSO, compliance).
- **PostHog**: Never cripple the core. Revenue from scale + enterprise controls.
- **Sentry**: Client SDKs always MIT. Server/hosted infra uses restrictive license.
- **Redis**: Open the primitive. Close the modules. Never change the core license.
- **HashiCorp**: BUSL works when nobody is competing with you yet. Fork risk comes later.

**The #1 mistake**: BUSL on a library. Switch to MIT before widespread adoption.
**The #2 mistake**: Changing the license on code people already depend on.
**The moat**: Not the algorithm (it's auditable). It's the applications, exemplar training data, and hosted service.
