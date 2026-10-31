const assert = require('node:assert/strict');
const test = require('node:test');

test.describe('Test Unitario: Lógica de Políticas Restrictivas RLS Condicionales (mfa-rls-logic)', () => {
  // Simulación del motor PostgreSQL con Opción B Optimizada y NULL-safe:
  // 1. Políticas Permisivas: auth.uid() = user_id
  // 2. Función SECURITY DEFINER public.user_has_mfa() con COALESCE(..., false)
  // 3. Subquery InitPlan escalar: (SELECT public.user_has_mfa()) ejecutado una sola vez por query
  // 4. Guarda explícita: auth.uid() IS NOT NULL AND ((auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa()))

  const mockUploads = [
    { id: 'upl-001', user_id: 'usr-sin-mfa', company_id: 'comp-1', file_name: 'Extracto_Sin_Mfa.xlsx' },
    { id: 'upl-002', user_id: 'usr-con-mfa', company_id: 'comp-2', file_name: 'Extracto_Con_Mfa.xlsx' },
    { id: 'upl-003', user_id: 'usr-otro-cliente', company_id: 'comp-3', file_name: 'Extracto_Otro.xlsx' },
  ];

  // Mock de auth.mfa_factors accesible vía función SECURITY DEFINER en public
  const mockMfaFactors = [
    { id: 'fac-001', user_id: 'usr-con-mfa', factor_type: 'totp', status: 'verified' },
  ];

  // Simulación fiel de public.user_has_mfa():
  // SELECT COALESCE((SELECT EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = auth.uid() AND status = 'verified')), false)
  let publicUserHasMfaCalls = 0;
  function publicUserHasMfa(authUid) {
    publicUserHasMfaCalls += 1;
    // Si auth.uid() es NULL o indefinido, la subconsulta no encuentra filas y COALESCE retorna false
    if (!authUid) {
      return false;
    }
    const exists = mockMfaFactors.some((factor) => factor.user_id === authUid && factor.status === 'verified');
    return Boolean(exists);
  }

  // Simulación de ejecución con InitPlan escalar y guarda explícita auth.uid() IS NOT NULL
  function executeQuery(authUser, jwtPayload, targetCompanyId = null) {
    publicUserHasMfaCalls = 0;

    // Guarda explícita de política RLS: auth.uid() IS NOT NULL
    const authUid = authUser?.id || null;
    const hasAuthUid = authUid !== null;

    // PostgreSQL InitPlan: El subquery escalar (SELECT public.user_has_mfa()) se evalúa UNA sola vez por query
    const userHasMfa = publicUserHasMfa(authUid);
    const isAAL2 = jwtPayload?.aal === 'aal2';

    // Cláusula USING completa:
    // auth.uid() IS NOT NULL AND ((auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa()))
    const passesRestrictive = hasAuthUid && (isAAL2 || !userHasMfa);

    if (!passesRestrictive) {
      // Bloqueado a nivel de plan/filtro restrictivo
      return { rows: [], callCount: publicUserHasMfaCalls };
    }

    // Filtrar filas según política permisiva (auth.uid() = user_id)
    const rows = mockUploads.filter((row) => {
      const passesPermissive = row.user_id === authUid;
      if (targetCompanyId && row.company_id !== targetCompanyId) return false;
      return passesPermissive;
    });

    return { rows, callCount: publicUserHasMfaCalls };
  }

  const userSinMfa = { id: 'usr-sin-mfa' };
  const userConMfa = { id: 'usr-con-mfa' };
  const userOtro = { id: 'usr-otro-cliente' };

  test('user_has_mfa() devuelve false cuando auth.uid() es NULL (NULL-safe con COALESCE)', () => {
    publicUserHasMfaCalls = 0;
    const resultNull = publicUserHasMfa(null);
    assert.strictEqual(resultNull, false, 'public.user_has_mfa() debe retornar boolean false cuando auth.uid() es NULL');

    const resultUndefined = publicUserHasMfa(undefined);
    assert.strictEqual(resultUndefined, false, 'public.user_has_mfa() debe retornar boolean false cuando auth.uid() es undefined');
  });

  test('Guarda explícita auth.uid() IS NOT NULL bloquea accesos no autenticados', () => {
    // Sesión anónima o sin auth.uid()
    const { rows } = executeQuery(null, null);
    assert.equal(rows.length, 0, 'Consulta sin auth.uid() debe retornar 0 filas debido a la guarda IS NOT NULL');
  });

  test('Usuario sin MFA: SELECT en AAL1 devuelve sus filas autorizadas [callCount === 1 (mock)]', () => {
    const jwtAAL1 = { aal: 'aal1', sub: userSinMfa.id };
    const { rows, callCount } = executeQuery(userSinMfa, jwtAAL1);

    // NOT (SELECT public.user_has_mfa()) es true -> acceso permitido en AAL1
    assert.equal(rows.length, 1, 'Usuario sin MFA debe poder acceder a sus uploads en AAL1');
    assert.equal(rows[0].id, 'upl-001');
    assert.equal(callCount, 1, 'callCount === 1 (mock): La función simulada debe evaluarse una sola vez por query');
  });

  test('Usuario con MFA enrolado: SELECT en AAL1 devuelve exactamente 0 filas [callCount === 1 (mock)]', () => {
    const jwtAAL1 = { aal: 'aal1', sub: userConMfa.id };
    const { rows, callCount } = executeQuery(userConMfa, jwtAAL1);

    // Al tener MFA verificado, NOT (SELECT public.user_has_mfa()) es false, exigiendo AAL2
    assert.equal(rows.length, 0, 'Usuario con MFA en AAL1 debe recibir 0 filas');
    assert.equal(callCount, 1, 'callCount === 1 (mock): La función simulada debe evaluarse una sola vez por query');
  });

  test('Usuario con MFA verificado: SELECT en AAL2 devuelve sus filas autorizadas', () => {
    const jwtAAL2 = { aal: 'aal2', sub: userConMfa.id };
    const { rows, callCount } = executeQuery(userConMfa, jwtAAL2);

    // Cumple (auth.jwt()->>'aal') = 'aal2'
    assert.equal(rows.length, 1, 'Usuario con token AAL2 accede exitosamente a sus uploads');
    assert.equal(rows[0].id, 'upl-002');
    assert.equal(callCount, 1);
  });

  test('Sesión en AAL2 no puede acceder a uploads de otras empresas/usuarios', () => {
    const jwtAAL2 = { aal: 'aal2', sub: userConMfa.id };
    const { rows } = executeQuery(userConMfa, jwtAAL2, 'comp-3');

    assert.equal(rows.length, 0, 'No debe acceder a uploads ajenos aun estando en AAL2');
  });
});
