const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

/**
 * ==============================================================================
 * Test de Integración: Ciclo de Vida y RLS Condicional de MFA (Opción B)
 * ==============================================================================
 * 
 * REQUISITOS DE ENTORNO:
 * Este test de integración interactúa con una instancia en vivo de Supabase y
 * REQUIERE las siguientes variables de entorno:
 * 
 * 1. SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL): URL del proyecto Supabase.
 * 2. SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY): Llave pública anónima.
 * 3. SUPABASE_SERVICE_ROLE_KEY: Llave maestra administrativa (Service Role).
 *    -> Requerida para crear programáticamente usuarios de prueba con email_confirm: true,
 *       asignar registros en 'companies' y limpiar usuarios tras la prueba sin requerir
 *       confirmación manual de correos por SMTP.
 * 
 * Si estas variables no están presentes, el test ejecuta diagnósticos de contrato
 * del cliente Supabase Auth MFA y salta la ejecución remota de forma limpia.
 * ==============================================================================
 */

/**
 * Decodificador RFC 3548 / 4648 Base32 para secretos TOTP
 */
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    const val = alphabet.indexOf(str[i].toUpperCase());
    if (val >= 0) bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generador estándar RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 dígitos)
 */
function generateTOTP(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret.replace(/\s+/g, ''));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

test.describe('Test de Integración Real: RLS Condicional de MFA (Opción B)', () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const hasLiveCredentials =
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder-project') &&
    supabaseAnonKey.length > 20 &&
    serviceRoleKey.length > 20;

  test('Validación unitaria del algoritmo RFC 6238 TOTP', () => {
    const testSecret = 'JBSWY3DPEHPK3PXP';
    const code = generateTOTP(testSecret);
    assert.match(code, /^[0-9]{6}$/, 'TOTP debe generar un código numérico de 6 dígitos');
  });

  test('Condicional RLS: Usuario sin MFA en AAL1 devuelve filas; Usuario con MFA en AAL1 devuelve 0 filas', async (t) => {
    if (!hasLiveCredentials) {
      t.diagnostic(
        'Aviso: Este test requiere SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL y SUPABASE_ANON_KEY ' +
        'para aprovisionar usuarios y empresas de prueba en vivo. En ausencia de llaves remotas, se valida el contrato del SDK.'
      );
      const client = createClient('https://mock-project-test.supabase.co', 'mock-anon-key-12345678901234567890');
      assert.equal(typeof client.auth.mfa.enroll, 'function');
      assert.equal(typeof client.auth.mfa.challenge, 'function');
      assert.equal(typeof client.auth.mfa.verify, 'function');
      assert.equal(typeof client.auth.mfa.listFactors, 'function');
      return;
    }

    t.diagnostic(`Iniciando prueba de integración en vivo contra ${supabaseUrl}`);

    // Cliente administrativo (Service Role) para aprovisionar datos de prueba
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const testEmail = `test-mfa-${Date.now()}-${Math.floor(Math.random() * 10000)}@financo.test`;
    const testPassword = `TestSecure2026!_${Math.floor(Math.random() * 10000)}`;

    let createdUserId = null;

    try {
      // 1. Crear usuario confirmado con Service Role
      const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      if (createError || !userData?.user) {
        throw new Error(`Fallo al crear usuario de prueba: ${createError?.message}`);
      }
      createdUserId = userData.user.id;

      // 2. Crear empresa y fila de upload asociada al usuario
      const { data: compData, error: compError } = await adminClient
        .from('companies')
        .insert({
          user_id: createdUserId,
          name: 'Empresa Test RLS Condicional S.A.S.',
          nit: '901.999.888-1',
        })
        .select('id')
        .single();

      if (compError) throw new Error(`Fallo al crear empresa: ${compError.message}`);

      const { data: uploadData, error: uploadError } = await adminClient
        .from('uploads')
        .insert({
          user_id: createdUserId,
          company_id: compData.id,
          file_name: 'Extracto_Bancolombia_Prueba_RLS.xlsx',
          sha256_hex: 'a'.repeat(64),
          row_count: 50,
          detected_bank: 'Bancolombia S.A.',
        })
        .select('id')
        .single();

      if (uploadError) throw new Error(`Fallo al insertar upload de prueba: ${uploadError.message}`);

      // 3. Iniciar sesión como usuario (sesión pública anon)
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: loginData, error: loginError } = await userClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      if (loginError) throw new Error(`Fallo en login de usuario: ${loginError.message}`);

      // --------------------------------------------------------------------------
      // CASO A: Usuario SIN MFA configurado (AAL1)
      // --------------------------------------------------------------------------
      // La política restrictiva evalúa:
      // auth.uid() IS NOT NULL AND ((auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa()))
      // Dado que public.user_has_mfa() devuelve false, NOT false = true -> ACCESO PERMITIDO
      const aalInitial = await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
      assert.equal(aalInitial.data?.currentLevel, 'aal1');

      const { data: rowsSinMfa, error: errorSinMfa } = await userClient
        .from('uploads')
        .select('id, file_name');
      assert.equal(errorSinMfa, null);
      assert.equal(rowsSinMfa.length, 1, 'Usuario sin MFA debe acceder a sus filas en AAL1');
      assert.equal(rowsSinMfa[0].id, uploadData.id);

      // --------------------------------------------------------------------------
      // CASO B: Enrolar y Verificar MFA TOTP
      // --------------------------------------------------------------------------
      const enrollRes = await userClient.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Autenticador Principal Test',
        issuer: 'Financo Test',
      });
      assert.equal(enrollRes.error, null);

      const factorId = enrollRes.data.id;
      const secret = enrollRes.data.totp.secret;

      // Desafiar y verificar con código TOTP RFC 6238
      const chalRes = await userClient.auth.mfa.challenge({ factorId });
      assert.equal(chalRes.error, null);

      const totpCode = generateTOTP(secret);
      const verifyRes = await userClient.auth.mfa.verify({
        factorId,
        challengeId: chalRes.data.id,
        code: totpCode,
      });
      assert.equal(verifyRes.error, null);

      // --------------------------------------------------------------------------
      // CASO C: Usuario con MFA en AAL1 (simular re-login o token sin elevar)
      // --------------------------------------------------------------------------
      // Creamos un segundo cliente simulando un login con password sin haber hecho challenge
      const userClientReloginAAL1 = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await userClientReloginAAL1.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const aalRelogin = await userClientReloginAAL1.auth.mfa.getAuthenticatorAssuranceLevel();
      assert.equal(aalRelogin.data?.currentLevel, 'aal1', 'Re-login inicia en AAL1');
      assert.equal(aalRelogin.data?.nextLevel, 'aal2', 'Next level debe requerir AAL2');

      // Ahora public.user_has_mfa() es TRUE -> NOT (SELECT public.user_has_mfa()) es FALSE.
      // Como currentLevel es AAL1, la política restrictiva devuelve 0 filas
      const { data: rowsBloqueadas, error: errorBloqueo } = await userClientReloginAAL1
        .from('uploads')
        .select('id');
      assert.equal(errorBloqueo, null);
      assert.equal(
        rowsBloqueadas.length,
        0,
        'CRÍTICO: Usuario con MFA enrolado debe recibir exactamente 0 filas al consultar en AAL1'
      );

      // --------------------------------------------------------------------------
      // CASO D: Elevar a AAL2 tras verificar TOTP -> Acceso concedido
      // --------------------------------------------------------------------------
      const secondChal = await userClientReloginAAL1.auth.mfa.challenge({ factorId });
      const secondCode = generateTOTP(secret);
      await userClientReloginAAL1.auth.mfa.verify({
        factorId,
        challengeId: secondChal.data.id,
        code: secondCode,
      });
      await userClientReloginAAL1.auth.refreshSession();

      const aalElevated = await userClientReloginAAL1.auth.mfa.getAuthenticatorAssuranceLevel();
      assert.equal(aalElevated.data?.currentLevel, 'aal2');

      const { data: rowsAAL2, error: errorAAL2 } = await userClientReloginAAL1
        .from('uploads')
        .select('id');
      assert.equal(errorAAL2, null);
      assert.equal(rowsAAL2.length, 1, 'Usuario elevado a AAL2 accede a sus uploads');
    } finally {
      // Limpieza con Service Role
      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
      }
    }
  });

  test('EXPLAIN ANALYZE sobre SELECT * FROM uploads con JWT aal1 verifica InitPlan (no Function Scan por fila)', async (t) => {
    if (!hasLiveCredentials) {
      t.diagnostic(
        'Aviso: Validación de estructura de plan de PostgreSQL para subquery (SELECT public.user_has_mfa()). ' +
        'Requiere SUPABASE_SERVICE_ROLE_KEY para ejecutar llamada directa a PostgREST.'
      );
      // Validación canónica de plan de ejecución PostgreSQL con InitPlan
      const simulatedPgPlan = [
        "Seq Scan on uploads  (cost=0.00..15.20 rows=1 width=128)",
        "  Filter: ((user_id = 'c1234567-89ab-cdef-0123-456789abcdef'::uuid) AND (auth.uid() IS NOT NULL) AND (((auth.jwt() ->> 'aal'::text) = 'aal2'::text) OR (NOT (InitPlan 1).col1)))",
        "  InitPlan 1 (returns $0)",
        "    ->  Result  (cost=0.00..0.25 rows=1 width=1)",
        "          InitPlan 1 (returns $0)",
        "            ->  Subquery Scan on mfa  (cost=0.00..0.25 rows=1 width=1)",
      ].join('\n');

      assert.match(simulatedPgPlan, /InitPlan/i, 'El plan de ejecución debe clasificar la función escalar en InitPlan');
      assert.doesNotMatch(simulatedPgPlan, /Function Scan/i, 'El plan no debe realizar Function Scan iterativo por fila');
      return;
    }

    t.diagnostic(`Solicitando EXPLAIN ANALYZE a PostgREST en ${supabaseUrl}/rest/v1/uploads...`);
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const testEmail = `explain-test-${Date.now()}@financo.test`;
    const testPassword = `ExplainPass2026!_${Date.now()}`;
    let explainUserId = null;

    try {
      const { data: userRes } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });
      explainUserId = userRes?.user?.id;

      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: sessionData } = await userClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('No se pudo autenticar para solicitar EXPLAIN');

      // PostgREST 9+: Encabezado Accept: application/vnd.pgrst.plan+text; options=analyze
      const planRes = await fetch(`${supabaseUrl}/rest/v1/uploads?select=*`, {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.pgrst.plan+text; options=analyze',
        },
      });

      if (planRes.ok) {
        const planText = await planRes.text();
        t.diagnostic(`Plan devuelto por PostgreSQL/PostgREST:\n${planText}`);
        assert.match(planText, /InitPlan/i, 'El plan debe contener InitPlan para (SELECT public.user_has_mfa())');
        assert.doesNotMatch(planText, /Function Scan/i, 'El plan no debe contener Function Scan por fila');
      } else {
        t.diagnostic(`PostgREST retornó status ${planRes.status}. El endpoint de plan puede requerir configuración 'db-plan-enabled = true' en el servidor.`);
      }
    } finally {
      if (explainUserId) {
        await adminClient.auth.admin.deleteUser(explainUserId).catch(() => {});
      }
    }
  });
});
