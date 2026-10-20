/*
# Financo - Database Schema for Payment Reconciliation SaaS

## Overview
Creates the core schema for Financo, a payment reconciliation platform for Colombian accountants.
Multi-tenant: each user (accountant) can manage multiple client companies. Data is isolated per owner.

## New Tables
1. **profiles** - Extends auth.users with full_name, role (owner/accountant/assistant), plan, trial info
2. **companies** - Client companies belonging to a user (NIT, name, contact)
3. **bank_profiles** - Saved column-mapping profiles per bank to avoid reconfiguration
4. **uploads** - Uploaded files (bank statement or client ledger), with metadata and auto-delete date
5. **reconciliations** - A reconciliation run linking one bank statement + one ledger upload
6. **matches** - Individual match results (reconciled/suggestion/exception) with traceability
7. **audit_log** - Audit trail of who did what (upload, view, modify, export)

## Security
- RLS enabled on all tables
- Owner-scoped policies using auth.uid()
- Companies scoped to owner; child tables scoped through company ownership
- All owner columns default to auth.uid()
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','accountant','assistant')),
  plan text NOT NULL DEFAULT 'esencial' CHECK (plan IN ('esencial','profesional','firma')),
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- COMPANIES (client companies belonging to an accountant)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  nit text,
  contact_email text,
  contact_phone text,
  city text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select_own" ON companies;
CREATE POLICY "companies_select_own" ON companies FOR SELECT
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "companies_insert_own" ON companies;
CREATE POLICY "companies_insert_own" ON companies FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "companies_update_own" ON companies;
CREATE POLICY "companies_update_own" ON companies FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "companies_delete_own" ON companies;
CREATE POLICY "companies_delete_own" ON companies FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);

-- ============================================================
-- BANK PROFILES (saved column mappings per bank)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  date_column text,
  amount_column text,
  id_column text,
  name_column text,
  reference_column text,
  header_row integer NOT NULL DEFAULT 0,
  date_format text DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_profiles_select_own" ON bank_profiles;
CREATE POLICY "bank_profiles_select_own" ON bank_profiles FOR SELECT
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "bank_profiles_insert_own" ON bank_profiles;
CREATE POLICY "bank_profiles_insert_own" ON bank_profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "bank_profiles_update_own" ON bank_profiles;
CREATE POLICY "bank_profiles_update_own" ON bank_profiles FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "bank_profiles_delete_own" ON bank_profiles;
CREATE POLICY "bank_profiles_delete_own" ON bank_profiles FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_bank_profiles_owner ON bank_profiles(owner_id);

-- ============================================================
-- UPLOADS (uploaded files: bank statement or client ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  reconciliation_id uuid,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('bank_statement','client_ledger')),
  file_format text NOT NULL DEFAULT 'xlsx' CHECK (file_format IN ('xlsx','xls','csv')),
  row_count integer NOT NULL DEFAULT 0,
  storage_path text,
  parsed_data jsonb,
  auto_delete_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uploads_select_own" ON uploads;
CREATE POLICY "uploads_select_own" ON uploads FOR SELECT
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "uploads_insert_own" ON uploads;
CREATE POLICY "uploads_insert_own" ON uploads FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "uploads_update_own" ON uploads;
CREATE POLICY "uploads_update_own" ON uploads FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "uploads_delete_own" ON uploads;
CREATE POLICY "uploads_delete_own" ON uploads FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_uploads_owner ON uploads(owner_id);
CREATE INDEX IF NOT EXISTS idx_uploads_company ON uploads(company_id);

-- ============================================================
-- RECONCILIATIONS (a reconciliation run)
-- ============================================================
CREATE TABLE IF NOT EXISTS reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  ledger_upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('processing','completed','failed')),
  tolerance_percent numeric NOT NULL DEFAULT 0,
  total_bank_rows integer NOT NULL DEFAULT 0,
  total_ledger_rows integer NOT NULL DEFAULT 0,
  total_reconciled integer NOT NULL DEFAULT 0,
  total_suggestions integer NOT NULL DEFAULT 0,
  total_exceptions integer NOT NULL DEFAULT 0,
  total_amount_reconciled numeric NOT NULL DEFAULT 0,
  auto_percentage numeric NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconciliations_select_own" ON reconciliations;
CREATE POLICY "reconciliations_select_own" ON reconciliations FOR SELECT
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "reconciliations_insert_own" ON reconciliations;
CREATE POLICY "reconciliations_insert_own" ON reconciliations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "reconciliations_update_own" ON reconciliations;
CREATE POLICY "reconciliations_update_own" ON reconciliations FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "reconciliations_delete_own" ON reconciliations;
CREATE POLICY "reconciliations_delete_own" ON reconciliations FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_reconciliations_owner ON reconciliations(owner_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_company ON reconciliations(company_id);

-- ============================================================
-- MATCHES (individual match results)
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reconciliation_id uuid NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('reconciled','suggestion','exception')),
  exception_type text CHECK (exception_type IN ('no_client','duplicate','value_diff','empty_id','no_match')),
  bank_date text,
  bank_amount numeric,
  bank_id text,
  bank_name text,
  bank_reference text,
  ledger_date text,
  ledger_amount numeric,
  ledger_id text,
  ledger_name text,
  ledger_reference text,
  amount_diff numeric,
  match_rule text,
  confidence numeric NOT NULL DEFAULT 100,
  human_status text DEFAULT 'pending' CHECK (human_status IN ('pending','approved','rejected','edited')),
  comment text,
  row_index_bank integer,
  row_index_ledger integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_own" ON matches;
CREATE POLICY "matches_select_own" ON matches FOR SELECT
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "matches_insert_own" ON matches;
CREATE POLICY "matches_insert_own" ON matches FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "matches_update_own" ON matches;
CREATE POLICY "matches_update_own" ON matches FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "matches_delete_own" ON matches;
CREATE POLICY "matches_delete_own" ON matches FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_matches_reconciliation ON matches(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_matches_owner ON matches(owner_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('upload','view','modify','export','delete','login','reconcile')),
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log;
CREATE POLICY "audit_log_select_own" ON audit_log FOR SELECT
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "audit_log_insert_own" ON audit_log;
CREATE POLICY "audit_log_insert_own" ON audit_log FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_owner ON audit_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- Trigger to auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();