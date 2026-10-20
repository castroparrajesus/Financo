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

  new Function('require', 'module', 'exports', outputText)(
    customRequire,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}


const parser = loadTypeScript('lib/reconciliation/file-parser.ts');
const engine = loadTypeScript('lib/reconciliation/engine.ts');
const validator = loadTypeScript('lib/reconciliation/validator.ts');

test('normalizes Colombian amounts, negative values, dates and identifiers', () => {
  assert.equal(engine.normalizeAmount('$ 1.200.000'), 1_200_000);
  assert.equal(engine.normalizeAmount('1.234,56'), 1_234.56);
  assert.equal(engine.normalizeAmount('(350.000)'), -350_000);
  assert.equal(engine.normalizeDate('07/10/2026'), '2026-10-07');
  assert.equal(engine.normalizeDate('2026-10-07'), '2026-10-07');
  assert.equal(engine.normalizeIdentifier(' 0079.123.456-7 '), '791234567');
});

test('detects headers after junk rows, discards control rows and extracts metadata', async () => {
  const xlsx = require('xlsx');
  const sheet = xlsx.utils.aoa_to_sheet([
    ['Cuenta contable: 11100501 Bancolombia Cta 9876543210'],
    ['Saldo inicial: 83.012.932,09'],
    ['Fecha', 'Comprobante', 'Tercero', 'NIT', 'Débito', 'Crédito'],
    ['07/10/2026', 'RC-01', 'Juan Perez', '0079.123.456-7', '350.000', '0'],
    ['08/10/2026', 'CE-02', 'Proveedor Norte', '900123456', '0', '120.000'],
    ['Total general', '', '', '', '350.000', '120.000'],
    ['Procesado en software contable v2'],
  ]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, 'Auxiliar');
  const bytes = xlsx.write(workbook, { type: 'array', bookType: 'xlsx' });
  const parsed = parser.parseBuffer(bytes);

  // Exactly 2 genuine data rows (discards Cuenta contable, Total general, Procesado en)
  assert.equal(parsed.totalRows, 2);
  assert.equal(parsed.detectedHeaderRow, 2);
  assert.ok(parsed.metadata.ledgerAccount.includes('11100501'));

  const mapping = engine.detectColumns(parsed.headers);
  const normalized = engine.normalizeRows(parsed.rows, mapping, 'L');
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].amount, 350_000);
  assert.equal(normalized[1].amount, -120_000); // Debito - Credito
});

test('enforces row conservation: each row gets row_id and exactly one outcome', () => {
  const bankRows = [
    { rowId: 'B-001', date: '2026-10-01', amount: 100_000, identifier: '9001', name: 'Cliente Uno', reference: 'R-1', raw: {}, rowIndex: 0 },
    { rowId: 'B-002', date: '2026-10-01', amount: 50_000, identifier: '', name: 'Pago sin NIT', reference: '', raw: {}, rowIndex: 1 },
    { rowId: 'B-003', date: '2026-10-01', amount: 80_000, identifier: '9999', name: 'Sin cliente', reference: '', raw: {}, rowIndex: 2 },
  ];
  const ledgerRows = [
    { rowId: 'L-001', date: '2026-10-01', amount: 100_000, identifier: '9001', name: 'Cliente Uno', reference: 'R-1', raw: {}, rowIndex: 0 },
  ];

  const result = engine.reconcile(bankRows, ledgerRows, {
    tolerancePercent: 0,
    enableFuzzy: false,
    checkDuplicates: true,
  });

  assert.equal(result.summary.reconciled, 1);
  assert.equal(result.summary.exceptions, 2);
  assert.equal(result.summary.totalBank, 3);
  assert.equal(result.summary.totalLedger, 1);

  // B-001 matched with L-001
  assert.equal(result.matches[0].rowIdBank, 'B-001');
  assert.equal(result.matches[0].rowIdLedger, 'L-001');

  // B-002 and B-003 are banco_sin_libro
  assert.equal(result.matches[1].exceptionType, 'banco_sin_libro');
  assert.equal(result.matches[2].exceptionType, 'banco_sin_libro');
});

test('pairs repeated amounts (4 x $2M and 2 x $1M) with receipts of same date', () => {
  const bankRows = [
    { rowId: 'B-01', date: '2026-01-10', amount: 2_000_000, name: 'CONSIG LOCAL CAJ', raw: {}, rowIndex: 0 },
    { rowId: 'B-02', date: '2026-01-18', amount: 2_000_000, name: 'TRANSFERENCIA', raw: {}, rowIndex: 1 },
    { rowId: 'B-03', date: '2026-01-20', amount: 2_000_000, name: 'TRANSFERENCIA', raw: {}, rowIndex: 2 },
    { rowId: 'B-04', date: '2026-01-23', amount: 2_000_000, name: 'TRANSFERENCIA', raw: {}, rowIndex: 3 },
    { rowId: 'B-05', date: '2026-01-27', amount: 1_000_000, name: 'TRANSFERENCIA', raw: {}, rowIndex: 4 },
    { rowId: 'B-06', date: '2026-01-29', amount: 1_000_000, name: 'TRANSFERENCIA', raw: {}, rowIndex: 5 },
  ];

  const ledgerRows = [
    { rowId: 'L-01', date: '2026-01-10', amount: 2_000_000, voucher: 'RC-101', name: 'CLIENTE A', raw: {}, rowIndex: 0 },
    { rowId: 'L-02', date: '2026-01-18', amount: 2_000_000, voucher: 'RC-102', name: 'CLIENTE B', raw: {}, rowIndex: 1 },
    { rowId: 'L-03', date: '2026-01-20', amount: 2_000_000, voucher: 'RC-103', name: 'CLIENTE C', raw: {}, rowIndex: 2 },
    { rowId: 'L-04', date: '2026-01-23', amount: 2_000_000, voucher: 'RC-104', name: 'CLIENTE D', raw: {}, rowIndex: 3 },
    { rowId: 'L-05', date: '2026-01-27', amount: 1_000_000, voucher: 'RC-105', name: 'CLIENTE E', raw: {}, rowIndex: 4 },
    { rowId: 'L-06', date: '2026-01-29', amount: 1_000_000, voucher: 'RC-106', name: 'CLIENTE F', raw: {}, rowIndex: 5 },
  ];

  const result = engine.reconcile(bankRows, ledgerRows, {
    tolerancePercent: 0,
    enableFuzzy: false,
    checkDuplicates: false,
  });

  // All 6 must be reconciled without being blocked by "unique amount"
  assert.equal(result.summary.reconciled, 6);
  assert.equal(result.summary.exceptions, 0);

  // Each bank row matched with receipt of the exact same date
  for (let i = 0; i < 6; i++) {
    const match = result.matches.find((m) => m.rowIdBank === bankRows[i].rowId);
    assert.ok(match, `Match found for ${bankRows[i].rowId}`);
    assert.equal(match.bankDate, match.ledgerDate);
    assert.equal(match.rowIdLedger, ledgerRows[i].rowId);
  }
});

test('handles date window tolerance and proposes suggestion when date is outside window', () => {
  const bankRows = [
    { rowId: 'B-01', date: '2026-01-08', amount: -14_900, name: 'CUOTA MANEJO TRJ DEB 01 26', raw: {}, rowIndex: 0 },
  ];
  const ledgerRows = [
    { rowId: 'L-01', date: '2026-01-30', amount: -14_900, voucher: 'ND-50', name: 'Bancolombia Cuota', raw: {}, rowIndex: 0 },
  ];

  const result = engine.reconcile(bankRows, ledgerRows, {
    tolerancePercent: 0,
    toleranceDays: 3,
    enableFuzzy: true,
    checkDuplicates: false,
  });

  // 22 days of difference -> Propose as suggestion (confidence 85, outside window)
  assert.equal(result.summary.reconciled, 0);
  assert.equal(result.summary.suggestions, 1);
  const match = result.matches[0];
  assert.equal(match.status, 'suggestion');
  assert.equal(match.exceptionType, 'fecha_fuera_ventana');
  assert.equal(match.daysDiff, 22);
  assert.ok(match.confidence < 95);
});

test('groups n:1 bank lines by concept and reconciles against consolidated ledger entry', () => {
  // 14 lines of GMF
  const gmfBankRows = Array.from({ length: 14 }, (_, i) => ({
    rowId: `B-GMF-${i + 1}`,
    date: `2026-01-${String(i + 2).padStart(2, '0')}`,
    amount: -4_388.599, // total = -61.440,39
    name: 'IMPTO GOBIERNO 4X1000',
    raw: {},
    rowIndex: i,
  }));
  const currentSum = gmfBankRows.slice(0, 13).reduce((acc, r) => acc + r.amount, 0);
  gmfBankRows[13].amount = Number((-61_440.39 - currentSum).toFixed(2));

  // 22 lines of interest
  const interestBankRows = Array.from({ length: 22 }, (_, i) => ({
    rowId: `B-INT-${i + 1}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    amount: 16.1727,
    name: 'ABONO INTERESES AHORROS',
    raw: {},
    rowIndex: 14 + i,
  }));
  const currentIntSum = interestBankRows.slice(0, 21).reduce((acc, r) => acc + r.amount, 0);
  interestBankRows[21].amount = Number((355.80 - currentIntSum).toFixed(2));

  // Ledger entries (consolidated monthly entries)
  const ledgerRows = [
    { rowId: 'L-GMF', date: '2026-01-31', amount: -61_440.39, voucher: 'CC-01', name: 'GMF Enero 2026', raw: {}, rowIndex: 0 },
    { rowId: 'L-INT', date: '2026-01-31', amount: 355.80, voucher: 'CC-02', name: 'Rendimientos Financieros', raw: {}, rowIndex: 1 },
  ];

  const result = engine.reconcile([...gmfBankRows, ...interestBankRows], ledgerRows, {
    tolerancePercent: 0,
    enableFuzzy: false,
    checkDuplicates: false,
  });

  // Exactly 2 groups reconciled
  assert.equal(result.groups.length, 2);
  assert.ok(result.groups.every((g) => g.status === 'reconciled'));
  assert.equal(result.groups[0].bankRows.length, 14);
  assert.equal(result.groups[0].totalBankAmount, -61_440.39);
  assert.equal(result.groups[1].bankRows.length, 22);
  assert.equal(result.groups[1].totalBankAmount, 355.80);

  // Summary reflects the 36 bank rows reconciled via group
  assert.equal(result.summary.reconciled, 36);
  assert.equal(result.summary.exceptions, 0);
});

test('case January 2026: produces 22 1:1 matches, 2 n:1 groups, 46 bank exceptions, 5 ledger exceptions and $0 final difference', () => {
  // Construct the exact January 2026 scenario
  // 1. Bank Rows (104 total)
  const bankRows = [];

  // 8 receipts:
  bankRows.push({ rowId: 'B-01', date: '2026-01-06', amount: 10_000_000, name: 'CONSIG NACIONAL EFECTIVO' });
  bankRows.push({ rowId: 'B-02', date: '2026-01-08', amount: 1_451_000, name: 'TRANSFERENCIA CTA SUC VIRTUAL' });
  bankRows.push({ rowId: 'B-03', date: '2026-01-10', amount: 2_000_000, name: 'CONSIG LOCAL CAJ' });
  bankRows.push({ rowId: 'B-04', date: '2026-01-18', amount: 2_000_000, name: 'TRANSFERENCIA CTA SUC VIRTUAL' });
  bankRows.push({ rowId: 'B-05', date: '2026-01-20', amount: 2_000_000, name: 'TRANSFERENCIA CTA SUC VIRTUAL' });
  bankRows.push({ rowId: 'B-06', date: '2026-01-23', amount: 2_000_000, name: 'TRANSFERENCIA CTA SUC VIRTUAL' });
  bankRows.push({ rowId: 'B-07', date: '2026-01-27', amount: 1_000_000, name: 'TRANSFERENCIA CTA SUC VIRTUAL' });
  bankRows.push({ rowId: 'B-08', date: '2026-01-29', amount: 1_000_000, name: 'TRANSFERENCIA CTA SUC VIRTUAL' });

  // 13 card payments with brand names:
  const cardPayments = [
    { date: '2026-01-03', amount: -285_908, name: 'COMPRA EN SUPERTIEND' },
    { date: '2026-01-05', amount: -266_500, name: 'COMPRA EN KOAJ' },
    { date: '2026-01-09', amount: -491_463, name: 'COMPRA EN SUPERTIEND' },
    { date: '2026-01-14', amount: -161_540, name: 'COMPRA EN SUPERTIEND' },
    { date: '2026-01-14', amount: -1_369_900, name: 'COMPRA EN SUPERTIEND' },
    { date: '2026-01-16', amount: -284_789, name: 'COMPRA EN MEGATIENDA' },
    { date: '2026-01-16', amount: -259_882, name: 'COMPRA EN TIENDAS AR' },
    { date: '2026-01-20', amount: -336_500, name: 'COMPRA EN EL GIGANTE' },
    { date: '2026-01-21', amount: -94_410, name: 'COMPRA EN SUPERTIEND' },
    { date: '2026-01-26', amount: -369_560, name: 'COMPRA EN MAKRO CART' },
    { date: '2026-01-26', amount: -502_400, name: 'COMPRA EN HOMECENTER' },
    { date: '2026-01-30', amount: -1_298_828, name: 'COMPRA EN EXITO CAST' },
    { date: '2026-01-30', amount: -69_990, name: 'COMPRA EN CALZACOSTA' },
  ];
  cardPayments.forEach((p, idx) => bankRows.push({ rowId: `B-CARD-${idx + 1}`, ...p }));

  // 1 fee (22 days difference):
  bankRows.push({ rowId: 'B-FEE-01', date: '2026-01-08', amount: -14_900, name: 'CUOTA MANEJO TRJ DEB 01 26' });

  // 14 lines of GMF summing -61.440,39:
  const gmfAmounts = [-8, -3894, -1099, -2065, -240, -14552, -1561, -4566, -11874, -1465, -4256, -10000, -384, -5476.39];
  gmfAmounts.forEach((amt, idx) => bankRows.push({ rowId: `B-GMF-${idx + 1}`, date: '2026-01-15', amount: amt, name: 'IMPTO GOBIERNO 4X1000' }));

  // 22 lines of interest summing 355,80:
  const intAmounts = [2, 2, 1, 0, 28, 16, 0, 15, 36, 36, 13, 12, 21, 27, 12, 23, 43, 13, 14, 11, 12, 20];
  const currentIntSum = intAmounts.slice(0, 21).reduce((acc, r) => acc + r, 0);
  intAmounts[21] = Number((355.80 - currentIntSum).toFixed(2));
  intAmounts.forEach((amt, idx) => bankRows.push({ rowId: `B-INT-${idx + 1}`, date: '2026-01-20', amount: amt, name: 'ABONO INTERESES AHORROS' }));

  // 46 unrecorded bank exceptions:
  // 3 cash withdrawals:
  bankRows.push({ rowId: 'B-RET-01', date: '2026-01-14', amount: -2_000_000, name: 'RETIRO CAJERO' });
  bankRows.push({ rowId: 'B-RET-02', date: '2026-01-20', amount: -2_500_000, name: 'RETIRO CAJERO' });
  bankRows.push({ rowId: 'B-RET-03', date: '2026-01-28', amount: -2_500_000, name: 'RETIRO CAJERO' });

  // 30 Google purchases totaling -410.419,40:
  const googleTotal = -410_419.40;
  for (let i = 0; i < 29; i++) {
    bankRows.push({ rowId: `B-GOOG-${i + 1}`, date: '2026-01-15', amount: -13680.64, name: 'COMPRA INTL Google Poppo MICO' });
  }
  const currentGoogle = bankRows.filter((r) => r.name.includes('Google')).reduce((a, b) => a + b.amount, 0);
  bankRows.push({ rowId: 'B-GOOG-30', date: '2026-01-15', amount: Number((googleTotal - currentGoogle).toFixed(2)), name: 'COMPRA INTL Google Poppo MICO' });

  // 13 unrecorded card purchases totaling -2.143.117:
  const unrecTotal = -2_143_117.00;
  for (let i = 0; i < 12; i++) {
    bankRows.push({ rowId: `B-UNREC-${i + 1}`, date: '2026-01-25', amount: -164855.15, name: 'COMPRA EN EDS MATAGU GAS' });
  }
  const currentUnrec = bankRows.filter((r) => r.name.includes('MATAGU GAS')).reduce((a, b) => a + b.amount, 0);
  bankRows.push({ rowId: 'B-UNREC-13', date: '2026-01-25', amount: Number((unrecTotal - currentUnrec).toFixed(2)), name: 'COMPRA EN EDS MATAGU GAS' });

  // Total bank rows: 8 + 13 + 1 + 14 + 22 + 3 + 30 + 13 = 104 rows!
  assert.equal(bankRows.length, 104);

  // 2. Ledger Rows (29 total movements)
  const ledgerRows = [];
  // 8 receipts matching same dates:
  ledgerRows.push({ rowId: 'L-01', date: '2026-01-06', amount: 10_000_000, voucher: 'RC-01', name: 'CLIENTE 1' });
  ledgerRows.push({ rowId: 'L-02', date: '2026-01-08', amount: 1_451_000, voucher: 'RC-02', name: 'CLIENTE 2' });
  ledgerRows.push({ rowId: 'L-03', date: '2026-01-10', amount: 2_000_000, voucher: 'RC-03', name: 'CLIENTE 3' });
  ledgerRows.push({ rowId: 'L-04', date: '2026-01-18', amount: 2_000_000, voucher: 'RC-04', name: 'CLIENTE 4' });
  ledgerRows.push({ rowId: 'L-05', date: '2026-01-20', amount: 2_000_000, voucher: 'RC-05', name: 'CLIENTE 5' });
  ledgerRows.push({ rowId: 'L-06', date: '2026-01-23', amount: 2_000_000, voucher: 'RC-06', name: 'CLIENTE 6' });
  ledgerRows.push({ rowId: 'L-07', date: '2026-01-27', amount: 1_000_000, voucher: 'RC-07', name: 'CLIENTE 7' });
  ledgerRows.push({ rowId: 'L-08', date: '2026-01-29', amount: 1_000_000, voucher: 'RC-08', name: 'CLIENTE 8' });

  // 13 card payments in ledger:
  const cardLedger = [
    { date: '2026-01-03', amount: -285_908, voucher: 'CE-10', name: 'SUPERTIENDAS OLIMPICA' },
    { date: '2026-01-05', amount: -266_500, voucher: 'CE-11', name: 'KOAJ DANUBIO' },
    { date: '2026-01-10', amount: -491_463, voucher: 'CE-12', name: 'SUPERTIENDAS OLIMPICA' }, // 1 day diff
    { date: '2026-01-14', amount: -161_540, voucher: 'CE-13', name: 'SUPERTIENDAS OLIMPICA' },
    { date: '2026-01-14', amount: -1_369_900, voucher: 'CE-14', name: 'SUPERTIENDAS OLIMPICA' },
    { date: '2026-01-16', amount: -284_789, voucher: 'CE-15', name: 'MEGATIENDA SAS' },
    { date: '2026-01-16', amount: -259_882, voucher: 'CE-16', name: 'TIENDAS ARA JERONIMO' },
    { date: '2026-01-20', amount: -336_500, voucher: 'CE-17', name: 'EL GIGANTE DEL HOGAR' },
    { date: '2026-01-21', amount: -94_410, voucher: 'CE-18', name: 'SUPERTIENDAS OLIMPICA' },
    { date: '2026-01-26', amount: -369_560, voucher: 'CE-19', name: 'MAKRO CARTAGENA' },
    { date: '2026-01-26', amount: -502_400, voucher: 'CE-20', name: 'HOMECENTER SODIMAC' },
    { date: '2026-01-30', amount: -1_298_828, voucher: 'CE-21', name: 'EXITO CASTILLA' },
    { date: '2026-01-30', amount: -69_990, voucher: 'CE-22', name: 'CALZACOSTA SAS' },
  ];
  cardLedger.forEach((c, idx) => ledgerRows.push({ rowId: `L-CARD-${idx + 1}`, ...c }));

  // 1 fee in ledger on Jan 30 (bank on Jan 8 -> 22 days diff):
  ledgerRows.push({ rowId: 'L-FEE-01', date: '2026-01-30', amount: -14_900, voucher: 'CE-23', name: 'Bancolombia Cuota Manejo' });

  // 2 consolidated ledger entries for groups:
  ledgerRows.push({ rowId: 'L-GRP-GMF', date: '2026-01-31', amount: -61_440.39, voucher: 'CC-01', name: 'GMF Enero 4x1000' });
  ledgerRows.push({ rowId: 'L-GRP-INT', date: '2026-01-31', amount: 355.80, voucher: 'CC-02', name: 'Rendimientos Ahorros Intereses' });

  // 5 unrecorded ledger exceptions:
  ledgerRows.push({ rowId: 'L-UNREC-01', date: '2026-01-02', amount: 50_000_000, voucher: 'RC-100', name: 'DESEMBOLSO CREDITO' });
  ledgerRows.push({ rowId: 'L-UNREC-02', date: '2026-01-12', amount: 983_333, voucher: 'RC-1-109', name: 'CLIENTE ESPECIAL' });
  ledgerRows.push({ rowId: 'L-UNREC-03', date: '2026-01-14', amount: -71_750.05, voucher: 'CE-30', name: 'NAUTIAGRO S.A.S' });
  ledgerRows.push({ rowId: 'L-UNREC-04', date: '2026-01-21', amount: -709_900, voucher: 'CE-31', name: 'SODIMAC COLOMBIA S.A' });
  ledgerRows.push({ rowId: 'L-UNREC-05', date: '2026-01-21', amount: -377_000, voucher: 'CE-32', name: 'TANQUES Y MANGUERAS' });

  // Total ledger rows: 8 + 13 + 1 + 2 + 5 = 29 rows!
  assert.equal(ledgerRows.length, 29);

  // Metadata for balances (Valores reales de enero 2026):
  // Extracto: saldo anterior 1.356.074,49 | total abonos 21.451.355,82 | total cargos 15.421.546,81 | saldo final 7.385.883,50 | movimiento neto 6.029.809,01
  // Libro: saldo inicial 84.369.006,58 | débitos 72.434.688,80 | créditos 7.026.660,44 | saldo final 149.777.034,94
  const metadata = {
    bankPreviousBalance: 1_356_074.49,
    bankCurrentBalance: 7_385_883.50,
    bankTotalCredits: 21_451_355.82,
    bankTotalDebits: 15_421_546.81,
    ledgerInitialBalance: 84_369_006.58,
    ledgerFinalBalance: 149_777_034.94,
    ledgerTotalDebits: 72_434_688.80,
    ledgerTotalCredits: 7_026_660.44,
    companyName: 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC SAS',
    companyNit: '901883418-1',
    period: 'Enero 2026',
    ledgerAccount: '11100501 Bancolombia',
  };

  const result = engine.reconcile(bankRows, ledgerRows, {
    tolerancePercent: 0,
    toleranceDays: 5,
    enableFuzzy: true,
    checkDuplicates: false,
    metadata,
  });

  // Check 1: Exactly 22 1:1 pairs (21 direct + 1 cuota de manejo with 22 days diff)
  const oneToOnePairs = result.matches.filter((m) => m.rowIdBank && m.rowIdLedger);
  assert.equal(oneToOnePairs.length, 22);

  // Check 2: Exactly 2 n:1 groups (36 bank rows total)
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].bankRows.length, 14); // GMF: 14 lines
  assert.equal(result.groups[0].totalBankAmount, -61_440.39);
  assert.equal(result.groups[1].bankRows.length, 22); // Intereses: 22 lines
  assert.equal(result.groups[1].totalBankAmount, 355.80);

  // Check 3: Exactly 46 bank exceptions (banco_sin_libro)
  const bankExceptions = result.matches.filter((m) => m.exceptionType === 'banco_sin_libro');
  assert.equal(bankExceptions.length, 46);

  // Check 4: Exactly 5 ledger exceptions (libro_sin_banco)
  const ledgerExceptions = result.matches.filter((m) => m.exceptionType === 'libro_sin_banco');
  assert.equal(ledgerExceptions.length, 5);

  // Check 5: Conservation of bank rows: 22 (1:1) + 36 (groups) + 46 (exceptions) = 104
  const bankMatchedIn1to1 = oneToOnePairs.length;
  const bankMatchedInGroups = result.groups.reduce((acc, g) => acc + g.bankRows.length, 0);
  assert.equal(bankMatchedIn1to1 + bankMatchedInGroups + bankExceptions.length, 104);

  // Check 6: Conservation of ledger rows: 22 (1:1) + 2 (groups) + 5 (exceptions) = 29
  const ledgerMatchedInGroups = result.groups.reduce((acc, g) => acc + g.ledgerRows.length, 0);
  assert.equal(bankMatchedIn1to1 + ledgerMatchedInGroups + ledgerExceptions.length, 29);

  // Check 7: Cédula Contable Exacta al centavo
  assert.equal(result.statement.bankStatementBalance, 7_385_883.50);
  assert.equal(result.statement.depositsInTransit, 50_983_333.00);
  assert.equal(result.statement.paymentsInTransit, 1_158_650.05);
  assert.equal(result.statement.adjustedBankBalance, 57_210_566.45);

  assert.equal(result.statement.ledgerBalance, 149_777_034.94);
  assert.equal(result.statement.unrecordedCreditNotes, 0.00);
  assert.equal(result.statement.unrecordedDebitNotes, 9_553_536.40);
  assert.equal(result.statement.adjustedLedgerBalance, 140_223_498.54);

  assert.equal(result.statement.openingDifference, 83_012_932.09);
  assert.equal(result.statement.finalDifference, 0.00);
  assert.equal(result.statement.statementNetMovement, 6_029_809.01);

  // Check 8: Partidas de investigación
  assert.ok(result.investigationItems.length >= 3);
  const has50M = result.investigationItems.some((inv) => Math.abs(inv.amount) === 50_000_000);
  const hasRetiros = result.investigationItems.some((inv) => inv.description.includes('RETIRO'));
  const hasGooglePattern = result.investigationItems.some((inv) => inv.id === 'INV-PAT-GOOGLE' || inv.description.includes('Google'));
  assert.ok(has50M, 'Debe incluir la partida de $50M en investigación');
  assert.ok(hasRetiros, 'Debe incluir los retiros en investigación');
  assert.ok(hasGooglePattern, 'Debe incluir el patrón Google en investigación');

  // Check 9: Validación contable previa pasa 100% en caso limpio
  const report = validator.validar_conciliacion(result, bankRows, ledgerRows);
  assert.equal(report.isValid, true);
  assert.equal(report.errors.length, 0);

  // Check 10: Validación contable BLOQUEA si se altera un archivo a propósito (ej. se borra saldo inicial)
  const alteredMeta = { ...metadata, ledgerInitialBalance: 0 };
  const alteredResult = engine.reconcile(bankRows, ledgerRows, {
    tolerancePercent: 0,
    toleranceDays: 5,
    enableFuzzy: true,
    checkDuplicates: false,
    metadata: alteredMeta,
  });
  const alteredReport = validator.validar_conciliacion(alteredResult, bankRows, ledgerRows);
  assert.equal(alteredReport.isValid, false);
  assert.ok(alteredReport.errors.length > 0);

  // Check 11: Efectividad bancaria (55,8%) y del libro (82,8%)
  assert.equal(result.summary.bankEffectiveness, 55.8);
  assert.equal(result.summary.ledgerEffectiveness, 82.8);
});


test('rule (b): preserves both rows when duplicate identical rows exist', () => {
  const bankRows = [
    { rowId: 'B-01', date: '2026-01-10', amount: -50_000, name: 'COMPRA GASOLINA', raw: {} },
    { rowId: 'B-02', date: '2026-01-10', amount: -50_000, name: 'COMPRA GASOLINA', raw: {} },
  ];
  const ledgerRows = [
    { rowId: 'L-01', date: '2026-01-10', amount: -50_000, voucher: 'CE-01', name: 'Gasolina', raw: {} },
  ];

  const result = engine.reconcile(bankRows, ledgerRows, { tolerancePercent: 0, enableFuzzy: false, checkDuplicates: true });

  // Both bank rows must be preserved: B-01 is reconciled, B-02 is an exception
  assert.equal(result.summary.totalBank, 2);
  assert.equal(result.summary.reconciled, 1);
  assert.equal(result.summary.exceptions, 1);
  const matched = result.matches.find((m) => m.rowIdBank === 'B-01');
  const unassigned = result.matches.find((m) => m.rowIdBank === 'B-02');
  assert.ok(matched);
  assert.ok(unassigned);
  assert.equal(matched.status, 'reconciled');
  assert.equal(unassigned.status, 'exception');
});

test('rule (c): summary strictly equals the real count of each sheet/category from final state', () => {
  const bankRows = [
    { rowId: 'B-01', date: '2026-01-05', amount: 100_000, name: 'RECAUDO CLIENTE' },
    { rowId: 'B-02', date: '2026-01-10', amount: 50_000, name: 'PAGO CLIENTE B' },
    { rowId: 'B-03', date: '2026-01-15', amount: 80_000, name: 'PAGO NO REGISTRADO' },
  ];
  const ledgerRows = [
    { rowId: 'L-01', date: '2026-01-05', amount: 100_000, voucher: 'RC-01', name: 'CLIENTE A' },
    { rowId: 'L-02', date: '2026-01-28', amount: 50_000, voucher: 'RC-02', name: 'CLIENTE B' }, // 18 days diff -> suggestion
    { rowId: 'L-03', date: '2026-01-20', amount: 90_000, voucher: 'RC-03', name: 'CLIENTE C' }, // libro sin banco
  ];

  const result = engine.reconcile(bankRows, ledgerRows, { tolerancePercent: 0, toleranceDays: 3, enableFuzzy: true, checkDuplicates: false });

  const reconciledCount = result.matches.filter((m) => m.status === 'reconciled').length;
  const suggestionCount = result.matches.filter((m) => m.status === 'suggestion').length;
  const exceptionCount = result.matches.filter((m) => m.status === 'exception').length;

  assert.equal(result.summary.reconciled, reconciledCount);
  assert.equal(result.summary.suggestions, suggestionCount);
  assert.equal(result.summary.exceptions, exceptionCount);
});

test('rule (d): no match with confidence < 95 is approved automatically', () => {
  const bankRows = [
    { rowId: 'B-01', date: '2026-01-08', amount: -14_900, name: 'CUOTA MANEJO' },
  ];
  const ledgerRows = [
    { rowId: 'L-01', date: '2026-01-30', amount: -14_900, voucher: 'CE-50', name: 'Cuota de manejo' },
  ];

  const result = engine.reconcile(bankRows, ledgerRows, { tolerancePercent: 0, toleranceDays: 3, enableFuzzy: true, checkDuplicates: false });

  assert.equal(result.matches.length, 1);
  const m = result.matches[0];
  assert.ok(m.confidence < 95, `Confidence was ${m.confidence}`);
  assert.notEqual(m.status, 'reconciled');
  assert.equal(m.status, 'suggestion');
});

test('rule (e): statement without identifier column processes without error and matches by date and amount', () => {
  const bankRows = [
    { rowId: 'B-01', date: '2026-01-10', amount: 250_000, name: 'CONSIGNACION SUCURSAL NORTE' },
    { rowId: 'B-02', date: '2026-01-12', amount: 480_000, name: 'TRANSFERENCIA DESCONOCIDA' },
  ];
  const ledgerRows = [
    { rowId: 'L-01', date: '2026-01-10', amount: 250_000, voucher: 'RC-99', name: 'ALMACEN EL CONDOR' },
  ];

  const result = engine.reconcile(bankRows, ledgerRows, { tolerancePercent: 0, toleranceDays: 3, enableFuzzy: true, checkDuplicates: false });

  assert.equal(result.summary.totalBank, 2);
  assert.equal(result.summary.totalLedger, 1);
  assert.equal(result.summary.reconciled, 1);
  assert.equal(result.summary.exceptions, 1);

  // B-01 takes name from agenda
  const match = result.matches.find((m) => m.rowIdBank === 'B-01');
  assert.equal(match.status, 'reconciled');
  assert.equal(match.ledgerName, 'ALMACEN EL CONDOR');
});

