-- ==============================================================================
-- Migración: Integridad SHA-256 en uploads y Aislamiento RLS por user_id
-- ==============================================================================
-- ESTRUCTURA DE LA MIGRACIÓN:
-- 1. DDL: Adición de columnas estructurales SIN default auth.uid()
-- 2. Backfill: Migración condicional de datos (solo si existe owner_id)
-- 3. Políticas RLS: Seguridad a nivel de fila aplicada post-backfill
-- ==============================================================================

-- ==============================================================================
-- SECCIÓN 1: DDL ESTRUCTURAL (Columnas SIN DEFAULT)
-- ==============================================================================
-- Nota de diseño: No se asigna DEFAULT auth.uid() aquí porque las migraciones corren
-- en contexto administrativo/postgres donde auth.uid() devuelve NULL. El ID del usuario
-- debe ser inyectado explícitamente en el payload del cliente autenticado o por trigger.

-- 1.1 Asegurar columna user_id en companies (sin DEFAULT)
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.2 Asegurar columnas en uploads (sin DEFAULT)
ALTER TABLE IF EXISTS public.uploads
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sha256_hex varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint NULL,
  ADD COLUMN IF NOT EXISTS detected_bank varchar(50) NULL;

-- 1.3 Restricción de formato para sha256_hex (exactamente 64 caracteres hexadecimales)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_sha256_hex_format'
  ) THEN
    ALTER TABLE public.uploads
      ADD CONSTRAINT check_sha256_hex_format
      CHECK (sha256_hex IS NULL OR sha256_hex ~* '^[a-f0-9]{64}$');
  END IF;
END $$;

-- 1.4 Índices para consultas de auditoría, verificación e integridad
CREATE INDEX IF NOT EXISTS idx_uploads_sha256_hex 
  ON public.uploads(sha256_hex);

CREATE INDEX IF NOT EXISTS idx_uploads_user_company 
  ON public.uploads(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_companies_user_id 
  ON public.companies(user_id);

-- ==============================================================================
-- SECCIÓN 2: SCRIPT DE BACKFILL DOCUMENTADO
-- ==============================================================================
-- Caso A (Automático): Si las tablas provienen del esquema original con columna
-- 'owner_id', este bloque migra los UUID existentes a 'user_id'.
--
-- Caso B (Manual): Si 'owner_id' NO existe en tu base de datos y tienes registros
-- huérfanos con user_id = NULL, debes poblar user_id manualmente antes de
-- requerir NOT NULL:
--
--   -- 1. Asociar empresas al usuario administrador o contador responsable:
--   UPDATE public.companies 
--   SET user_id = '00000000-0000-0000-0000-000000000000' -- Reemplazar por auth.users.id
--   WHERE user_id IS NULL;
--
--   -- 2. Heredar user_id en uploads a partir de la empresa cliente asociada:
--   UPDATE public.uploads u
--   SET user_id = c.user_id
--   FROM public.companies c
--   WHERE u.company_id = c.id AND u.user_id IS NULL;
-- ==============================================================================

DO $$
DECLARE
  has_companies_owner_id boolean;
  has_uploads_owner_id boolean;
  backfilled_companies integer := 0;
  backfilled_uploads integer := 0;
BEGIN
  -- Verificar existencia física de columna owner_id en companies
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id'
  ) INTO has_companies_owner_id;

  -- Verificar existencia física de columna owner_id en uploads
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'uploads' AND column_name = 'owner_id'
  ) INTO has_uploads_owner_id;

  -- Backfill condicional para companies
  IF has_companies_owner_id THEN
    EXECUTE 'UPDATE public.companies SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL';
    GET DIAGNOSTICS backfilled_companies = ROW_COUNT;
    RAISE NOTICE 'Backfill completado para companies: % filas migradas desde owner_id a user_id.', backfilled_companies;
  ELSE
    RAISE NOTICE 'Columna owner_id no encontrada en companies. Si existen filas con user_id NULL, consulte las instrucciones de backfill manual en el archivo de migración.';
  END IF;

  -- Backfill condicional para uploads
  IF has_uploads_owner_id THEN
    EXECUTE 'UPDATE public.uploads SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL';
    GET DIAGNOSTICS backfilled_uploads = ROW_COUNT;
    RAISE NOTICE 'Backfill completado para uploads: % filas migradas desde owner_id a user_id.', backfilled_uploads;
  ELSE
    -- Intento secundario: heredar user_id desde companies si company_id está presente
    UPDATE public.uploads u
    SET user_id = c.user_id
    FROM public.companies c
    WHERE u.company_id = c.id AND u.user_id IS NULL AND c.user_id IS NOT NULL;
    GET DIAGNOSTICS backfilled_uploads = ROW_COUNT;
    RAISE NOTICE 'Backfill por asociación de companies completado para uploads: % filas asignadas.', backfilled_uploads;
  END IF;
END $$;

-- ==============================================================================
-- SECCIÓN 3: POLÍTICAS RLS (Post-Backfill)
-- ==============================================================================
-- Se activan y crean las políticas RLS una vez que las columnas y datos están normalizados.
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas para evitar conflictos de nombres
DROP POLICY IF EXISTS "uploads_select_policy" ON public.uploads;
DROP POLICY IF EXISTS "uploads_insert_policy" ON public.uploads;
DROP POLICY IF EXISTS "uploads_update_policy" ON public.uploads;
DROP POLICY IF EXISTS "uploads_delete_policy" ON public.uploads;

-- POLÍTICA SELECT: El usuario solo puede consultar uploads propios o pertenecientes a sus empresas
CREATE POLICY "uploads_select_policy" ON public.uploads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = uploads.company_id
        AND c.user_id = auth.uid()
    )
  );

-- POLÍTICA INSERT: El usuario solo puede insertar uploads si es dueño de la empresa (anti-suplantación)
CREATE POLICY "uploads_insert_policy" ON public.uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = uploads.company_id
        AND c.user_id = auth.uid()
    )
  );

-- POLÍTICA UPDATE: El usuario solo puede modificar uploads vinculados a sus empresas
CREATE POLICY "uploads_update_policy" ON public.uploads
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = uploads.company_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = uploads.company_id
        AND c.user_id = auth.uid()
    )
  );

-- POLÍTICA DELETE: El usuario solo puede eliminar uploads de sus empresas
CREATE POLICY "uploads_delete_policy" ON public.uploads
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = uploads.company_id
        AND c.user_id = auth.uid()
    )
  );

-- Comentarios explicativos
COMMENT ON COLUMN public.uploads.sha256_hex IS 
  'Huella digital criptográfica SHA-256 calculada en el navegador vía Web Crypto API antes del parseo (Ley 527/1999).';

COMMENT ON COLUMN public.uploads.file_size_bytes IS 
  'Tamaño exacto del archivo cargado en bytes (máximo 25 MB = 26214400 bytes).';

COMMENT ON COLUMN public.uploads.detected_bank IS 
  'Banco detectado en membrete por NIT o estructura (bancolombia, davivienda, bogota, generico).';
