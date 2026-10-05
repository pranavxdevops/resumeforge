# Verification record

Verified on Windows through October 5, 2026, with Node.js 24 and installed Microsoft Edge. Local development uses persistent PGlite; production uses PostgreSQL through the same Drizzle schema.

## Executed checks

| Check | Result |
| --- | --- |
| ESLint | Passed |
| Strict TypeScript checking | Passed |
| Production frontend and backend build | Passed |
| Vitest unit/integration suite | 27 tests passed across 4 files |
| Playwright browser journeys | 6 passed, including desktop and mobile layouts |
| npm dependency audit | 0 known vulnerabilities at verification time |
| PDF visual inspection | Single-page export and all three pages of a long resume inspected |

The browser suite covers authentication, resume creation, immediate navigation after an edit, autosave/reload, structured entries, section ordering, template/font/color selection, PDF downloads, analysis, matching, letters, interview progress, portfolio visibility, dark mode, mobile editor tabs and logout. It uses isolated temporary accounts and removes them afterward.

API tests exercise authorization and ownership, CSRF rejection, optimistic revision conflicts, version restoration, password reset and email verification token reuse, session invalidation, portfolio password protection, analytics opt-out, upload signatures and account deletion. The AI adapter test uses a local mock upstream, not a live model provider.

PDF tests render all twenty templates and verify selectable content. A long resume spans three A4 pages and preserves its final role and following sections. The PDF renderer embeds local fonts and disables external network requests. Browser and PDF evidence is stored in ignored `test-results/` and `.data/qa/` directories.

The template gallery uses a centralized, complete Alex Morgan sample when no populated resume is available. All twenty sample layouts are checked for complete content, A4 geometry, absence of overflow and single-page PDF export. The gallery and editor share document rendering and DOM pagination with PDF export. Browser checks cover saved resume selection, favorites, searching, sorting, modal zoom, mobile paper scaling and preserving personal information, summary, entries and section order when applying a template. New resume creation verifies the chosen template's accent and excludes gallery sample data. An oversized summary also verifies that pagination retains content and avoids a header-only first page.

The ten additional layouts are ATS Compact, ATS Scholar, ATS Timeline, Modern Horizon, Modern Mono, Modern Grid, Creative Atelier, Creative Banner, Executive Ledger and Executive Summit. Layout column defaults live in the shared catalog and are honored consistently in the gallery, editor and PDFs; user column overrides remain available.

## Deployment boundaries

- Docker is not installed on this machine. Docker images and Compose services have not been built or run here. The separate Ubuntu production Compose YAML parses successfully and only Caddy publishes ports; its SMTP, TLS and container startup must still be validated on the target server using `docs/UBUNTU_DEPLOYMENT.md`.
- Kubernetes manifests and the GitHub Actions workflow are provided; neither a cluster rollout nor a hosted CI run has been executed.
- External PostgreSQL, Redis/BullMQ scheduling, S3-compatible storage, SMTP and Google OAuth require configured services and credentials. They have not been exercised against live external services.
- AI generation requires an OpenAI-compatible provider endpoint, model and API key. Missing configuration produces an explicit unavailable response. Resume editing, deterministic analysis, job matching, manually written letters and rule-based interview prompts work locally without an AI key.
- This delivery is a locally verified application and deployment source, not a public deployment. Configure HTTPS, secrets, backups and infrastructure before operating it publicly. Rate limits currently live in each API process; configure ingress limits or shared storage before scaling API replicas.

See the root README for setup commands, environment variables, security behavior and feature limitations.
