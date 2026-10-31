const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

function loadTypeScript(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const loadedModule = { exports: {} };
  const fn = new Function('require', 'module', 'exports', outputText);
  fn(require, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

test.describe('Test Unitario: Criptografía Web Crypto API (SHA-256)', () => {
  const fileIntegrity = loadTypeScript('lib/crypto/file-integrity.ts');

  test('computeFileSHA256: opera exclusivamente sobre globalThis.crypto.subtle sin dependencia de window', async () => {
    assert.ok(globalThis.crypto?.subtle, 'globalThis.crypto.subtle debe estar disponible en Node 18+ y navegadores modernos');

    const sampleText = 'Financo NIIF Camagüey Extracto Bancolombia 2026 Integridad Criptografica';
    const mockFile = {
      name: 'Extracto_Bancolombia_2026.xlsx',
      size: Buffer.byteLength(sampleText),
      arrayBuffer: async () => Buffer.from(sampleText).buffer,
    };

    const result = await fileIntegrity.computeFileSHA256(mockFile);

    assert.equal(result.fileName, 'Extracto_Bancolombia_2026.xlsx');
    assert.equal(typeof result.sha256Hex, 'string');
    assert.equal(result.sha256Hex.length, 64);
    assert.match(result.sha256Hex, /^[a-f0-9]{64}$/);
    assert.ok(result.calculatedAt);
  });

  test('computeFileSHA256: produce hashes deterministas y diferentes para contenidos distintos', async () => {
    const file1 = {
      name: 'file1.xlsx',
      size: 4,
      arrayBuffer: async () => Buffer.from('TEST').buffer,
    };
    const file2 = {
      name: 'file2.xlsx',
      size: 4,
      arrayBuffer: async () => Buffer.from('DIFF').buffer,
    };

    const res1 = await fileIntegrity.computeFileSHA256(file1);
    const res2 = await fileIntegrity.computeFileSHA256(file2);

    assert.notEqual(res1.sha256Hex, res2.sha256Hex);
  });
});
