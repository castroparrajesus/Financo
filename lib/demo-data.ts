import { Company, MatchRow, Reconciliation } from './types';

const demoOwnerId = 'demo-user';

export const DEMO_COMPANIES: Company[] = [
  {
    id: 'demo-company-andina',
    owner_id: demoOwnerId,
    name: 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC SAS',
    nit: '901883418-1',
    contact_email: 'contabilidad@iccsas.example',
    contact_phone: '605 555 0142',
    city: 'Cartagena',
    notes: null,
    created_at: '2026-01-18T14:00:00.000Z',
  },
  {
    id: 'demo-company-norte',
    owner_id: demoOwnerId,
    name: 'Servicios del Norte Ltda.',
    nit: '830.123.456-7',
    contact_email: 'contabilidad@norte.example',
    contact_phone: '604 555 0187',
    city: 'Medellín',
    notes: null,
    created_at: '2026-02-04T14:00:00.000Z',
  },
  {
    id: 'demo-company-verde',
    owner_id: demoOwnerId,
    name: 'Soluciones Verdes S.A.S.',
    nit: '901.234.567-8',
    contact_email: 'pagos@verdes.example',
    contact_phone: '602 555 0119',
    city: 'Cali',
    notes: null,
    created_at: '2026-02-21T14:00:00.000Z',
  },
];

export type DemoReconciliation = Reconciliation & { companies: { name: string } };
export interface DemoRun {
  reconciliation: DemoReconciliation;
  matches: MatchRow[];
}

const DEMO_RUNS_KEY = 'financo-demo-runs';

function isDemoRun(value: unknown): value is DemoRun {
  if (!value || typeof value !== 'object') return false;
  const run = value as Partial<DemoRun>;
  return Boolean(
    run.reconciliation &&
    typeof run.reconciliation.id === 'string' &&
    typeof run.reconciliation.company_id === 'string' &&
    run.reconciliation.companies &&
    Array.isArray(run.matches),
  );
}

export function getDemoRuns(): DemoRun[] {
  const storedRuns = window.sessionStorage.getItem(DEMO_RUNS_KEY);
  if (!storedRuns) return [];

  try {
    const parsed: unknown = JSON.parse(storedRuns);
    if (!Array.isArray(parsed) || !parsed.every(isDemoRun)) {
      throw new Error('El historial de conciliaciones demo tiene un formato inválido.');
    }
    return parsed;
  } catch (error) {
    console.error('No se pudo leer el historial de conciliaciones demo.', error);
    throw error;
  }
}

export function saveDemoRun(run: DemoRun): void {
  const runs = getDemoRuns().filter((savedRun) => savedRun.reconciliation.id !== run.reconciliation.id);
  window.sessionStorage.setItem(DEMO_RUNS_KEY, JSON.stringify([run, ...runs]));
}

export const DEMO_RECONCILIATIONS: DemoReconciliation[] = [
  {
    id: 'demo-reconciliation-andina',
    owner_id: demoOwnerId,
    company_id: DEMO_COMPANIES[0].id,
    bank_upload_id: 'demo-bank-upload',
    ledger_upload_id: 'demo-ledger-upload',
    status: 'completed',
    tolerance_percent: 1,
    total_bank_rows: 3,
    total_ledger_rows: 3,
    total_reconciled: 1,
    total_suggestions: 1,
    total_exceptions: 1,
    total_amount_reconciled: 1_250_000,
    auto_percentage: 33,
    settings: { tolerancePercent: 1, enableFuzzy: true, checkDuplicates: true },
    created_at: '2026-10-06T14:30:00.000Z',
    companies: { name: DEMO_COMPANIES[0].name },
  },
  {
    id: 'demo-reconciliation-norte',
    owner_id: demoOwnerId,
    company_id: DEMO_COMPANIES[1].id,
    bank_upload_id: 'demo-bank-upload-2',
    ledger_upload_id: 'demo-ledger-upload-2',
    status: 'completed',
    tolerance_percent: 0,
    total_bank_rows: 3,
    total_ledger_rows: 3,
    total_reconciled: 1,
    total_suggestions: 1,
    total_exceptions: 1,
    total_amount_reconciled: 1_250_000,
    auto_percentage: 33,
    settings: { tolerancePercent: 0, enableFuzzy: true, checkDuplicates: true },
    created_at: '2026-10-02T15:10:00.000Z',
    companies: { name: DEMO_COMPANIES[1].name },
  },
  {
    id: 'demo-reconciliation-verde',
    owner_id: demoOwnerId,
    company_id: DEMO_COMPANIES[2].id,
    bank_upload_id: 'demo-bank-upload-3',
    ledger_upload_id: 'demo-ledger-upload-3',
    status: 'completed',
    tolerance_percent: 2,
    total_bank_rows: 3,
    total_ledger_rows: 3,
    total_reconciled: 1,
    total_suggestions: 1,
    total_exceptions: 1,
    total_amount_reconciled: 1_250_000,
    auto_percentage: 33,
    settings: { tolerancePercent: 2, enableFuzzy: true, checkDuplicates: true },
    created_at: '2026-09-27T13:45:00.000Z',
    companies: { name: DEMO_COMPANIES[2].name },
  },
];

export const DEMO_MATCHES: MatchRow[] = [
  {
    id: 'demo-match-1',
    reconciliation_id: DEMO_RECONCILIATIONS[0].id,
    status: 'reconciled',
    exception_type: null,
    bank_date: '2026-10-06',
    bank_amount: 1_250_000,
    bank_id: '900123456',
    bank_name: 'Distribuciones La 14',
    bank_reference: 'TRX-80421',
    ledger_date: '2026-10-06',
    ledger_amount: 1_250_000,
    ledger_id: '900123456',
    ledger_name: 'Distribuciones La 14',
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
    reconciliation_id: DEMO_RECONCILIATIONS[0].id,
    status: 'suggestion',
    exception_type: null,
    bank_date: '2026-10-06',
    bank_amount: 875_000,
    bank_id: '800765432',
    bank_name: 'Papelería Central',
    bank_reference: 'TRX-80422',
    ledger_date: '2026-10-05',
    ledger_amount: 880_000,
    ledger_id: '800765432',
    ledger_name: 'Papeleria Central',
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
    reconciliation_id: DEMO_RECONCILIATIONS[0].id,
    status: 'exception',
    exception_type: 'no_match',
    bank_date: '2026-10-06',
    bank_amount: 342_500,
    bank_id: null,
    bank_name: 'Pago PSE',
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
