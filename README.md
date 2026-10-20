# Financo

Financo is a Spanish-language payment reconciliation app for Colombian accountants. It compares a bank statement with a client ledger, surfaces uncertain cases for human review, and exports Excel/PDF reports.

## Architecture

The current app is a Next.js 13.5.1 App Router application with TypeScript, Tailwind CSS, shadcn-style UI components, SheetJS, and Supabase:

```text
app/
  login/ signup/                 Supabase Auth screens and demo entry
  dashboard/
    nueva/                       File parsing, column mapping and reconciliation
    conciliaciones/              History, review, and exports
    empresas/ ajustes/           Client-company and account screens
  privacidad/ terminos/          Public legal-information pages
components/ui/                   Shared UI primitives
lib/reconciliation/              File parser and deterministic matching engine
lib/supabase/                    Supabase browser client and auth context
lib/export.ts                    Excel and PDF generation
supabase/migrations/             PostgreSQL schema and RLS policies
tests/                           Node's built-in test runner tests
examples/                        CSV bank and client-ledger fixtures
```

### Why this architecture

- Reuses the existing Next.js/Supabase app instead of splitting a modest matching workload into a second service.
- SheetJS reads `.xlsx`, `.xls`, and `.csv` in the browser; original files are not uploaded to object storage by the current flow.
- PostgreSQL is the source of truth for signed-in accounts. Supabase Auth supplies the user identity and row-level security scopes account data.
- Exact identifier-and-value matches can be marked reconciled; tolerance and fuzzy matches remain suggestions for a person to review.
- Demo mode offers a one-click sample reconciliation. Runs and human review decisions/comments stay in the current tab's `sessionStorage`, isolated from signed-in account data.

## Database model

Apply both SQL migrations in timestamp order in a Supabase project. The current schema uses:

| Table | Purpose |
| --- | --- |
| `auth.users` / `profiles` | Supabase identity and Financo role, plan, and profile |
| `companies` | Client companies managed by an account owner |
| `bank_profiles` | Saved bank-specific column mappings |
| `uploads` | File metadata and up to 100 parsed source rows; original files are not stored |
| `reconciliations` | Run settings and aggregate result counts |
| `matches` | Reconciled, suggested, and exceptional rows; exception cases use `status = 'exception'` and `exception_type` |
| `audit_log` | Recorded reconciliation and export events |

In this model, a separate `clients` or `exceptions` table would duplicate concepts already represented by `companies` and `matches`. The current ownership/RLS model is per authenticated account; shared workspaces and multi-user company memberships are not implemented yet.

## Requirements and current release status

Implemented in this repository: email/password signup and login, account-scoped RLS schema, company management, XLS/XLSX/CSV parsing, header and column detection, amount/date/identifier normalization, exact/tolerance/fuzzy matching, manual review for signed-in accounts and local demo runs, reconciliation history, Excel/PDF exports, and public privacy/terms pages.

The following are **not production-ready or not implemented**: MFA enrollment/challenge, team invitations and per-company role authorization, object-storage uploads and scheduled retention deletion, billing/subscription checkout, persisted bank-profile management in the UI, audit coverage for every view/change, and server-side processing/API endpoints. Plan prices shown in the app are informational, not a connected billing service. Review and complete these items before handling real personal or financial data or advertising full Ley 1581 compliance.

## Install and run

Requirements: Node.js 20 or newer and a Supabase project.

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Configure local environment variables in `.env.local` (never commit this file):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

3. Apply both SQL migrations in timestamp order in the Supabase SQL editor or through the Supabase CLI. The hardening migration intentionally stops if it finds unassigned or cross-account legacy uploads; resolve those rows before retrying.
4. Start the app and run checks:

   ```powershell
   npm run dev
   npm run typecheck
   npm run test:engine
   ```

Use `npm run build` to create a production build. The current `next.config.js` and `netlify.toml` are configured for the existing deployment setup; set the two public Supabase environment variables in the deployment environment and apply both migrations before release. Do not expose a Supabase service-role key in browser code.

## API and data access

There are currently no custom Next.js `app/api/**/route.ts` endpoints. The browser uses the Supabase SDK:

- Auth signup: `POST {SUPABASE_URL}/auth/v1/signup`
- Password login: `POST {SUPABASE_URL}/auth/v1/token?grant_type=password`
- Data access: `{SUPABASE_URL}/rest/v1/{profiles|companies|bank_profiles|uploads|reconciliations|matches|audit_log}`

The SDK attaches the project anon key and the signed-in user's access token; PostgreSQL RLS policies enforce the current account boundary. Reconciliation calculation runs in the browser, not through a trusted server endpoint. Do not use client-side RLS as a substitute for server-side authorization if adding privileged API routes.

## Reproducible example

Use `examples/extracto_bancario.csv` and `examples/agenda_clientes.csv` in **Nueva conciliación**. With exact matching, fuzzy suggestions enabled, duplicate checking enabled, and 0% tolerance, the expected result is:

| Result | Count |
| --- | ---: |
| Bank rows | 12 |
| Ledger rows | 9 |
| Reconciled | 7 |
| Suggestions (human review) | 1 |
| Exceptions | 5 |

Run `npm run test:engine` to validate the fixtures, matching behavior, and a synthetic 50,000-row exact-match case against the 30-second target. This benchmark does not certify worst-case fuzzy workloads or every deployment/browser; measure those before making a production SLA.
