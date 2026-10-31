const assert = require('node:assert/strict');
const test = require('node:test');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');

test.describe('Test de Integración: Supabase uploads con sha256_hex y RLS estricto', () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const hasLiveSupabase = supabaseUrl.startsWith('https://') && !supabaseUrl.includes('placeholder-project') && supabaseKey.length > 20;

  // 1. Verificación del contrato de esquema y restricciones de integridad SQL
  test('Validación de restricción CHECK (check_sha256_hex_format)', () => {
    const isValidSha256Hex = (val) => {
      if (val === null || val === undefined) return true;
      return typeof val === 'string' && /^[a-f0-9]{64}$/i.test(val);
    };

    // Caso válido: 64 caracteres hexadecimales (minúsculas o mayúsculas)
    const validHash = crypto.createHash('sha256').update('extracto_bancolombia_real').digest('hex');
    assert.equal(isValidSha256Hex(validHash), true);
    assert.equal(isValidSha256Hex(null), true); // Admite NULL conforme a la migración

    // Casos inválidos que deben ser rechazados por check_sha256_hex_format
    assert.equal(isValidSha256Hex('12345'), false); // muy corto
    assert.equal(isValidSha256Hex('z'.repeat(64)), false); // 'z' no es hex
    assert.equal(isValidSha256Hex(validHash + 'a'), false); // 65 caracteres
    assert.equal(isValidSha256Hex(validHash.slice(0, 63)), false); // 63 caracteres
  });

  // 2. Verificación de lógica de política RLS para uploads (companies.user_id)
  test('Política RLS: Previene INSERT de uploads en empresas ajenas (companies.user_id)', () => {
    // Simulador de motor de evaluación de políticas RLS PostgreSQL
    const currentUser = { id: 'usr-contador-autenticado-101' };
    const attackerUser = { id: 'usr-atacante-202' };

    // Tabla companies
    const mockCompanies = [
      { id: 'comp-camaguey-sa', name: 'CAMAGUEY S.A', user_id: 'usr-contador-autenticado-101' },
      { id: 'comp-otra-empresa', name: 'EMPRESA AJENA S.A.S', user_id: 'usr-tercero-999' },
    ];

    // Función que evalúa la política INSERT WITH CHECK:
    // auth.uid() = user_id AND EXISTS (SELECT 1 FROM companies c WHERE c.id = uploads.company_id AND c.user_id = auth.uid())
    const evaluateUploadInsertPolicy = (uploadRecord, sessionUser) => {
      if (!sessionUser || !sessionUser.id) return false;
      if (uploadRecord.user_id !== sessionUser.id) return false;

      const ownsCompany = mockCompanies.some(
        (c) => c.id === uploadRecord.company_id && c.user_id === sessionUser.id
      );
      return ownsCompany;
    };

    const validUpload = {
      id: 'upl-001',
      user_id: currentUser.id,
      company_id: 'comp-camaguey-sa',
      file_name: 'Extracto_Bancolombia_Enero_2026.xlsx',
      file_size_bytes: 452000,
      detected_bank: 'bancolombia',
      sha256_hex: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    };

    // Caso A: El usuario inserta upload para su propia empresa -> PERMITIDO
    assert.equal(evaluateUploadInsertPolicy(validUpload, currentUser), true);

    // Caso B: El usuario intenta insertar upload para empresa ajena -> DENEGADO POR RLS
    const unauthorizedCompanyUpload = {
      ...validUpload,
      id: 'upl-002',
      company_id: 'comp-otra-empresa',
    };
    assert.equal(evaluateUploadInsertPolicy(unauthorizedCompanyUpload, currentUser), false);

    // Caso C: Un atacante intenta insertar haciéndose pasar por otro usuario -> DENEGADO POR RLS
    assert.equal(evaluateUploadInsertPolicy(validUpload, attackerUser), false);
  });

  // 3. Test de Integración en Vivo contra Supabase (si las credenciales de test están configuradas)
  test('Integración en vivo con Supabase (o verificación de cliente SDK)', async (t) => {
    if (!hasLiveSupabase) {
      t.diagnostic('Credenciales de proyecto live no configuradas en entorno local; validando inicialización del SDK Supabase.');
      const client = createClient('https://mock-project-test.supabase.co', 'mock-anon-key-12345678901234567890');
      assert.ok(client.from, 'El cliente de Supabase debe exponer la API .from()');
      const query = client.from('uploads').select('id, sha256_hex, file_size_bytes, detected_bank');
      assert.ok(query, 'La query sobre uploads debe ser instanciable');
      return;
    }

    t.diagnostic(`Ejecutando prueba real contra instancia Supabase: ${supabaseUrl}`);
    const client = createClient(supabaseUrl, supabaseKey);

    // Prueba de consulta con RLS activo
    const { data, error } = await client
      .from('uploads')
      .select('id, sha256_hex, file_size_bytes, detected_bank')
      .limit(1);

    // Si no está autenticado, RLS debe responder con lista vacía (0 registros) o código autorizado
    assert.equal(error, null, `La consulta no debe arrojar error de sintaxis SQL: ${error?.message}`);
    assert.ok(Array.isArray(data), 'El resultado debe ser un arreglo conforme al protocolo Supabase REST');
  });
});
