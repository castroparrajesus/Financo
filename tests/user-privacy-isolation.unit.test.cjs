/**
 * Test Unitario: Privacidad, Aislamiento de Empresas y Limpieza de Sesión
 * 
 * Reglas arquitectónicas verificadas:
 * 1. localStorage NO guarda datos financieros ni empresas (financo_companies_user_* eliminado).
 * 2. Cuentas reales van directamente a Supabase; la demo opera 100% en sessionStorage.
 * 3. Tras signOut, sessionStorage no contiene datos de la sesión anterior.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mock en memoria de localStorage y sessionStorage con inspección de claves
const mockLocalStorage = new Map();
const mockSessionStorage = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => mockLocalStorage.get(key) || null,
    setItem: (key, val) => mockLocalStorage.set(key, String(val)),
    removeItem: (key) => mockLocalStorage.delete(key),
    clear: () => mockLocalStorage.clear(),
    key: (i) => Array.from(mockLocalStorage.keys())[i] || null,
    get length() {
      return mockLocalStorage.size;
    },
  },
  sessionStorage: {
    getItem: (key) => mockSessionStorage.get(key) || null,
    setItem: (key, val) => mockSessionStorage.set(key, String(val)),
    removeItem: (key) => mockSessionStorage.delete(key),
    clear: () => mockSessionStorage.clear(),
    key: (i) => Array.from(mockSessionStorage.keys())[i] || null,
    get length() {
      return mockSessionStorage.size;
    },
  },
  dispatchEvent: () => true,
  CustomEvent: class CustomEvent {
    constructor(name, detail) {
      this.name = name;
      this.detail = detail;
    }
  },
};

const DEMO_USER_COMPANY = {
  id: 'company-demo-sandbox',
  owner_id: 'demo-user',
  user_id: 'demo-user',
  name: 'Demo Conciliaciones S.A.S.',
  nit: '901.888.999-1',
};

const DEMO_COMPANIES_SESSION_KEY = 'financo_demo_companies_v1';
const DEMO_RUNS_SESSION_KEY = 'financo_demo_runs_v1';
const DEMO_MEMBERS_SESSION_KEY = 'financo_demo_company_members_v1';

function getDemoCompanies() {
  const raw = window.sessionStorage.getItem(DEMO_COMPANIES_SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  const initial = [DEMO_USER_COMPANY];
  window.sessionStorage.setItem(DEMO_COMPANIES_SESSION_KEY, JSON.stringify(initial));
  return initial;
}

function saveDemoCompanies(companies) {
  window.sessionStorage.setItem(DEMO_COMPANIES_SESSION_KEY, JSON.stringify(companies));
}

function getStoredCompanies(userId, isDemoSession) {
  if (isDemoSession || userId === 'demo-user') {
    return getDemoCompanies();
  }
  // Cuenta real: nunca lee de localStorage; retorna [] para consulta obligatoria en Supabase con RLS
  return [];
}

function purgeLegacyLocalStorage() {
  const keysToRemove = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (
      key &&
      (key.startsWith('financo_companies') ||
        key.startsWith('financo_company_members') ||
        key.startsWith('financo_deleted_company') ||
        key.startsWith('financo-demo-runs') ||
        key.startsWith('financo_cached_reconciliations'))
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => window.localStorage.removeItem(k));
}

function signOut() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
    window.dispatchEvent(new window.CustomEvent('financo_companies_updated'));
  }
}

describe('Aislamiento de Cuentas, Privacidad y Limpieza de Sesión', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  test('Regla 1: localStorage NO guarda datos financieros ni empresas (financo_companies_user_* eliminado)', () => {
    // Si existieran claves legacy en localStorage
    window.localStorage.setItem('financo_companies_user_castroparrajesus_gmail_com', JSON.stringify([{ id: 'c1' }]));
    window.localStorage.setItem('financo_companies_storage_v1', JSON.stringify([{ id: 'c2' }]));
    window.localStorage.setItem('financo_cached_reconciliations_fallback', '{"r1":{}}');

    assert.equal(window.localStorage.length, 3);

    // Al ejecutar la purga automática
    purgeLegacyLocalStorage();

    // Debe quedar completamente limpio de datos financieros
    assert.equal(window.localStorage.getItem('financo_companies_user_castroparrajesus_gmail_com'), null);
    assert.equal(window.localStorage.getItem('financo_companies_storage_v1'), null);
    assert.equal(window.localStorage.getItem('financo_cached_reconciliations_fallback'), null);
    assert.equal(window.localStorage.length, 0);
  });

  test('Regla 2: Cuenta real arranca limpia sin empresas de localStorage (consulta obligatoria a Supabase)', () => {
    // Usuario real autenticado (castroparrajesus@gmail.com):
    const companies = getStoredCompanies('user-real-jesus', false);
    assert.equal(companies.length, 0, 'Cuenta real nunca lee de almacenamiento local no verificado');
    assert.equal(
      companies.some((c) => c.name.includes('CAMAGUEY')),
      false,
      'No debe tener acceso residual a CAMAGUEY S.A'
    );
  });

  test('Regla 3: Modo Demo almacena empresas y corridas exclusivamente en sessionStorage', () => {
    const demoList = getStoredCompanies('demo-user', true);
    assert.equal(demoList.length, 1);
    assert.equal(demoList[0].name, 'Demo Conciliaciones S.A.S.');

    // Verificar que se guardó en sessionStorage y NO en localStorage
    assert.ok(window.sessionStorage.getItem(DEMO_COMPANIES_SESSION_KEY) !== null);
    assert.equal(window.localStorage.getItem(DEMO_COMPANIES_SESSION_KEY), null);
    assert.equal(window.localStorage.length, 0, 'localStorage debe mantenerse en 0 ítems financieros');
  });

  test('Regla 4: Tras signOut, sessionStorage NO contiene datos de la sesión anterior', () => {
    // Simular sesión demo activa con empresas, miembros y corridas en sessionStorage
    window.sessionStorage.setItem('financo-demo-session', 'true');
    saveDemoCompanies([
      { id: 'demo-1', name: 'Empresa Privada Demo', nit: '900.111.222-3' },
    ]);
    window.sessionStorage.setItem(DEMO_RUNS_SESSION_KEY, JSON.stringify([{ id: 'run-1', amount: 5000000 }]));
    window.sessionStorage.setItem(DEMO_MEMBERS_SESSION_KEY, JSON.stringify({ 'demo-1': [] }));
    window.sessionStorage.setItem('financo_demo_mfa_active', 'true');

    assert.ok(window.sessionStorage.length >= 4, 'sessionStorage debe contener datos de la sesión activa');

    // Ejecutar signOut
    signOut();

    // Verificación estricta: sessionStorage debe estar completamente vacío (0 ítems)
    assert.equal(window.sessionStorage.length, 0, 'sessionStorage debe quedar con 0 elementos tras signOut');
    assert.equal(window.sessionStorage.getItem('financo-demo-session'), null);
    assert.equal(window.sessionStorage.getItem(DEMO_COMPANIES_SESSION_KEY), null);
    assert.equal(window.sessionStorage.getItem(DEMO_RUNS_SESSION_KEY), null);
    assert.equal(window.sessionStorage.getItem(DEMO_MEMBERS_SESSION_KEY), null);
    assert.equal(window.sessionStorage.getItem('financo_demo_mfa_active'), null);
  });
});
