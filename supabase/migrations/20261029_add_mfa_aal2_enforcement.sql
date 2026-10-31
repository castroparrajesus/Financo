-- ==============================================================================
-- Migración: MFA con TOTP y Enforzamiento AAL2 Condicional en Tablas Sensibles
-- ==============================================================================
-- Arquitectura: Opción B Optimizada y Robusta (NULL-safe + InitPlan + Guarda auth.uid())
--
-- Orden de ejecución estricto (previene errores de dependencias en PostgreSQL):
-- 1. DROP POLICY IF EXISTS: Elimina primero las políticas restrictivas dependientes.
-- 2. DROP FUNCTION IF EXISTS: Elimina funciones anteriores en esquemas auth y public.
-- 3. CREATE FUNCTION: Crea public.user_has_mfa() NULL-safe con COALESCE(..., false).
-- 4. CREATE POLICY: Recrea las políticas con guarda explícita:
--    auth.uid() IS NOT NULL AND ((auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa()))
-- ==============================================================================

-- 1. Limpieza de tabla legacy recovery_codes
DROP TABLE IF EXISTS public.recovery_codes CASCADE;

-- 2. Asegurar Row Level Security en tablas sensibles
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- PASO 1: Eliminar primero las políticas RLS dependientes
-- ==============================================================================
DROP POLICY IF EXISTS "require_aal2_if_enrolled_uploads" ON public.uploads;
DROP POLICY IF EXISTS "require_aal2_uploads" ON public.uploads;

DROP POLICY IF EXISTS "require_aal2_if_enrolled_reconciliations" ON public.reconciliations;
DROP POLICY IF EXISTS "require_aal2_reconciliations" ON public.reconciliations;

DROP POLICY IF EXISTS "require_aal2_if_enrolled_matches" ON public.matches;
DROP POLICY IF EXISTS "require_aal2_matches" ON public.matches;

-- ==============================================================================
-- PASO 2: Eliminar la función antigua en auth y versiones previas en public
-- ==============================================================================
DROP FUNCTION IF EXISTS auth.user_has_mfa();
DROP FUNCTION IF EXISTS public.user_has_mfa();

-- ==============================================================================
-- PASO 3: Crear función NULL-safe en public (COALESCE a false si auth.uid() es NULL)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.user_has_mfa()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT EXISTS (
        SELECT 1 
        FROM auth.mfa_factors 
        WHERE user_id = (SELECT auth.uid()) 
          AND status = 'verified'
      )
    ),
    false
  );
$$;

-- Otorgar permiso de ejecución al rol authenticated y service_role
GRANT EXECUTE ON FUNCTION public.user_has_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_mfa() TO service_role;

COMMENT ON FUNCTION public.user_has_mfa() IS 
  'Verifica si el usuario autenticado tiene al menos un factor MFA TOTP verificado en auth.mfa_factors. NULL-safe: retorna false si auth.uid() es NULL.';

-- ==============================================================================
-- PASO 4: Recrear las políticas restrictivas con guarda explícita y subquery InitPlan
-- ==============================================================================
-- Guarda explícita: auth.uid() IS NOT NULL AND ((auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa()))

-- 4.1 Tabla uploads
CREATE POLICY "require_aal2_if_enrolled_uploads"
  ON public.uploads
  AS RESTRICTIVE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      (auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa())
    )
  );

-- 4.2 Tabla reconciliations
CREATE POLICY "require_aal2_if_enrolled_reconciliations"
  ON public.reconciliations
  AS RESTRICTIVE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      (auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa())
    )
  );

-- 4.3 Tabla matches
CREATE POLICY "require_aal2_if_enrolled_matches"
  ON public.matches
  AS RESTRICTIVE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      (auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa())
    )
  );

-- Documentación en catálogo PostgreSQL
COMMENT ON POLICY "require_aal2_if_enrolled_uploads" ON public.uploads IS 
  'Guarda auth.uid() IS NOT NULL + InitPlan escalar (SELECT public.user_has_mfa()). Exige AAL2 si tiene TOTP verificado.';
COMMENT ON POLICY "require_aal2_if_enrolled_reconciliations" ON public.reconciliations IS 
  'Guarda auth.uid() IS NOT NULL + InitPlan escalar (SELECT public.user_has_mfa()). Exige AAL2 si tiene TOTP verificado.';
COMMENT ON POLICY "require_aal2_if_enrolled_matches" ON public.matches IS 
  'Guarda auth.uid() IS NOT NULL + InitPlan escalar (SELECT public.user_has_mfa()). Exige AAL2 si tiene TOTP verificado.';
