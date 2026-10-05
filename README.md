# ResumeForge

A full-stack resume and career workspace built with React, TypeScript, Express, Drizzle ORM, and PostgreSQL. The resume editor renders structured data through twenty interchangeable templates; the same React document renderer produces downloadable PDFs through Chromium.

## Run locally

Requires Node.js 24. On this Windows machine, PDF export uses the installed Microsoft Edge browser automatically.

```powershell
cd "C:\Users\PRANAV\Documents\PROJECTS DEVOPS\ASTRA PROJECT\resumeforge"
npm.cmd ci
npm.cmd run setup
npm.cmd run db:seed
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. The development API runs on port 4000. The frontend reloads as you edit; restart `npm run dev` after backend changes.

The optional development seed creates:

- Email: `pranav@example.com`
- Password: `ResumeForge!2026`

The seed is idempotent and refuses to run in production. Production registration starts with an empty workspace. Application data is persisted in `.data/postgres` using PGlite (embedded PostgreSQL) when `DATABASE_URL` is absent. Run only one API process against that directory. Tests use separate in-memory databases or temporary accounts.

## Product capabilities

- Email/password registration, login/logout, verification, one-use password reset links, active sessions, password changes, account deletion, and optional Google OAuth.
- Dashboard, searchable resume library, duplicate/rename/archive/restore/delete, and version snapshots.
- Live three-panel editor with 13 optional content sections, structured repeated entries, drag ordering and keyboard reorder buttons, visibility controls, bold/bullet summary editing, and autosave with optimistic concurrency checks.
- Twenty templates sharing the same data, six self-hosted font families, colors, margins, spacing, columns, photo/contact/date visibility, A4 and Letter output.
- Server-generated PDFs with embedded fonts, selectable text, links, and page-break rules. Browser and PDF output share the renderer and stylesheet.
- Resume quality checks, PDF/DOCX text analysis, job keyword matching, editable AI suggestions with explicit acceptance, cover-letter editing/export, and interview practice/progress.
- Public, private, and password-protected portfolios; revocable links; download controls; privacy-conscious analytics.
- Profile reuse, light/dark/system appearance, configurable accent, notification preferences, responsive tablet layout and mobile editor/preview tabs.

## Integrations and honest boundaries

The core editor, database, authentication, heuristic analysis, keyword matcher, manually written cover letters, interview coaching prompts, portfolio, analytics, and PDF export run locally. These additional services require configuration:

| Capability | Required configuration | Behavior without it |
| --- | --- | --- |
| AI rewrite, cover letters, tailored interview guidance | `AI_API_KEY`, optional `AI_BASE_URL` and `AI_MODEL` | Returns a clear unavailable message; never fabricates a successful AI result or overwrites source content |
| Delivered verification/reset emails | SMTP variables | Development returns an explicit local email link; production never returns verification/reset tokens |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; callback `${APP_URL}/api/auth/google/callback` | Google button is not shown |
| Profile photo uploads | S3-compatible endpoint, bucket, and credentials | Upload explains how to configure storage; other resume features continue to work |
| Daily expiry and analytics cleanup | Redis plus worker (or built-in local cleanup) | Local API runs the same cleanup without Redis |

Set `CHROMIUM_PATH` on Linux/macOS or if Edge is installed elsewhere. The Docker backend includes Chromium. Real AI provider calls, SMTP delivery, Google OAuth, and S3 storage require integration credentials and have **not** been live-verified in this workspace. The AI request/response contract is tested with a local provider fixture.

The ATS score is a transparent rule-based writing/structure checklist, **not** an ATS-vendor score, hiring probability, or interview guarantee. Job matching uses a curated technology/skill dictionary and aliases; it does not claim semantic hiring suitability. Imported PDFs/DOCX are processed in memory and analyzed from extracted text. Scanned PDFs need OCR before upload; imports do not perfectly reconstruct visual layouts or automatically populate every structured resume field. Original documents are not retained. Profile images are stored only in object storage.

Optional 2FA and paid billing are not implemented. Subscription records exist as an extension point. Marketing email preferences are saved, but there is no marketing campaign delivery service. Personal account email is currently read-only; contact email in the reusable profile can be changed.

## Architecture

```text
src/
  components/        Shared controls, shell, document preview, editor panels
  pages/             Landing, auth, workspace and career tools
  lib/               API client, session state, preferences, notifications
shared/
  resume.ts          Validated resume model, template catalog, field metadata
  ResumeDocument.tsx Shared safe document renderer
  resume.css         Browser and PDF document styles
  analysis.ts        Deterministic analysis and keyword matching
  demo.ts            Development-only seed factory; also used by test fixtures
server/
  routes/            Auth, resume, career, account and public resource routers
  schema.ts          Drizzle tables, relationships and indexes
  migrations/        Idempotent PostgreSQL schema; serialized with advisory lock
  security.ts        Scrypt passwords, hashed sessions, CSRF origin/header checks
  services.tsx       PDF, mail, object storage and AI adapters
  worker.ts          Redis/BullMQ retention and expiry maintenance
tests/               Business rules, API lifecycle, provider contract, browser flows
infra/               Nginx and Kubernetes manifests
```

Resume metadata, section order, repeated entries, and versions are separate related records. Each section entity has a typed JSON field payload for flexible fields without adding nullable columns for every optional property. Resume snapshots intentionally preserve the complete document for restoration. Owner foreign keys and indexes cover user resources. Sections and entries are replaced transactionally; revision checks prevent stale writes from overwriting newer work.

The backend uses `pg` and Drizzle against PostgreSQL when `DATABASE_URL` is set. Production refuses to use the development database or an absent/short session secret. The SPA talks to the same-origin `/api` proxy, so API keys never enter client bundles.

## Security and privacy

- Passwords use salted scrypt; random session and reset tokens are stored only as hashes.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production. Local Compose HTTP can explicitly opt out **only** when `APP_URL` is localhost/127.0.0.1.
- Ownership is checked for individual reads, writes, exports, duplication, versions, letters, questions, and portfolio updates. Image references must belong to the same owner.
- Hidden resume content is removed from public JSON. Private and password-protected pages enforce access on both data and download endpoints.
- Public HTML is rendered by React, with validated URLs and constrained style values. Chromium PDF generation blocks network requests and only loads embedded fonts/images.
- Zod validation, upload limits, MIME/extension/signature checks, DOCX expanded-size checks, security headers, explicit origin/header CSRF validation, endpoint rate limits, and bounded simultaneous PDF exports are included.
- Rate limits currently use process-local counters. Configure a shared limiter or ingress rate limiting when scaling across replicas.
- View events use a first-party random visitor cookie hashed per portfolio, hostname-only referrers, and broad device categories. No raw IP or location storage. Do Not Track is respected. Events are retained for 90 days by maintenance cleanup.
- Account deletion requires the current password and an explicit `DELETE` confirmation and removes database resources and uploaded profile images.

## Docker Compose

For Ubuntu with a public domain, use the separate `compose.production.yml` and follow [the Ubuntu deployment guide](docs/UBUNTU_DEPLOYMENT.md). This profile uses Caddy for HTTPS, real SMTP settings, and private database/storage services. Copy `.env.production.example` to `.env.production`; the development instructions below are for local HTTP testing.

Docker is **not installed in the current workspace host**, so the Compose stack has not been executed here. The local Node build and embedded PostgreSQL path were exercised.

For a fresh checkout with Docker installed:

```sh
npm run setup:compose
docker compose up --build -d
```

If `.env` already exists, setup preserves it. Set `APP_URL=http://localhost:8080`, `ALLOW_INSECURE_LOCAL_COOKIES=true`, and provide independent random `POSTGRES_PASSWORD`, `SESSION_SECRET`, `STORAGE_ACCESS_KEY`, and `STORAGE_SECRET_KEY` values before starting Compose. Never reuse the development login or local secrets in production.

Services: Nginx frontend, Node backend, PostgreSQL, Redis, BullMQ worker, MinIO, bucket initialization, and Mailpit. Only the frontend, local-only object storage console, and local-only mail viewer are exposed. PostgreSQL and Redis stay on the internal network.

- Application: `http://localhost:8080`
- Local email inbox: `http://localhost:8025`
- Local storage console: `http://localhost:9001`

For production use HTTPS, set `ALLOW_INSECURE_LOCAL_COOKIES=false`, configure a real mail provider and object storage, restrict infrastructure access, and back up PostgreSQL/object storage. The mail catcher and local MinIO settings are development conveniences.

## Kubernetes and CI

`infra/k8s` contains frontend/API/worker Deployments, Services, ConfigMap, a nonsecret Secret template, TLS Ingress, and HPAs. Supply managed PostgreSQL, Redis, S3, SMTP, the runtime Secret and TLS Secret; replace example domain/image values. The Secret example is intentionally excluded from Kustomize. Kubernetes is not needed for local development.

```sh
kubectl apply -k infra/k8s
```

Do not run this until the placeholders and infrastructure have been configured. No cluster deployment has been attempted.

The GitHub Actions workflow runs install, lint, type checking, unit/integration tests, frontend/backend builds, and browser tests. On a push to `main`, it builds both Docker targets and pushes immutable commit-tagged images to GHCR using GitHub's repository token. Build and deployment configuration are uploaded as artifacts. Automatic production rollout is intentionally left to the deployment environment; this repository contains no cluster credentials.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Browser tests cover the landing page, sign-in, dashboard, resume creation, live text updates, experience add/delete, section ordering, template/font/color changes, save/reload, PDF downloads, analysis/matching, letters, interview progress, portfolio publish/private behavior, mobile editor tabs, dark mode, and logout. They use temporary accounts and delete them afterward. Screenshots and traces are written under the ignored `test-results/` directory.

API tests cover registration, one-use verification/reset links, session invalidation, cross-origin rejection, resource ownership, optimistic conflicts, duplicate/restore, analysis, unconfigured AI errors, letter ownership, portfolio password protection, analytics opt-out, upload signatures, real PDF bytes, and account deletion. Review `docs/VERIFICATION.md` for the final execution record and remaining deployment boundaries.

## REST surface

`/api/auth/*`, `/api/resumes`, `/api/resumes/:id`, `/api/resumes/:id/duplicate`, `/api/resumes/:id/versions`, `/api/resumes/:id/versions/:version/restore`, `/api/resumes/:id/export`, `/api/templates`, `/api/analyzer`, `/api/analyzer/import`, `/api/job-matcher`, `/api/ai/improve`, `/api/ai/cover-letter`, `/api/cover-letters`, `/api/interview-questions`, `/api/profile`, `/api/settings`, `/api/notifications`, `/api/portfolio`, `/api/analytics`, and `/api/public/:slug`.

Every mutating request requires `X-ResumeForge: 1`. The frontend sends it automatically. Authenticated endpoints also require the session cookie. Errors return `{ "error": "A useful message" }` and an appropriate HTTP status.
