export type Plan = 'esencial' | 'profesional' | 'firma';
export type UserRole = 'owner' | 'accountant' | 'assistant' | 'auditor';
export type FileType = 'bank_statement' | 'client_ledger';
export type MatchStatus = 'reconciled' | 'suggestion' | 'exception';
export type ExceptionType =
  | 'banco_sin_libro'
  | 'libro_sin_banco'
  | 'diferencia_monto'
  | 'fecha_fuera_ventana'
  | 'posible_duplicado'
  | 'grupo_con_diferencia'
  // Legacy aliases
  | 'no_client'
  | 'duplicate'
  | 'value_diff'
  | 'empty_id'
  | 'no_match';

export type HumanStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  plan: Plan;
  two_factor_enabled: boolean;
  trial_ends_at: string | null;
  created_at: string;
  // Habeas Data / Ley 1581 de 2012 Consent Evidence
  data_consent_accepted?: boolean;
  data_consent_at?: string;
  data_consent_version?: string;
  data_consent_ip?: string;
  data_consent_user_agent?: string;
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  nit: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export interface BankProfile {
  id: string;
  owner_id: string;
  bank_name: string;
  date_column: string | null;
  amount_column: string | null;
  id_column: string | null;
  name_column: string | null;
  reference_column: string | null;
  header_row: number;
  date_format: string | null;
}

export interface Upload {
  id: string;
  owner_id: string;
  company_id: string | null;
  reconciliation_id: string | null;
  file_name: string;
  file_type: FileType;
  file_format: 'xlsx' | 'xls' | 'csv';
  row_count: number;
  storage_path: string | null;
  parsed_data: Record<string, unknown>[] | null;
  auto_delete_at: string | null;
  created_at: string;
}

export interface Reconciliation {
  id: string;
  owner_id: string;
  company_id: string;
  bank_upload_id: string;
  ledger_upload_id: string;
  status: 'processing' | 'completed' | 'failed';
  tolerance_percent: number;
  total_bank_rows: number;
  total_ledger_rows: number;
  total_reconciled: number;
  total_suggestions: number;
  total_exceptions: number;
  total_amount_reconciled: number;
  auto_percentage: number;
  settings: ReconciliationSettings;
  statement?: ReconciliationStatement;
  metadata?: ReconciliationMetadata;
  groups?: GroupMatch[];
  created_at: string;
}

export interface ReconciliationSettings {
  tolerancePercent: number;
  toleranceDays?: number;
  enableFuzzy: boolean;
  checkDuplicates: boolean;
}

export interface MatchRow {
  id: string;
  reconciliation_id: string;
  status: MatchStatus;
  exception_type: ExceptionType | null;
  treatment?: string | null;
  voucher?: string | null;
  row_id_bank?: string | null;
  row_id_ledger?: string | null;
  days_diff?: number | null;
  bank_date: string | null;
  bank_amount: number | null;
  bank_id: string | null;
  bank_name: string | null;
  bank_reference: string | null;
  ledger_date: string | null;
  ledger_amount: number | null;
  ledger_id: string | null;
  ledger_name: string | null;
  ledger_reference: string | null;
  amount_diff: number | null;
  match_rule: string | null;
  confidence: number;
  human_status: HumanStatus;
  comment: string | null;
  row_index_bank: number | null;
  row_index_ledger: number | null;
}

export interface NormalizedRow {
  rowId: string;
  date: string;
  amount: number;
  identifier: string;
  name: string;
  reference: string;
  voucher?: string;
  debit?: number;
  credit?: number;
  raw: Record<string, unknown>;
  rowIndex: number;
}

export interface GroupMatch {
  id: string;
  concept: string; // 'GMF / 4x1000' | 'Intereses y Ajustes' | 'Comisiones y Cuotas'
  bankRows: NormalizedRow[];
  ledgerRows: NormalizedRow[];
  totalBankAmount: number;
  totalLedgerAmount: number;
  difference: number;
  status: MatchStatus;
  confidence: number;
  rule: string;
}

export interface InvestigationItem {
  id: string;
  source: 'bank' | 'ledger';
  date: string | null;
  amount: number;
  description: string;
  reference?: string | null;
  identifier?: string | null;
  reason: string;
  ruleTriggered: 'threshold_amount' | 'pattern_frequency' | 'aging_days';
}

export interface ValidationCheck {
  name: string;
  description: string;
  expected: number | string | boolean;
  obtained: number | string | boolean;
  ok: boolean;
  message: string;
}

export interface ValidationReport {
  isValid: boolean;
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
}

export interface ReconciliationStatement {
  bankStatementBalance: number;
  depositsInTransit: number; // (+) libro sin banco, ingresos
  paymentsInTransit: number; // (−) libro sin banco, egresos
  adjustedBankBalance: number;
  ledgerBalance: number;
  unrecordedCreditNotes: number; // (+) banco sin libro, ingresos
  unrecordedDebitNotes: number; // (−) banco sin libro, egresos
  openingDifference: number; // Saldo inicial libros − saldo anterior banco
  adjustedLedgerBalance: number;
  finalDifference: number; // debe ser 0
  statementNetMovement: number; // Suma neta del extracto
  differenceBeforeItems: number; // Diferencia total antes de partidas
  investigationItems?: InvestigationItem[];
  validationReport?: ValidationReport;
}

export interface AccountSection {
  code: string;
  name: string;
  initialBalance: number;
  finalBalance: number;
  debits: number;
  credits: number;
}

export interface ReconciliationMetadata {
  companyName?: string;
  companyNit?: string;
  period?: string;
  generatedAt?: string;
  bankAccount?: string;
  bankEntity?: string;
  bankPreviousBalance?: number;
  bankCurrentBalance?: number;
  bankTotalCredits?: number;
  bankTotalDebits?: number;
  ledgerAccount?: string;
  accountCode?: string;
  accountName?: string;
  ledgerEntity?: string;
  ledgerInitialBalance?: number;
  ledgerFinalBalance?: number;
  ledgerTotalDebits?: number;
  ledgerTotalCredits?: number;
  accountMatchWarning?: string | null;
  availableAccounts?: AccountSection[];
}

export interface MatchResult {
  rowIdBank?: string | null;
  rowIdLedger?: string | null;
  voucher?: string | null;
  status: MatchStatus;
  exceptionType: ExceptionType | null;
  treatment?: string | null;
  bankDate: string | null;
  bankAmount: number | null;
  bankId: string | null;
  bankName: string | null;
  bankReference: string | null;
  ledgerDate: string | null;
  ledgerAmount: number | null;
  ledgerId: string | null;
  ledgerName: string | null;
  ledgerReference: string | null;
  amountDiff: number | null;
  daysDiff?: number | null;
  matchRule: string | null;
  confidence: number;
  humanStatus?: HumanStatus;
  comment?: string | null;
  rowIndexBank: number | null;
  rowIndexLedger: number | null;
}

export interface ReconciliationResult {
  matches: MatchResult[];
  groups: GroupMatch[];
  statement: ReconciliationStatement;
  metadata?: ReconciliationMetadata;
  investigationItems: InvestigationItem[];
  validationReport: ValidationReport;
  summary: {
    totalBank: number;
    totalLedger: number;
    reconciled: number;
    suggestions: number;
    exceptions: number;
    groupsCount: number;
    totalAmountReconciled: number;
    autoPercentage: number;
    bankEffectiveness: number;
    ledgerEffectiveness: number;
    bankReconciledCount: number;
    ledgerReconciledCount: number;
  };
}

export interface AuditEntry {
  id: string;
  owner_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const PLAN_LIMITS: Record<Plan, { companies: number; label: string; price: string }> = {
  esencial: { companies: 5, label: 'Esencial', price: '120.000' },
  profesional: { companies: 20, label: 'Profesional', price: '250.000' },
  firma: { companies: 60, label: 'Firma', price: '600.000' },
};
