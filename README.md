# Financo

Financo is a Spanish-language payment reconciliation app for Colombian accountants. It compares a bank statement with a client ledger, surfaces uncertain cases for human review, and exports Excel/PDF reports.

## Architecture

Next.js 13.5.1 App Router + TypeScript + Tailwind CSS + shadcn-style UI + SheetJS + Supabase.

    app/
      login/ signup/                 Supabase Auth screens and demo entry
      login/mfa/                     MFA TOTP challenge (AAL2)
      dashboard/
        nueva/                       File parsing, column mapping and reconciliation
        conciliaciones/              History, review, and exports
        empresas/[id]/               Company detail and team management
        ajustes/seguridad/           MFA enrollment and security settings
      privacidad/ terminos/          Public legal-information pages
    components/
      ui/                            Shared UI primitives
      mfa/                           EnrollMFA, MFAChallenge, StepUpModal
      reconciliation/                FileVerifiedBadge
    lib/
      reconciliation/                File parser + bank-header detector + matching engine
      crypto/                        SHA-256 file integrity (Web Crypto API)
      supabase/                      Supabase browser client and auth context
      export.ts                      Excel and PDF generation
    supabase/migrations/             PostgreSQL schema, RLS policies, MFA, multiuser
    tests/                           Node built-in test runner tests (unit + integration)
    examples/                        CSV bank and client-ledger fixtures

### Why this architecture

- Reuses the existing Next.js/Supabase app instead of splitting a modest matching workload into a second service.
- SheetJS reads `.xlsx`, `.xls`, and `.csv` in the browser; original files are not uploaded to object storage.
- SHA-256 is computed client-side before parsing, and the hash is persisted in `uploads.sha256_hex` for auditability.
- PostgreSQL is the source of truth. Supabase Auth supplies identity; RLS enforces account and company boundaries.
- Exact identifier-and-value matches can be marked reconciled; tolerance and fuzzy matches remain suggestions for a person to review.
- Demo mode offers a one-click sample reconciliation. Runs and human review decisions/comments stay in the current tab's `sessionStorage`, isolated from signed-in account data.

## Security

### Authentication

- Email/password signup and login via Supabase Auth.
- **MFA with TOTP (AAL2)** via Supabase Auth. Users can enroll up to 10 TOTP factors (primary + backups).
- Login flow: after password, `getAuthenticatorAssuranceLevel()` checks if MFA is required and redirects to `/login/mfa`.
- Step-up modal before sensitive actions (exports) re-verifies TOTP if the session is in AAL1.

### Authorization

- RLS is enabled on all account-scoped tables.
- **Per-company RBAC** via `company_members` (`owner`, `admin`, `editor`, `viewer`).
- Helper functions are `SECURITY DEFINER` with `search_path = ''` to avoid privilege escalation and search-path hijacking.
- MFA enforcement is **conditional**: users without MFA remain in AAL1 and can use the app; users with MFA must reach AAL2 to access `uploads`, `reconciliations`, and `matches`.
- `auth.uid() IS NOT NULL` is enforced explicitly in restrictive policies.

### Data integrity

- SHA-256 of each uploaded file is computed in the browser and stored in `uploads.sha256_hex`.
- `CHECK` constraint enforces a 64-hex format.
- File size limit: 25 MB, validated before reading into memory.
- Original files are never uploaded; only metadata and up to 100 parsed rows are stored.

### What is intentionally NOT claimed

Financo does **not** currently claim full Ley 1581 compliance. The following are **not implemented**:

- Pass-through billing / subscription checkout (plan prices, if shown, are informational).
- Full audit coverage of every view/change (partial audit exists).
- Data retention policy enforcement (no scheduled deletion).
- Server-side reconciliation processing (matching runs in the browser).
- Export to Siigo / World Office (only generic Excel/PDF).
- 4x1000 detection (not implemented as a rule).
- Benchmarks for worst-case fuzzy matching (only a 50k exact-match synthetic case is tested).

## Database model

| Table | Purpose |
|---|---|
| `auth.users` / `profiles` | Supabase identity and Financo role, plan, and profile |
| `companies` | Client companies managed by an account or team |
| `company_members` | RBAC: `(company_id, user_id, role)` with `owner/admin/editor/viewer` |
| `bank_profiles` | Saved bank-specific column mappings (schema exists; UI persistence pending) |
| `uploads` | File metadata, SHA-256, detected bank, up to 100 parsed source rows |
| `reconciliations` | Run settings and aggregate result counts |
| `matches` | Reconciled, suggested, and exceptional rows (`status = 'exception'`) |
| `audit_log` | Recorded reconciliation and export events (partial coverage) |

## Reproducible example

Use `examples/extracto_bancario.csv` and `examples/agenda_clientes.csv` in **Nueva conciliación**. With exact matching, fuzzy suggestions enabled, duplicate checking enabled, and 0% tolerance:

| Result | Count |
|---|---|
| Bank rows | 12 |
| Ledger rows | 9 |
| Reconciled | 7 |
| Suggestions (human review) | 1 |
| Exceptions | 5 |

Run `npm run test:unit` for the matching engine, bank-header detector, SHA-256, and RLS logic. Run `npm run test:integration` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for live RLS, MFA, and multiuser tests.

## Install and run

Requirements: Node.js 20+ and a Supabase project.

1. `npm ci`
2. Create `.env.local`:
```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
3. Apply all SQL migrations in `supabase/migrations/` in timestamp order.
4. `npm run dev`, `npm run typecheck`, `npm run test:unit`.

Use `npm run build` to create a production build.

## Release status

Implemented: email/password auth, MFA TOTP (AAL2), company RBAC, XLS/XLSX/CSV parsing, bank-header detection (Bancolombia, Davivienda, Banco de Bogotá) by NIT, SHA-256 file integrity, exact/tolerance/fuzzy matching, manual review, history, Excel/PDF exports, public privacy/terms pages.

Not production-ready: billing, full audit coverage, retention deletion, server-side processing, Siigo/World Office export, 4x1000 rules, worst-case fuzzy benchmarks.

Review and complete these before handling real personal or financial data or advertising full Ley 1581 compliance.
