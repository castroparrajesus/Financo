const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const crypto = require('node:crypto');

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

test.describe('Test Unitario: Persistencia de Hash SHA-256 en Historial y Memoria Local', () => {
  // Mock simple de Web Storage (sessionStorage y localStorage)
  class MemoryStorage {
    constructor() {
      this.store = new Map();
    }
    getItem(key) {
      return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, value) {
      this.store.set(key, String(value));
    }
    removeItem(key) {
      this.store.delete(key);
    }
    clear() {
      this.store.clear();
    }
  }

  const mockSessionStorage = new MemoryStorage();
  const mockLocalStorage = new MemoryStorage();

  // Inyectar en global para simular el navegador
  global.window = {
    sessionStorage: mockSessionStorage,
    localStorage: mockLocalStorage,
    dispatchEvent: () => {},
  };

  const demoData = loadTypeScript('lib/demo-data.ts');

  test('El hash SHA-256 de un extracto cargado se persiste en la corrida y sobrevive a la recarga de sesión', () => {
    // 1. Simular archivo binario real de extracto Bancolombia
    const fileContent = 'BANCOLOMBIA S.A. EXTRACTO 2026-01 CAMAGUEY S.A NIT 8901000261 SALDO $124.800.000';
    const expectedHash = crypto.createHash('sha256').update(fileContent).digest('hex');

    assert.equal(typeof expectedHash, 'string');
    assert.equal(expectedHash.length, 64);

    // 2. Crear corrida de conciliación con los metadatos de hash
    const runId = `recon-test-${Date.now()}`;
    const testRun = {
      reconciliation: {
        id: runId,
        owner_id: 'user-ruby-fernandez',
        company_id: 'company-camaguey-sa',
        bank_upload_id: `upload-bank-${runId}`,
        ledger_upload_id: `upload-ledger-${runId}`,
        status: 'completed',
        tolerance_percent: 0,
        total_bank_rows: 54,
        total_ledger_rows: 52,
        total_reconciled: 52,
        total_exceptions: 2,
        total_suggestions: 0,
        total_amount_reconciled: 48500000,
        auto_percentage: 96.3,
        metadata: {
          companyName: 'CAMAGUEY S.A',
          companyNit: '890.100.026-1',
          period: 'Enero 2026',
          ledgerAccount: '11100501 Bancolombia Cta Cte',
          bankEntity: 'Bancolombia S.A.',
          bankFileHash: expectedHash,
          bankFileSizeBytes: fileContent.length,
        },
        statement: {
          bankStatementBalance: 124800000,
          adjustedBankBalance: 124800000,
          ledgerBalance: 124800000,
          adjustedLedgerBalance: 124800000,
          finalDifference: 0,
        },
        created_at: new Date().toISOString(),
        companies: { name: 'CAMAGUEY S.A' },
      },
      matches: [],
    };

    // 3. Guardar corrida simulando la persistencia de Financo
    demoData.saveDemoRun(testRun);

    // 4. Simular un refresh de página (navegador se reinicia y lee de sessionStorage)
    const storedRuns = demoData.getDemoRuns();
    const retrievedRun = storedRuns.find((r) => r.reconciliation.id === runId);

    assert.ok(retrievedRun, 'La corrida debe existir tras el refresh de sesión');
    assert.equal(retrievedRun.reconciliation.metadata.bankFileHash, expectedHash);
    assert.equal(retrievedRun.reconciliation.metadata.companyName, 'CAMAGUEY S.A');

    // 5. Verificar que el hash se encuentra presente y formateable para la UI del historial
    const shortHash = `${retrievedRun.reconciliation.metadata.bankFileHash.slice(0, 8)}...${retrievedRun.reconciliation.metadata.bankFileHash.slice(-8)}`;
    assert.equal(shortHash.length, 19);
    assert.ok(shortHash.startsWith(expectedHash.slice(0, 8)));
    assert.ok(shortHash.endsWith(expectedHash.slice(-8)));
  });
});
