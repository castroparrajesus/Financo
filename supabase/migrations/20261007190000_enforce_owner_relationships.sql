-- Keep foreign keys inside the same account and client company.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM uploads WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'Unassigned uploads exist; associate them with an owned company before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM uploads u
    JOIN companies c ON c.id = u.company_id
    WHERE u.owner_id <> c.owner_id
  ) OR EXISTS (
    SELECT 1
    FROM reconciliations r
    JOIN companies c ON c.id = r.company_id
    WHERE r.owner_id <> c.owner_id
  ) THEN
    RAISE EXCEPTION 'Cross-account company relationships exist; resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reconciliations r
    JOIN uploads u
      ON u.id IN (r.bank_upload_id, r.ledger_upload_id)
    WHERE u.owner_id <> r.owner_id OR u.company_id IS DISTINCT FROM r.company_id
  ) THEN
    RAISE EXCEPTION 'Reconciliations reference uploads from another account or company; resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM matches m
    JOIN reconciliations r ON r.id = m.reconciliation_id
    WHERE m.owner_id <> r.owner_id
  ) THEN
    RAISE EXCEPTION 'Cross-account match relationships exist; resolve them before applying this migration.';
  END IF;
END;
$$;

ALTER TABLE uploads ALTER COLUMN company_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_id_owner_unique
  ON companies (id, owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS uploads_id_owner_company_unique
  ON uploads (id, owner_id, company_id);

CREATE UNIQUE INDEX IF NOT EXISTS reconciliations_id_owner_unique
  ON reconciliations (id, owner_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uploads_company_owner_fkey') THEN
    ALTER TABLE uploads
      ADD CONSTRAINT uploads_company_owner_fkey
      FOREIGN KEY (company_id, owner_id)
      REFERENCES companies (id, owner_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reconciliations_company_owner_fkey') THEN
    ALTER TABLE reconciliations
      ADD CONSTRAINT reconciliations_company_owner_fkey
      FOREIGN KEY (company_id, owner_id)
      REFERENCES companies (id, owner_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reconciliations_bank_upload_owner_company_fkey') THEN
    ALTER TABLE reconciliations
      ADD CONSTRAINT reconciliations_bank_upload_owner_company_fkey
      FOREIGN KEY (bank_upload_id, owner_id, company_id)
      REFERENCES uploads (id, owner_id, company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reconciliations_ledger_upload_owner_company_fkey') THEN
    ALTER TABLE reconciliations
      ADD CONSTRAINT reconciliations_ledger_upload_owner_company_fkey
      FOREIGN KEY (ledger_upload_id, owner_id, company_id)
      REFERENCES uploads (id, owner_id, company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_reconciliation_owner_fkey') THEN
    ALTER TABLE matches
      ADD CONSTRAINT matches_reconciliation_owner_fkey
      FOREIGN KEY (reconciliation_id, owner_id)
      REFERENCES reconciliations (id, owner_id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    AND current_user NOT IN ('postgres', 'supabase_admin')
    AND (
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.plan IS DISTINCT FROM OLD.plan OR
    NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled OR
    NEW.two_factor_secret IS DISTINCT FROM OLD.two_factor_secret OR
    NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
  ) THEN
    RAISE EXCEPTION 'Role, plan, MFA status, and trial dates can only be changed by a trusted server.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_changes ON profiles;
CREATE TRIGGER prevent_profile_privilege_changes
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_changes();

REVOKE SELECT ON profiles FROM authenticated;
GRANT SELECT (
  id,
  email,
  full_name,
  role,
  plan,
  two_factor_enabled,
  trial_ends_at,
  created_at,
  updated_at
) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_company_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  company_limit integer;
  current_count integer;
  excluded_company_id uuid;
BEGIN
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.owner_id = OLD.owner_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    excluded_company_id := OLD.id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.owner_id::text));

  SELECT CASE COALESCE(plan, 'esencial')
    WHEN 'esencial' THEN 5
    WHEN 'profesional' THEN 20
    WHEN 'firma' THEN 60
    ELSE 5
  END
  INTO company_limit
  FROM profiles
  WHERE id = NEW.owner_id;

  company_limit := COALESCE(company_limit, 5);
  SELECT count(*) INTO current_count
  FROM companies
  WHERE owner_id = NEW.owner_id
    AND (excluded_company_id IS NULL OR id <> excluded_company_id);

  IF current_count >= company_limit THEN
    RAISE EXCEPTION 'The current plan allows up to % companies.', company_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_plan_limit ON companies;
CREATE TRIGGER enforce_company_plan_limit
  BEFORE INSERT OR UPDATE OF owner_id ON companies
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_plan_limit();
