const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

function loadTypeScript(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  const errors = (diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `Could not transpile ${relativePath}`);

  const loadedModule = { exports: {} };
  const localRequire = createRequire(filename);
  const customRequire = (id) => {
    if (id.startsWith('.')) {
      const dir = path.dirname(filename);
      const possiblePaths = [
        path.resolve(dir, id),
        path.resolve(dir, id + '.ts'),
        path.resolve(dir, id + '.tsx'),
        path.resolve(dir, id, 'index.ts'),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const rel = path.relative(projectRoot, p);
          return loadTypeScript(rel);
        }
      }
    }
    return localRequire(id);
  };

  const fn = new Function('require', 'module', 'exports', outputText);
  fn(customRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const {
  detectHeaderRow,
  detectBankFromMembrete,
  NORMALIZED_RULES,
  BANK_OFFICIAL_DATA,
} = loadTypeScript('lib/reconciliation/bank-header-detector.ts');

const {
  validateFileSize,
  computeFileSHA256,
} = loadTypeScript('lib/crypto/file-integrity.ts');

test.describe('Detector Dinámico de Cabeceras Bancarias (Node Native Test Runner)', () => {
  test('Bancolombia: detecta por NIT 890.903.938 y localiza cabecera tras 7 filas de membrete', () => {
    const bancolombiaFixture = [
      ['BANCOLOMBIA S.A.', '', '', '', ''],
      ['NIT: 890.903.938-8', '', '', '', ''],
      ['Cuenta Corriente No:', '890-100026-11', '', '', ''],
      ['Titular:', 'CAMAGUEY S.A', '', '', ''],
      ['Periodo:', 'Desde: 01/01/2026', 'Hasta: 31/01/2026', '', ''],
      ['Saldo Inicial:', '12500000.00', '', '', ''],
      ['', '', '', '', ''], // Fila vacía
      // Fila 7: Cabecera real
      ['FECHA', 'DESCRIPCIÓN OPERACIÓN', 'DOCUMENTO', 'VALOR MOVIMIENTO', 'SALDO'],
      ['02/01/2026', 'PAGO PROVEEDORES CARNES', 'TRX-10928', '-3500000', '9000000'],
      ['03/01/2026', 'GRAVAMEN MOVIMIENTO FINANCIERO 4X1000', 'GMF-01', '-14000', '8986000'],
    ];

    const bankDetection = detectBankFromMembrete(bancolombiaFixture);
    assert.equal(bankDetection.bank, 'bancolombia');
    assert.equal(bankDetection.detectedNit, '890.903.938-8');

    const result = detectHeaderRow(bancolombiaFixture);
    assert.equal(result.headerRowIndex, 7);
    assert.equal(result.detectedBank, 'bancolombia');
    assert.equal(result.mappedColumns.dateColumnIndex, 0);
    assert.equal(result.mappedColumns.descriptionColumnIndex, 1);
    assert.equal(result.mappedColumns.referenceColumnIndex, 2);
    assert.equal(result.mappedColumns.amountColumnIndex, 3);
    assert.equal(result.mappedColumns.balanceColumnIndex, 4);
    assert.ok(result.confidenceScore >= 100);
  });

  test('Davivienda: detecta por NIT 860.034.313 y mapea columnas con acentos y variaciones', () => {
    const daviviendaFixture = [
      ['BANCO DAVIVIENDA S.A.', 'NIT: 860.034.313-7'],
      ['EXTRACTO INTEGRAL DE CUENTAS'],
      ['CLIENTE: CAMAGUEY S.A'],
      ['OFICINA: BARRANQUILLA CENTRO'],
      // Fila 4: Cabecera
      ['Fec. Transacción', 'Concepto / Detalle', 'No. Comprobante', 'Monto', 'Saldo Final'],
      ['2026-01-05', 'TRANSFERENCIA RECIBIDA BANCOLOMBIA', '8812901', '4500000.00', '14500000.00'],
    ];

    const bankDetection = detectBankFromMembrete(daviviendaFixture);
    assert.equal(bankDetection.bank, 'davivienda');

    const result = detectHeaderRow(daviviendaFixture);
    assert.equal(result.headerRowIndex, 4);
    assert.equal(result.detectedBank, 'davivienda');
    assert.equal(result.mappedColumns.dateColumnIndex, 0);
    assert.equal(result.mappedColumns.descriptionColumnIndex, 1);
    assert.equal(result.mappedColumns.referenceColumnIndex, 2);
    assert.equal(result.mappedColumns.amountColumnIndex, 3);
    assert.equal(result.mappedColumns.balanceColumnIndex, 4);
  });

  test('Banco de Bogotá: detecta por NIT 860.002.964-4 y cabecera de movimientos', () => {
    const bogotaFixture = [
      ['BANCO DE BOGOTA S.A.', 'NIT 860.002.964-4', 'GRUPO AVAL'],
      ['MOVIMIENTOS HISTORICOS DE LA CUENTA'],
      ['CUENTA CORRIENTE: 031-99812-4'],
      // Fila 3: Cabecera
      ['Fecha Operación', 'Detalle de la Transacción', 'Referencia', 'Valor', 'Saldo Disponible'],
      ['15/01/2026', 'NOTA DEBITO COMISION CHEQUERA', 'ND-99012', '-48500', '3200000'],
    ];

    const bankDetection = detectBankFromMembrete(bogotaFixture);
    assert.equal(bankDetection.bank, 'bogota');

    const result = detectHeaderRow(bogotaFixture);
    assert.equal(result.headerRowIndex, 3);
    assert.equal(result.detectedBank, 'bogota');
    assert.equal(result.mappedColumns.dateColumnIndex, 0);
    assert.equal(result.mappedColumns.descriptionColumnIndex, 1);
    assert.equal(result.mappedColumns.referenceColumnIndex, 2);
    assert.equal(result.mappedColumns.amountColumnIndex, 3);
  });

  test('Lanza excepción en español si faltan columnas financieras canónicas', () => {
    const noFinancialFixture = [
      ['LISTADO DE PROVEEDORES ACTIVOS'],
      ['RAZON SOCIAL', 'CIUDAD', 'TELEFONO'],
      ['CARNES DEL NORTE', 'BARRANQUILLA', '3001234567'],
    ];

    assert.throws(
      () => detectHeaderRow(noFinancialFixture),
      (err) => {
        assert.match(err.message, /No se pudo identificar la fila de cabecera bancaria/i);
        return true;
      }
    );
  });
});

test.describe('Validación de Límite de Tamaño de Archivo (25 MB)', () => {
  test('Archivos menores o iguales a 25 MB son aprobados', () => {
    const file = { name: 'extracto_mensual.xlsx', size: 10 * 1024 * 1024 };
    const res = validateFileSize(file);
    assert.equal(res.valid, true);
    assert.equal(res.error, undefined);
  });

  test('Archivos superiores a 25 MB son rechazados con mensaje en español', () => {
    const file = { name: 'extracto_gigante.xlsx', size: 26.5 * 1024 * 1024 };
    const res = validateFileSize(file);
    assert.equal(res.valid, false);
    assert.match(res.error, /supera el límite máximo permitido de 25 MB/i);
    assert.match(res.error, /26.5 MB/i);
  });
});
