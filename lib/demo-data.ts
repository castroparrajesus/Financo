import { Company, CompanyMember, CompanyRole, MatchRow, Reconciliation } from './types';

// Empresa demostrativa independiente exclusiva para la sesión de prueba ("demo-user")
export const DEMO_USER_COMPANY: Company = {
  id: 'company-demo-sandbox',
  owner_id: 'demo-user',
  user_id: 'demo-user',
  name: 'Demo Conciliaciones S.A.S.',
  nit: '901.888.999-1',
  contact_email: 'demo@financo.app',
  contact_phone: '3001234567',
  city: 'Bogotá D.C.',
  notes: 'Empresa demostrativa aislada para pruebas de conciliación en modo sandbox',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const CAMAGUEY_COMPANY: Company = {
  id: 'company-camaguey-sa',
  owner_id: 'user-ruby-fernandez',
  user_id: 'user-ruby-fernandez',
  name: 'CAMAGUEY S.A',
  nit: '890.100.026-1',
  contact_email: 'PROVEEDORES@CAMAGUEY.COM.CO',
  contact_phone: '3016410377',
  city: 'Galapa',
  notes: 'Banco: Bancolombia S.A. | PUC: 11100501 Bancolombia Cta Cte | Asignada a: Ruby Fernandez',
  created_at: '2026-01-20T10:00:00.000Z',
};

export const DEMO_COMPANIES: Company[] = [DEMO_USER_COMPANY];

const CAMAGUEY_TEAM_IDENTIFIERS = new Set([
  'user-ruby-fernandez',
  'user-rodolfo-pastrana',
  'user-sthefanie-caraballo',
  'user-ruby-fernandez-alt1',
  'user-ruby-fernandez-alt2',
  'user-ruby-fernandez-alt3',
  'user-rodolfo-pastrana-alt1',
  'user-sthefanie-caraballo-alt1',
  'user-sthefanie-caraballo-alt2',
  'user-sthefanie-caraballo-alt3',
  'ruby.fernandez@andina.com',
  'rodolfo.pastrana@andina.com',
  'sthefanie.caraballo@andina.com',
  'ruby@andina.com',
  'rodolfo@andina.com',
  'sthefanie@andina.com',
  'stefanie@andina.com',
  'ruby.fernandez@financo.co',
  'rubyfernandez@gmail.com',
]);

export function isUserInCamagueyTeam(userIdOrEmail?: string | null): boolean {
  if (!userIdOrEmail) return false;
  const clean = userIdOrEmail.trim().toLowerCase();
  if (CAMAGUEY_TEAM_IDENTIFIERS.has(clean)) return true;
  return (
    clean.includes('ruby') ||
    clean.includes('pastrana') ||
    clean.includes('sthefanie') ||
    clean.includes('caraballo')
  );
}

// ============================================================================
// PURGA ESTRICTA DE LOCALSTORAGE: Financo NO guarda datos financieros en localStorage
// Las cuentas reales utilizan Supabase con RLS; la demo utiliza sessionStorage.
// ============================================================================
export function purgeLegacyLocalStorageFinancialData(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
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
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignorar si el acceso a localStorage está restringido
  }
}

// Ejecutar purga de inmediato en el cliente
if (typeof window !== 'undefined') {
  purgeLegacyLocalStorageFinancialData();
}

// ============================================================================
// GESTIÓN DEMO: 100% Local en sessionStorage (aislado a la sesión del navegador)
// ============================================================================
const DEMO_COMPANIES_SESSION_KEY = 'financo_demo_companies_v1';
const DEMO_MEMBERS_SESSION_KEY = 'financo_demo_company_members_v1';
const DEMO_RUNS_SESSION_KEY = 'financo_demo_runs_v1';

export function getDemoCompanies(): Company[] {
  if (typeof window === 'undefined') return [DEMO_USER_COMPANY];
  try {
    const raw = window.sessionStorage.getItem(DEMO_COMPANIES_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Inicializar sandbox en sessionStorage
    const initial = [DEMO_USER_COMPANY];
    window.sessionStorage.setItem(DEMO_COMPANIES_SESSION_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return [DEMO_USER_COMPANY];
  }
}

export function saveDemoCompanies(companies: Company[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DEMO_COMPANIES_SESSION_KEY, JSON.stringify(companies));
    window.dispatchEvent(new CustomEvent('financo_companies_updated', { detail: { companies } }));
  } catch {
    // Manejar sessionStorage lleno o bloqueado
  }
}

// ============================================================================
// COMPATIBILIDAD CON COMPONENTES:
// Si es cuenta real, devuelve [] para obligar la lectura directa desde Supabase.
// Si es demo, lee y escribe exclusivamente desde sessionStorage.
// NUNCA escribe en localStorage.
// ============================================================================
export function getStoredCompanies(userId?: string | null): Company[] {
  if (typeof window === 'undefined') return [];
  const isDemoSession =
    window.sessionStorage.getItem('financo-demo-session') === 'true' ||
    userId === 'demo-user';

  if (isDemoSession) {
    return getDemoCompanies();
  }

  // Cuenta real: las empresas se cargan exclusivamente desde Supabase con RLS
  return [];
}

export function saveStoredCompanies(companies: Company[], userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const isDemoSession =
    window.sessionStorage.getItem('financo-demo-session') === 'true' ||
    userId === 'demo-user';

  if (isDemoSession) {
    saveDemoCompanies(companies);
  }
  // En cuenta real: NUNCA se persiste en localStorage. Toda persistencia va a Supabase.
}

export function getDeletedCompanyIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem('financo_deleted_companies_demo');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedCompany(company: { id: string; name?: string; nit?: string | null }): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedCompanyIds();
    const updated = Array.from(new Set([...current, company.id]));
    window.sessionStorage.setItem('financo_deleted_companies_demo', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('financo_companies_deleted', { detail: company }));
  } catch {
    // Ignore
  }
}

// ============================================================================
// CONCILIACIONES Y CORRIDAS DEMO (100% sessionStorage)
// ============================================================================
export type DemoReconciliation = Reconciliation & { companies: { name: string } };
export interface DemoRun {
  reconciliation: DemoReconciliation;
  matches: MatchRow[];
}

function isDemoRun(value: unknown): value is DemoRun {
  if (!value || typeof value !== 'object') return false;
  const run = value as Partial<DemoRun>;
  return Boolean(
    run.reconciliation &&
      typeof run.reconciliation.id === 'string' &&
      typeof run.reconciliation.company_id === 'string' &&
      run.reconciliation.companies &&
      Array.isArray(run.matches)
  );
}

export function getDemoRuns(_userId?: string | null): DemoRun[] {
  if (typeof window === 'undefined') return [];
  try {
    const storedRuns = window.sessionStorage.getItem(DEMO_RUNS_SESSION_KEY);
    if (!storedRuns) return [];
    const parsed: unknown = JSON.parse(storedRuns);
    if (!Array.isArray(parsed) || !parsed.every(isDemoRun)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveDemoRun(run: DemoRun, _userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const runs = getDemoRuns().filter((savedRun) => savedRun.reconciliation.id !== run.reconciliation.id);
    window.sessionStorage.setItem(DEMO_RUNS_SESSION_KEY, JSON.stringify([run, ...runs]));
  } catch {
    // Ignore
  }
}

export function getDemoReconciliationsForUser(_userIdOrEmail?: string | null): DemoReconciliation[] {
  return [];
}

export const DEMO_RECONCILIATIONS: DemoReconciliation[] = [
  {
    id: 'demo-reconciliation-camaguey',
    owner_id: 'demo-user',
    company_id: DEMO_USER_COMPANY.id,
    bank_upload_id: 'demo-bank-sandbox',
    ledger_upload_id: 'demo-ledger-sandbox',
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
      companyName: 'Demo Conciliaciones S.A.S.',
      companyNit: '901.888.999-1',
      period: 'Enero 2026',
      ledgerAccount: '11100501 Bancolombia Cta Cte',
      bankEntity: 'Bancolombia S.A.',
      bankPreviousBalance: 0,
      bankCurrentBalance: 124800000,
      ledgerInitialBalance: 0,
      ledgerFinalBalance: 124800000,
    },
    statement: {
      bankStatementBalance: 124800000,
      depositsInTransit: 0,
      paymentsInTransit: 0,
      adjustedBankBalance: 124800000,
      ledgerBalance: 124800000,
      unrecordedCreditNotes: 0,
      unrecordedDebitNotes: 0,
      openingDifference: 0,
      adjustedLedgerBalance: 124800000,
      finalDifference: 0,
      statementNetMovement: 48500000,
      differenceBeforeItems: 0,
    },
    groups: [
      {
        id: 'group-gmf-ene2026',
        concept: 'Gravamen a los Movimientos Financieros (4x1000)',
        totalBankAmount: -208500,
        totalLedgerAmount: -208500,
        difference: 0,
        status: 'reconciled',
        confidence: 99,
        rule: 'agrupacion_4x1000',
        bankRows: [
          { rowId: 'B-GMF-01', date: '2026-01-08', amount: -6000, name: 'GRAVAMEN MOVIMIENTO FINANCIERO', identifier: '890100026', reference: 'GMF-01', raw: {}, rowIndex: 15 },
          { rowId: 'B-GMF-02', date: '2026-01-15', amount: -8500, name: 'GRAVAMEN MOVIMIENTO FINANCIERO', identifier: '890100026', reference: 'GMF-02', raw: {}, rowIndex: 32 },
          { rowId: 'B-GMF-03', date: '2026-01-22', amount: -12000, name: 'GRAVAMEN MOVIMIENTO FINANCIERO', identifier: '890100026', reference: 'GMF-03', raw: {}, rowIndex: 58 },
          { rowId: 'B-GMF-04', date: '2026-01-31', amount: -182000, name: 'GRAVAMEN MOVIMIENTO FINANCIERO', identifier: '890100026', reference: 'GMF-04', raw: {}, rowIndex: 89 },
        ],
        ledgerRows: [
          { rowId: 'L-GMF-01', date: '2026-01-31', amount: -208500, name: 'GMF 4X1000 CAUSACION MES', voucher: 'NC-089', identifier: '890100026', reference: 'NC-089', raw: {}, rowIndex: 22 },
        ],
      },
      {
        id: 'group-int-ene2026',
        concept: 'Rendimientos Financieros Depósitos',
        totalBankAmount: 18420,
        totalLedgerAmount: 18420,
        difference: 0,
        status: 'reconciled',
        confidence: 99,
        rule: 'agrupacion_intereses',
        bankRows: [
          { rowId: 'B-INT-01', date: '2026-01-16', amount: 9210, name: 'ABONO INTERESES CORRIENTES', identifier: '890100026', reference: 'INT-01', raw: {}, rowIndex: 41 },
          { rowId: 'B-INT-02', date: '2026-01-31', amount: 9210, name: 'ABONO INTERESES CORRIENTES', identifier: '890100026', reference: 'INT-02', raw: {}, rowIndex: 95 },
        ],
        ledgerRows: [
          { rowId: 'L-INT-01', date: '2026-01-31', amount: 18420, name: 'RENDIMIENTOS BANCARIOS ENERO', voucher: 'NC-090', identifier: '890100026', reference: 'NC-090', raw: {}, rowIndex: 24 },
        ],
      },
    ],
    settings: { tolerancePercent: 0, enableFuzzy: true, checkDuplicates: true },
    created_at: '2026-01-28T16:00:00.000Z',
    companies: { name: 'Demo Conciliaciones S.A.S.' },
  },
];

export const DEMO_MATCHES: MatchRow[] = [
  {
    id: 'demo-match-1',
    reconciliation_id: 'demo-reconciliation-camaguey',
    status: 'reconciled',
    exception_type: null,
    bank_date: '2026-01-06',
    bank_amount: 1_250_000,
    bank_id: '901888999',
    bank_name: 'CLIENTE DISTRIBUCIONES',
    bank_reference: 'TRX-80421',
    ledger_date: '2026-01-06',
    ledger_amount: 1_250_000,
    ledger_id: '901888999',
    ledger_name: 'CLIENTE DISTRIBUCIONES',
    ledger_reference: 'FAC-1842',
    amount_diff: 0,
    match_rule: 'nit_exact_amount',
    confidence: 100,
    human_status: 'approved',
    comment: null,
    row_index_bank: 1,
    row_index_ledger: 3,
  },
  {
    id: 'demo-match-2',
    reconciliation_id: 'demo-reconciliation-camaguey',
    status: 'suggestion',
    exception_type: null,
    bank_date: '2026-01-06',
    bank_amount: 875_000,
    bank_id: '901888999',
    bank_name: 'SUMINISTROS Y SERVICIOS',
    bank_reference: 'TRX-80422',
    ledger_date: '2026-01-05',
    ledger_amount: 880_000,
    ledger_id: '901888999',
    ledger_name: 'SUMINISTROS Y SERVICIOS',
    ledger_reference: 'FAC-1849',
    amount_diff: -5_000,
    match_rule: 'nit_fuzzy_amount',
    confidence: 86,
    human_status: 'pending',
    comment: null,
    row_index_bank: 2,
    row_index_ledger: 7,
  },
  {
    id: 'demo-match-3',
    reconciliation_id: 'demo-reconciliation-camaguey',
    status: 'exception',
    exception_type: 'no_match',
    bank_date: '2026-01-06',
    bank_amount: 342_500,
    bank_id: null,
    bank_name: 'Pago PSE Bancolombia',
    bank_reference: 'TRX-80423',
    ledger_date: null,
    ledger_amount: null,
    ledger_id: null,
    ledger_name: null,
    ledger_reference: null,
    amount_diff: null,
    match_rule: null,
    confidence: 0,
    human_status: 'pending',
    comment: null,
    row_index_bank: 3,
    row_index_ledger: null,
  },
];

// ============================================================================
// MIEMBROS DE EQUIPO EN MODO DEMO (sessionStorage)
// ============================================================================
export const INITIAL_COMPANY_MEMBERS: Record<string, CompanyMember[]> = {
  'company-demo-sandbox': [
    {
      id: 'member-demo-owner',
      company_id: 'company-demo-sandbox',
      user_id: 'demo-user',
      role: 'owner',
      email: 'demo@financo.app',
      full_name: 'Usuario Demo',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ],
};

export function getStoredCompanyMembers(companyId: string): CompanyMember[] {
  if (typeof window === 'undefined') return INITIAL_COMPANY_MEMBERS[companyId] || [];
  try {
    const raw = window.sessionStorage.getItem(DEMO_MEMBERS_SESSION_KEY);
    const allMembers: Record<string, CompanyMember[]> = raw ? JSON.parse(raw) : INITIAL_COMPANY_MEMBERS;
    return allMembers[companyId] || INITIAL_COMPANY_MEMBERS[companyId] || [];
  } catch {
    return INITIAL_COMPANY_MEMBERS[companyId] || [];
  }
}

export function saveStoredCompanyMember(member: CompanyMember): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(DEMO_MEMBERS_SESSION_KEY);
    const allMembers: Record<string, CompanyMember[]> = raw ? JSON.parse(raw) : { ...INITIAL_COMPANY_MEMBERS };
    const list = allMembers[member.company_id] || [];

    const index = list.findIndex(
      (m) =>
        (m.user_id && m.user_id === member.user_id) ||
        (m.email && m.email.toLowerCase() === member.email?.toLowerCase())
    );

    if (index >= 0) {
      list[index] = { ...list[index], ...member };
    } else {
      list.push(member);
    }

    allMembers[member.company_id] = list;
    window.sessionStorage.setItem(DEMO_MEMBERS_SESSION_KEY, JSON.stringify(allMembers));
    window.dispatchEvent(new CustomEvent('financo_members_updated', { detail: { companyId: member.company_id } }));
  } catch {
    // Ignore
  }
}

export function removeStoredCompanyMember(companyId: string, memberIdOrUserId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(DEMO_MEMBERS_SESSION_KEY);
    const allMembers: Record<string, CompanyMember[]> = raw ? JSON.parse(raw) : { ...INITIAL_COMPANY_MEMBERS };
    const list = allMembers[companyId] || [];

    allMembers[companyId] = list.filter((m) => m.id !== memberIdOrUserId && m.user_id !== memberIdOrUserId);
    window.sessionStorage.setItem(DEMO_MEMBERS_SESSION_KEY, JSON.stringify(allMembers));
    window.dispatchEvent(new CustomEvent('financo_members_updated', { detail: { companyId } }));
  } catch {
    // Ignore
  }
}

export function updateStoredMemberRole(companyId: string, memberId: string, newRole: CompanyRole): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(DEMO_MEMBERS_SESSION_KEY);
    const allMembers: Record<string, CompanyMember[]> = raw ? JSON.parse(raw) : { ...INITIAL_COMPANY_MEMBERS };
    const list = allMembers[companyId] || [];

    const item = list.find((m) => m.id === memberId || m.user_id === memberId);
    if (item) {
      item.role = newRole;
      allMembers[companyId] = list;
      window.sessionStorage.setItem(DEMO_MEMBERS_SESSION_KEY, JSON.stringify(allMembers));
      window.dispatchEvent(new CustomEvent('financo_members_updated', { detail: { companyId } }));
    }
  } catch {
    // Ignore
  }
}
