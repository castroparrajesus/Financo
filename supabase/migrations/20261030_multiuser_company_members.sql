-- ==============================================================================
-- Migración: Modelo Multiusuario y Control de Acceso Basado en Roles (RBAC)
-- ==============================================================================
-- 1. Tabla public.company_members con roles: owner, admin, editor, viewer
-- 2. Índice idx_company_members_user_id
-- 3. Función helper public.user_role_in_company(target_company_id uuid)
--    (SECURITY DEFINER, search_path = '', STABLE)
-- 4. Backfill de companies.user_id hacia company_members con role = 'owner'
-- 5. Políticas RLS permisivas actualizadas para uploads, reconciliations, matches y companies:
--    - SELECT: Cualquier miembro (owner, admin, editor, viewer)
--    - INSERT / UPDATE / DELETE en uploads, reconciliations, matches: owner, admin, editor
--    - UPDATE / DELETE en companies: Solo owner
-- 6. Compatible con las políticas restrictivas AAL2 existentes (AS RESTRICTIVE)
-- ==============================================================================

-- 1. Creación de la tabla company_members
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_members_company_user UNIQUE (company_id, user_id)
);

-- 2. Índices para optimización de consultas y RLS
CREATE INDEX IF NOT EXISTS idx_company_members_user_id 
  ON public.company_members(user_id);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id 
  ON public.company_members(company_id);

CREATE INDEX IF NOT EXISTS idx_company_members_company_user_role 
  ON public.company_members(company_id, user_id, role);

-- Habilitar RLS en company_members
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- 3. Función Helper: public.user_role_in_company(target_company_id uuid)
-- SECURITY DEFINER con search_path aislado para evitar secuestro de ruta
CREATE OR REPLACE FUNCTION public.user_role_in_company(target_company_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role
  FROM public.company_members
  WHERE company_id = target_company_id
    AND user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.user_role_in_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_role_in_company(uuid) TO service_role;

COMMENT ON FUNCTION public.user_role_in_company(uuid) IS 
  'Devuelve el rol (owner, admin, editor, viewer) del usuario autenticado en la empresa especificada, o NULL si no es miembro.';

-- 4. Backfill de datos existentes:
-- Insertar un registro con rol 'owner' en company_members por cada fila en companies con user_id no nulo
INSERT INTO public.company_members (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.companies
WHERE user_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Backfill de respaldo si existía columna owner_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id'
  ) THEN
    INSERT INTO public.company_members (company_id, user_id, role)
    SELECT id, owner_id, 'owner'
    FROM public.companies
    WHERE owner_id IS NOT NULL
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Trigger robusto para registrar automáticamente al creador de una empresa como 'owner'
-- Reglas de seguridad:
-- 1. Prioridad: Usa auth.uid() primero, y solo NEW.user_id si auth.uid() es NULL.
-- 2. Anti-suplantación: Si ambos no son NULL y no coinciden, lanza RAISE EXCEPTION.
-- 3. Manejo de excepciones específico: unique_violation (warning) y foreign_key_violation (exception).
CREATE OR REPLACE FUNCTION public.handle_new_company_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_auth_uid uuid;
  target_user_id uuid;
BEGIN
  current_auth_uid := (SELECT auth.uid());

  -- Validación estricta anti-suplantación:
  -- Si el usuario autenticado intenta asignar un user_id diferente, se aborta la creación
  IF current_auth_uid IS NOT NULL AND NEW.user_id IS NOT NULL AND NEW.user_id <> current_auth_uid THEN
    RAISE EXCEPTION 'No está autorizado para registrar una empresa a nombre de otro usuario (NEW.user_id: %, auth.uid: %)', NEW.user_id, current_auth_uid;
  END IF;

  -- Inversión de prioridad: auth.uid() primero, y solo NEW.user_id si auth.uid() es NULL
  target_user_id := COALESCE(current_auth_uid, NEW.user_id);

  -- Si no hay usuario identificable (ej: script o seed sin sesión), se omite limpiamente
  IF target_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.company_members (company_id, user_id, role)
      VALUES (NEW.id, target_user_id, 'owner')
      ON CONFLICT (company_id, user_id) DO UPDATE
        SET role = 'owner', updated_at = now();
    EXCEPTION
      WHEN unique_violation THEN
        RAISE WARNING 'handle_new_company_owner: advertencia de concurrencia unique_violation en company_members: %', SQLERRM;
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'handle_new_company_owner: clave foránea inválida para empresa % o usuario %: %', NEW.id, target_user_id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_company_owner ON public.companies;
CREATE TRIGGER trg_new_company_owner
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_owner();

-- ==============================================================================
-- 5. POLÍTICAS RLS EN public.company_members
-- ==============================================================================
DROP POLICY IF EXISTS "company_members_select" ON public.company_members;
CREATE POLICY "company_members_select" ON public.company_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.user_role_in_company(company_id) IS NOT NULL
  );

DROP POLICY IF EXISTS "company_members_insert" ON public.company_members;
CREATE POLICY "company_members_insert" ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role_in_company(company_id) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "company_members_update" ON public.company_members;
CREATE POLICY "company_members_update" ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    public.user_role_in_company(company_id) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "company_members_delete" ON public.company_members;
CREATE POLICY "company_members_delete" ON public.company_members
  FOR DELETE
  TO authenticated
  USING (
    public.user_role_in_company(company_id) = 'owner' OR
    (public.user_role_in_company(company_id) = 'admin' AND role <> 'owner')
  );

-- ==============================================================================
-- 6. POLÍTICAS RLS PERMISIVAS EN public.companies
-- ==============================================================================
DROP POLICY IF EXISTS "companies_select_own" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_own" ON public.companies;
DROP POLICY IF EXISTS "companies_update_own" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_own" ON public.companies;

DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_user" ON public.companies;
DROP POLICY IF EXISTS "companies_update_owner" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_owner" ON public.companies;

-- SELECT: Cualquier miembro de la empresa
CREATE POLICY "companies_select_member" ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    public.user_role_in_company(id) IS NOT NULL OR
    user_id = auth.uid()
  );

-- INSERT: Cualquier usuario autenticado puede registrar una empresa
CREATE POLICY "companies_insert_user" ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (user_id = auth.uid() OR user_id IS NULL)
  );

-- UPDATE: Solo el owner de la empresa puede actualizar datos
CREATE POLICY "companies_update_owner" ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    public.user_role_in_company(id) = 'owner' OR
    user_id = auth.uid()
  )
  WITH CHECK (
    public.user_role_in_company(id) = 'owner' OR
    user_id = auth.uid()
  );

-- DELETE: Solo el owner puede eliminar la empresa
CREATE POLICY "companies_delete_owner" ON public.companies
  FOR DELETE
  TO authenticated
  USING (
    public.user_role_in_company(id) = 'owner' OR
    user_id = auth.uid()
  );

-- ==============================================================================
-- 7. POLÍTICAS RLS PERMISIVAS EN public.uploads
-- ==============================================================================
DROP POLICY IF EXISTS "uploads_select_own" ON public.uploads;
DROP POLICY IF EXISTS "uploads_insert_own" ON public.uploads;
DROP POLICY IF EXISTS "uploads_update_own" ON public.uploads;
DROP POLICY IF EXISTS "uploads_delete_own" ON public.uploads;
DROP POLICY IF EXISTS "uploads_select_policy" ON public.uploads;
DROP POLICY IF EXISTS "uploads_insert_policy" ON public.uploads;
DROP POLICY IF EXISTS "uploads_update_policy" ON public.uploads;
DROP POLICY IF EXISTS "uploads_delete_policy" ON public.uploads;

DROP POLICY IF EXISTS "uploads_select_member" ON public.uploads;
DROP POLICY IF EXISTS "uploads_insert_editor" ON public.uploads;
DROP POLICY IF EXISTS "uploads_update_editor" ON public.uploads;
DROP POLICY IF EXISTS "uploads_delete_editor" ON public.uploads;

-- SELECT: Cualquier rol (owner, admin, editor, viewer)
CREATE POLICY "uploads_select_member" ON public.uploads
  FOR SELECT
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IS NOT NULL
  );

-- INSERT: Solo owner, admin o editor (viewer no puede insertar)
CREATE POLICY "uploads_insert_editor" ON public.uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  );

-- UPDATE: Solo owner, admin o editor
CREATE POLICY "uploads_update_editor" ON public.uploads
  FOR UPDATE
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  )
  WITH CHECK (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  );

-- DELETE: Solo owner, admin o editor
CREATE POLICY "uploads_delete_editor" ON public.uploads
  FOR DELETE
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  );

-- ==============================================================================
-- 8. POLÍTICAS RLS PERMISIVAS EN public.reconciliations
-- ==============================================================================
DROP POLICY IF EXISTS "reconciliations_select_own" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_insert_own" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_update_own" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_delete_own" ON public.reconciliations;

DROP POLICY IF EXISTS "reconciliations_select_member" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_insert_editor" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_update_editor" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_delete_editor" ON public.reconciliations;

-- SELECT: Cualquier rol (owner, admin, editor, viewer)
CREATE POLICY "reconciliations_select_member" ON public.reconciliations
  FOR SELECT
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IS NOT NULL
  );

-- INSERT: Solo owner, admin o editor
CREATE POLICY "reconciliations_insert_editor" ON public.reconciliations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  );

-- UPDATE: Solo owner, admin o editor
CREATE POLICY "reconciliations_update_editor" ON public.reconciliations
  FOR UPDATE
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  )
  WITH CHECK (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  );

-- DELETE: Solo owner, admin o editor
CREATE POLICY "reconciliations_delete_editor" ON public.reconciliations
  FOR DELETE
  TO authenticated
  USING (
    public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
  );

-- ==============================================================================
-- 9. POLÍTICAS RLS PERMISIVAS EN public.matches
-- ==============================================================================
DROP POLICY IF EXISTS "matches_select_own" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_own" ON public.matches;
DROP POLICY IF EXISTS "matches_update_own" ON public.matches;
DROP POLICY IF EXISTS "matches_delete_own" ON public.matches;

DROP POLICY IF EXISTS "matches_select_member" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_editor" ON public.matches;
DROP POLICY IF EXISTS "matches_update_editor" ON public.matches;
DROP POLICY IF EXISTS "matches_delete_editor" ON public.matches;

-- SELECT: Cualquier rol mediante la conciliación asociada
CREATE POLICY "matches_select_member" ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = matches.reconciliation_id
        AND public.user_role_in_company(r.company_id) IS NOT NULL
    )
  );

-- INSERT: Solo owner, admin o editor
CREATE POLICY "matches_insert_editor" ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = matches.reconciliation_id
        AND public.user_role_in_company(r.company_id) IN ('owner', 'admin', 'editor')
    )
  );

-- UPDATE: Solo owner, admin o editor
CREATE POLICY "matches_update_editor" ON public.matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = matches.reconciliation_id
        AND public.user_role_in_company(r.company_id) IN ('owner', 'admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = matches.reconciliation_id
        AND public.user_role_in_company(r.company_id) IN ('owner', 'admin', 'editor')
    )
  );

-- DELETE: Solo owner, admin o editor
CREATE POLICY "matches_delete_editor" ON public.matches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = matches.reconciliation_id
        AND public.user_role_in_company(r.company_id) IN ('owner', 'admin', 'editor')
    )
  );
