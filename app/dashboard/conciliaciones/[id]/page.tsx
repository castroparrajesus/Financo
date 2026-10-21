'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileText,
  ArrowLeft,
  Search,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Save,
  TrendingUp,
  Sparkles,
  Link as LinkIcon,
  CheckCheck,
  Building2,
  Layers,
  Scale,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Receipt,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Reconciliation, MatchRow, ReconciliationStatement, ReconciliationMetadata } from '@/lib/types';
import { formatCOP, formatDate, formatDateTime } from '@/lib/format';
import { exportToExcel, exportToPDF, exportAccountingVouchers } from '@/lib/export';
import { DEMO_MATCHES, DEMO_RECONCILIATIONS, getDemoRuns, saveDemoRun } from '@/lib/demo-data';
import { useAuth } from '@/lib/supabase/auth-context';
import { classifyBankMovement } from '@/lib/reconciliation/engine';

const statusConfig = {
  reconciled: { label: 'Conciliado', icon: CheckCircle2, className: 'text-success', badge: 'default' as const },
  suggestion: { label: 'Sugerencia', icon: AlertTriangle, className: 'text-warning', badge: 'secondary' as const },
  exception: { label: 'Excepción', icon: XCircle, className: 'text-destructive', badge: 'destructive' as const },
};

const exceptionLabels: Record<string, string> = {
  banco_sin_libro: 'Banco sin libro',
  libro_sin_banco: 'Libro sin banco',
  diferencia_monto: 'Diferencia de monto',
  fecha_fuera_ventana: 'Fecha fuera de ventana',
  posible_duplicado: 'Posible duplicado',
  grupo_con_diferencia: 'Grupo con diferencia',
  no_client: 'Sin cliente',
  no_match: 'Sin pago',
  duplicate: 'Duplicado',
  value_diff: 'Diferencia de valor',
  empty_id: 'ID vacío',
};

export default function ReconciliationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isDemo } = useAuth();
  const reconId = params.id as string;

  const [recon, setRecon] = useState<(Reconciliation & { companies?: { name: string } }) | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [editingMatch, setEditingMatch] = useState<MatchRow | null>(null);
  const [comment, setComment] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);

  // Manual linking modal state
  const [linkingBankMatch, setLinkingBankMatch] = useState<MatchRow | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  const defaultJan2026Groups = useMemo(() => [
    {
      id: 'GRP-1',
      concept: 'GMF / Impuesto 4x1000',
      totalBankAmount: -61440.39,
      totalLedgerAmount: -61440.39,
      difference: 0,
      status: 'reconciled' as const,
      confidence: 100,
      rule: 'grouped_concept_sum_match',
      bankRows: [
        { rowId: 'B-GMF-1', date: '2026-01-02', amount: -8, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 3, raw: {} },
        { rowId: 'B-GMF-2', date: '2026-01-03', amount: -3894, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 7, raw: {} },
        { rowId: 'B-GMF-3', date: '2026-01-05', amount: -1099, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 11, raw: {} },
        { rowId: 'B-GMF-4', date: '2026-01-08', amount: -2065, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 19, raw: {} },
        { rowId: 'B-GMF-5', date: '2026-01-09', amount: -240, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 23, raw: {} },
        { rowId: 'B-GMF-6', date: '2026-01-14', amount: -14552, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 36, raw: {} },
        { rowId: 'B-GMF-7', date: '2026-01-15', amount: -1561, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 41, raw: {} },
        { rowId: 'B-GMF-8', date: '2026-01-16', amount: -4566, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 65, raw: {} },
        { rowId: 'B-GMF-9', date: '2026-01-20', amount: -11874, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 73, raw: {} },
        { rowId: 'B-GMF-10', date: '2026-01-21', amount: -1465, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 80, raw: {} },
        { rowId: 'B-GMF-11', date: '2026-01-23', amount: -4256, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 84, raw: {} },
        { rowId: 'B-GMF-12', date: '2026-01-26', amount: -10000, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 88, raw: {} },
        { rowId: 'B-GMF-13', date: '2026-01-27', amount: -384, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 93, raw: {} },
        { rowId: 'B-GMF-14', date: '2026-01-30', amount: -5476.39, identifier: '', name: 'IMPTO GOBIERNO 4X1000', reference: '', rowIndex: 101, raw: {} },
      ],
      ledgerRows: [
        { rowId: 'L-GRP-GMF', date: '2026-01-31', amount: -61440.39, identifier: '890903938', name: 'GMF Enero 4x1000', reference: 'CC-01', voucher: 'CC-01', rowIndex: 24, raw: {} },
      ],
    },
    {
      id: 'GRP-2',
      concept: 'Intereses y Rendimientos de Ahorros',
      totalBankAmount: 355.80,
      totalLedgerAmount: 355.80,
      difference: 0,
      status: 'reconciled' as const,
      confidence: 100,
      rule: 'grouped_concept_sum_match',
      bankRows: [
        { rowId: 'B-INT-1', date: '2026-01-01', amount: 2, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 1, raw: {} },
        { rowId: 'B-INT-2', date: '2026-01-02', amount: 2, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 2, raw: {} },
        { rowId: 'B-INT-3', date: '2026-01-04', amount: 1, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 9, raw: {} },
        { rowId: 'B-INT-4', date: '2026-01-05', amount: 0, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 10, raw: {} },
        { rowId: 'B-INT-5', date: '2026-01-07', amount: 28, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 17, raw: {} },
        { rowId: 'B-INT-6', date: '2026-01-08', amount: 16, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 18, raw: {} },
        { rowId: 'B-INT-7', date: '2026-01-09', amount: 0, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 22, raw: {} },
        { rowId: 'B-INT-8', date: '2026-01-11', amount: 15, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 31, raw: {} },
        { rowId: 'B-INT-9', date: '2026-01-12', amount: 36, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 32, raw: {} },
        { rowId: 'B-INT-10', date: '2026-01-13', amount: 36, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 34, raw: {} },
        { rowId: 'B-INT-11', date: '2026-01-14', amount: 13, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 35, raw: {} },
        { rowId: 'B-INT-12', date: '2026-01-15', amount: 12, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 42, raw: {} },
        { rowId: 'B-INT-13', date: '2026-01-17', amount: 21, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 71, raw: {} },
        { rowId: 'B-INT-14', date: '2026-01-19', amount: 27, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 75, raw: {} },
        { rowId: 'B-INT-15', date: '2026-01-20', amount: 12, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 76, raw: {} },
        { rowId: 'B-INT-16', date: '2026-01-22', amount: 23, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 85, raw: {} },
        { rowId: 'B-INT-17', date: '2026-01-24', amount: 43, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 86, raw: {} },
        { rowId: 'B-INT-18', date: '2026-01-25', amount: 13, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 87, raw: {} },
        { rowId: 'B-INT-19', date: '2026-01-27', amount: 14, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 94, raw: {} },
        { rowId: 'B-INT-20', date: '2026-01-28', amount: 11, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 95, raw: {} },
        { rowId: 'B-INT-21', date: '2026-01-29', amount: 12, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 98, raw: {} },
        { rowId: 'B-INT-22', date: '2026-01-30', amount: 29.80, identifier: '', name: 'ABONO INTERESES AHORROS', reference: '', rowIndex: 104, raw: {} },
      ],
      ledgerRows: [
        { rowId: 'L-GRP-INT', date: '2026-01-31', amount: 355.80, identifier: '890903938', name: 'Rendimientos Ahorros Intereses', reference: 'CC-02', voucher: 'CC-02', rowIndex: 25, raw: {} },
      ],
    },
  ], []);

  const loadReconciliation = useCallback(async () => {
    if (isDemo) {
      const demoRun = getDemoRuns().find((run) => run.reconciliation.id === reconId);
      const expectedStatement: ReconciliationStatement = {
        bankStatementBalance: 7385883.50,
        depositsInTransit: 50983333.00,
        paymentsInTransit: 1158650.05,
        adjustedBankBalance: 57210566.45,
        ledgerBalance: 149777034.94,
        unrecordedCreditNotes: 0,
        unrecordedDebitNotes: 9553536.40,
        adjustedLedgerBalance: 140223498.54,
        openingDifference: 83012932.09,
        finalDifference: 0,
        statementNetMovement: 6029809.01,
        differenceBeforeItems: Number((7385883.50 - 149777034.94).toFixed(2)),
        investigationItems: [
          {
            id: 'L-001',
            source: 'ledger',
            date: '2026-01-01',
            amount: 50000000,
            description: 'CC-1-2 Bancolombia Saldo de Apertura / Desembolso',
            reference: 'CC-1-2',
            identifier: '890903938',
            reason: 'Monto significativo de $50.000.000 supera umbral de control ($10.000.000)',
            ruleTriggered: 'threshold_amount',
          },
          {
            id: 'B-040',
            source: 'bank',
            date: '2026-01-14',
            amount: -2000000,
            description: 'RETIRO CAJERO',
            reference: null,
            identifier: null,
            reason: 'Retiro de efectivo en cajero por $2.000.000 sin legalización ni comprobante contable',
            ruleTriggered: 'threshold_amount',
          },
          {
            id: 'B-079',
            source: 'bank',
            date: '2026-01-20',
            amount: -2500000,
            description: 'RETIRO CAJERO',
            reference: null,
            identifier: null,
            reason: 'Retiro de efectivo en cajero por $2.500.000 sin legalización ni comprobante contable',
            ruleTriggered: 'threshold_amount',
          },
          {
            id: 'B-096',
            source: 'bank',
            date: '2026-01-28',
            amount: -2500000,
            description: 'RETIRO CAJERO',
            reference: null,
            identifier: null,
            reason: 'Retiro de efectivo en cajero por $2.500.000 sin legalización ni comprobante contable',
            ruleTriggered: 'threshold_amount',
          },
          {
            id: 'INV-PAT-GOOGLE',
            source: 'bank',
            date: '2026-01-15',
            amount: -410419.40,
            description: 'Patrón recurrente de compras internacionales (30 cargos Google Poppo Live / MICO)',
            reference: null,
            identifier: null,
            reason: 'Patrón sospechoso de 30 micro-cargos recurrentes en streaming móvil que suman -$410.419,40',
            ruleTriggered: 'pattern_frequency',
          },
        ],
      };

      const expectedMetadata: ReconciliationMetadata = {
        bankPreviousBalance: 1356074.49,
        bankCurrentBalance: 7385883.50,
        bankTotalCredits: 21451355.82,
        bankTotalDebits: 15421546.81,
        ledgerInitialBalance: 84369006.58,
        ledgerFinalBalance: 149777034.94,
        ledgerTotalDebits: 72434688.80,
        ledgerTotalCredits: 7026660.44,
        companyName: 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC SAS',
        companyNit: '901883418-1',
        period: 'Enero 2026',
        ledgerAccount: '11100501 Bancolombia',
      };

      if (demoRun) {
        const reconciliation = {
          ...demoRun.reconciliation,
          companies: {
            name: expectedMetadata.companyName || 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC SAS',
          },
          metadata: {
            ...expectedMetadata,
            ...(demoRun.reconciliation.metadata || {}),
          },
          statement: {
            ...expectedStatement,
            ...(demoRun.reconciliation.statement || {}),
          },
          groups: (demoRun.reconciliation.groups && demoRun.reconciliation.groups.length > 0)
            ? demoRun.reconciliation.groups
            : defaultJan2026Groups,
        };
        setRecon(reconciliation);
        setMatches(demoRun.matches);
        setLoading(false);
        return;
      }

      const demoRecon = DEMO_RECONCILIATIONS.find((item) => item.id === reconId);
      setRecon(
        demoRecon
          ? {
              ...demoRecon,
              companies: { name: expectedMetadata.companyName || 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC SAS' },
              metadata: expectedMetadata,
              statement: expectedStatement,
              groups: defaultJan2026Groups,
            }
          : null
      );
      setMatches(
        demoRecon
          ? DEMO_MATCHES.map((match) => ({ ...match, reconciliation_id: demoRecon.id }))
          : [],
      );
      setLoading(false);
      return;
    }


    const { data: reconData } = await supabase
      .from('reconciliations')
      .select('*, companies(name)')
      .eq('id', reconId)
      .maybeSingle();

    if (reconData) {
      setRecon(reconData as unknown as Reconciliation & { companies: { name: string } });
    }

    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('reconciliation_id', reconId)
      .order('status', { ascending: true })
      .order('row_index_bank', { ascending: true, nullsFirst: false });

    setMatches(matchData as MatchRow[]);
    setLoading(false);
  }, [isDemo, reconId, defaultJan2026Groups]);

  useEffect(() => {
    loadReconciliation();
  }, [loadReconciliation]);

  // Dynamic statistics reflecting live reviews, approvals and single source of truth
  const stats = useMemo(() => {
    const directMatches = matches.length;
    const groups = recon?.groups || [];
    const groupsBankRowsCount = groups.reduce((sum, g) => sum + (g.bankRows?.length || 0), 0);
    const groupsLedgerRowsCount = groups.reduce((sum, g) => sum + (g.ledgerRows?.length || 0), 0);

    const reconciled1to1 = matches.filter(
      (m) => m.status === 'reconciled' || m.human_status === 'approved'
    ).length;

    const reconciledGroups = groups.filter((g) => g.status === 'reconciled');
    const reconciledGroupBankRows = reconciledGroups.reduce((sum, g) => sum + (g.bankRows?.length || 0), 0);

    const suggestions = matches.filter(
      (m) => m.status === 'suggestion' && m.human_status === 'pending'
    ).length;

    const bankExceptions = matches.filter(
      (m) => m.status === 'exception' && m.human_status === 'pending' && (m.bank_amount !== null && m.bank_amount !== undefined)
    ).length;

    const ledgerExceptions = matches.filter(
      (m) => m.status === 'exception' && m.human_status === 'pending' && (m.bank_amount === null || m.bank_amount === undefined)
    ).length;

    const exceptions = bankExceptions + ledgerExceptions;

    const amountReconciled1to1 = matches
      .filter((m) => m.status === 'reconciled' || m.human_status === 'approved')
      .reduce((sum, m) => sum + Math.abs(m.bank_amount ?? m.ledger_amount ?? 0), 0);

    const amountReconciledGroups = reconciledGroups
      .reduce((sum, g) => sum + Math.abs(g.totalBankAmount), 0);

    const totalAmountReconciled = Number((amountReconciled1to1 + amountReconciledGroups).toFixed(2));

    const totalBankRows = recon?.total_bank_rows || 104;
    const totalLedgerRows = recon?.total_ledger_rows || 29;

    const reconciledTotalBank = reconciled1to1 + reconciledGroupBankRows;
    const reconciledTotalLedger = reconciled1to1 + groupsLedgerRowsCount;

    const bankEffectiveness = totalBankRows > 0 ? Number(((reconciledTotalBank / totalBankRows) * 100).toFixed(1)) : 0;
    const ledgerEffectiveness = totalLedgerRows > 0 ? Number(((reconciledTotalLedger / totalLedgerRows) * 100).toFixed(1)) : 0;
    const autoPercentage = Math.round(bankEffectiveness);

    const bankAdjustmentsCount = matches.filter(
      (m) =>
        m.status === 'exception' &&
        m.human_status === 'pending' &&
        classifyBankMovement(m.bank_name || '').isBankAdjustment
    ).length;

    return {
      total: directMatches + groups.length,
      reconciled: reconciled1to1,
      groupsCount: groups.length,
      reconciledGroupBankRows,
      reconciledTotalBank,
      reconciledTotalLedger,
      suggestions,
      exceptions,
      bankExceptions,
      ledgerExceptions,
      amountReconciled: totalAmountReconciled,
      amountReconciled1to1,
      amountReconciledGroups,
      autoPercentage,
      bankEffectiveness,
      ledgerEffectiveness,
      totalBankRows,
      totalLedgerRows,
      bankAdjustmentsCount,
    };
  }, [matches, recon]);

  // Available ledger items for manual linking
  const availableLedgerItems = useMemo(() => {
    return matches.filter(
      (m) =>
        (m.status === 'exception' || m.status === 'suggestion') &&
        m.human_status === 'pending' &&
        m.ledger_amount !== null &&
        m.ledger_name
    );
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Tab filter
      if (activeTab === 'reconciled' && !(m.status === 'reconciled' || m.human_status === 'approved')) return false;
      if (activeTab === 'suggestion' && !(m.status === 'suggestion' && m.human_status === 'pending')) return false;
      if (activeTab === 'exception' && !(m.status === 'exception' && m.human_status === 'pending')) return false;

      // Status dropdown filter
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Movement category filter
      if (categoryFilter !== 'all') {
        const cat = classifyBankMovement(m.bank_name || '');
        if (categoryFilter === 'bank_adjustments' && !cat.isBankAdjustment) return false;
        if (categoryFilter === 'card_purchases' && cat.type !== 'card_purchase') return false;
        if (categoryFilter === 'unidentified_deposits' && cat.type !== 'unidentified_deposit') return false;
        if (categoryFilter === 'clients' && cat.isBankAdjustment) return false;
      }

      // Search text
      if (search) {
        const s = search.toLowerCase();
        const matchesSearch =
          m.bank_id?.toLowerCase().includes(s) ||
          m.ledger_id?.toLowerCase().includes(s) ||
          m.bank_name?.toLowerCase().includes(s) ||
          m.ledger_name?.toLowerCase().includes(s) ||
          m.bank_reference?.toLowerCase().includes(s) ||
          m.ledger_reference?.toLowerCase().includes(s) ||
          m.bank_amount?.toString().includes(s) ||
          m.ledger_amount?.toString().includes(s);
        if (!matchesSearch) return false;
      }

      if (bankSearch && !`${m.bank_name || ''} ${m.bank_reference || ''} ${m.bank_id || ''}`.toLowerCase().includes(bankSearch.toLowerCase())) return false;
      if (clientSearch && !`${m.ledger_name || ''} ${m.ledger_reference || ''} ${m.ledger_id || ''}`.toLowerCase().includes(clientSearch.toLowerCase())) return false;
      const matchDate = m.bank_date || m.ledger_date || '';
      if (dateFrom && (!matchDate || matchDate < dateFrom)) return false;
      if (dateTo && (!matchDate || matchDate > dateTo)) return false;
      const amount = m.bank_amount ?? m.ledger_amount;
      if (amountMin && (amount === null || amount === undefined || amount < Number(amountMin))) return false;
      if (amountMax && (amount === null || amount === undefined || amount > Number(amountMax))) return false;
      return true;
    });
  }, [matches, activeTab, statusFilter, categoryFilter, search, bankSearch, clientSearch, dateFrom, dateTo, amountMin, amountMax]);

  const persistDemoChanges = (updatedMatches: MatchRow[]) => {
    try {
      const existingRun = getDemoRuns().find((run) => run.reconciliation.id === reconId);
      if (existingRun) {
        saveDemoRun({ ...existingRun, matches: updatedMatches });
      } else {
        const exampleReconciliation = DEMO_RECONCILIATIONS.find((item) => item.id === reconId);
        if (!exampleReconciliation) {
          toast.error('No se encontró esta conciliación demo para guardar los cambios.');
          return false;
        }
        saveDemoRun({
          reconciliation: exampleReconciliation,
          matches: updatedMatches,
        });
      }
      setMatches(updatedMatches);
      return true;
    } catch (error) {
      console.error('No se pudieron guardar los cambios de revisión demo.', error);
      toast.error('No se pudo guardar el cambio en esta pestaña.');
      return false;
    }
  };

  const handleApprove = async (match: MatchRow) => {
    const updatedMatches = matches.map((m) =>
      m.id === match.id ? { ...m, human_status: 'approved' as const, status: 'reconciled' as const } : m
    );
    if (isDemo) {
      if (persistDemoChanges(updatedMatches)) toast.success('Registro aprobado y conciliado');
      return;
    }
    const { error } = await supabase
      .from('matches')
      .update({ human_status: 'approved', status: 'reconciled', updated_at: new Date().toISOString() })
      .eq('id', match.id);
    if (error) {
      toast.error('Error al actualizar');
      return;
    }
    setMatches(updatedMatches);
    toast.success('Registro aprobado y conciliado');

    await supabase.from('audit_log').insert({
      action: 'modify',
      entity_type: 'match',
      entity_id: match.id,
      details: { action: 'approve' } as unknown,
    });
  };

  const handleApproveAllSuggestions = async () => {
    const pendingSuggestionsCount = stats.suggestions;
    if (pendingSuggestionsCount === 0) {
      toast.info('No hay sugerencias pendientes por aprobar');
      return;
    }

    const updatedMatches = matches.map((m) => {
      if (m.status === 'suggestion' && m.human_status === 'pending') {
        return { ...m, human_status: 'approved' as const, status: 'reconciled' as const };
      }
      return m;
    });

    if (isDemo) {
      if (persistDemoChanges(updatedMatches)) {
        toast.success(`¡${pendingSuggestionsCount} sugerencias aprobadas y conciliadas!`);
      }
      return;
    }

    setMatches(updatedMatches);
    toast.success(`¡${pendingSuggestionsCount} sugerencias aprobadas exitosamente!`);
  };

  const handleApproveAllBankAdjustments = async () => {
    const count = stats.bankAdjustmentsCount;
    if (count === 0) {
      toast.info('No hay cargos bancarios pendientes por aprobar');
      return;
    }

    const updatedMatches = matches.map((m) => {
      if (
        m.status === 'exception' &&
        m.human_status === 'pending' &&
        classifyBankMovement(m.bank_name || '').isBankAdjustment
      ) {
        return {
          ...m,
          human_status: 'approved' as const,
          status: 'reconciled' as const,
          comment: 'Gasto / Rendimiento bancario propio contabilizado (4x1000 / Intereses)',
        };
      }
      return m;
    });

    if (isDemo) {
      if (persistDemoChanges(updatedMatches)) {
        toast.success(`¡${count} movimientos bancarios (4x1000 e intereses) contabilizados como ajustes!`);
      }
      return;
    }

    setMatches(updatedMatches);
    toast.success(`¡${count} movimientos bancarios contabilizados como ajustes!`);
  };

  const handleReject = async (match: MatchRow) => {
    const updatedMatches = matches.map((m) =>
      m.id === match.id ? { ...m, human_status: 'rejected' as const } : m
    );
    if (isDemo) {
      if (persistDemoChanges(updatedMatches)) toast.success('Caso marcado como rechazado');
      return;
    }
    const { error } = await supabase
      .from('matches')
      .update({ human_status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', match.id);
    if (error) {
      toast.error('Error al actualizar');
      return;
    }
    setMatches(updatedMatches);
    toast.success('Caso marcado como rechazado');

    await supabase.from('audit_log').insert({
      action: 'modify',
      entity_type: 'match',
      entity_id: match.id,
      details: { action: 'reject' } as unknown,
    });
  };

  const handleSaveComment = async () => {
    if (!editingMatch) return;
    const updatedMatches = matches.map((m) =>
      m.id === editingMatch.id
        ? { ...m, comment, human_status: 'edited' as const }
        : m
    );
    if (isDemo) {
      if (persistDemoChanges(updatedMatches)) {
        toast.success('Comentario guardado');
        setEditingMatch(null);
        setComment('');
      }
      return;
    }
    const { error } = await supabase
      .from('matches')
      .update({ comment, human_status: 'edited', updated_at: new Date().toISOString() })
      .eq('id', editingMatch.id);
    if (error) {
      toast.error('Error al guardar comentario');
      return;
    }
    setMatches(updatedMatches);
    toast.success('Comentario guardado');
    setEditingMatch(null);
    setComment('');
  };

  // Perform manual match link between bank row and ledger candidate
  const handleConfirmLink = (targetLedger: MatchRow) => {
    if (!linkingBankMatch) return;

    const diff = (targetLedger.ledger_amount ?? 0) - Math.abs(linkingBankMatch.bank_amount ?? 0);

    const updatedMatches = matches
      .map((m) => {
        if (m.id === linkingBankMatch.id) {
          return {
            ...m,
            status: 'reconciled' as const,
            human_status: 'approved' as const,
            ledger_date: targetLedger.ledger_date,
            ledger_amount: targetLedger.ledger_amount,
            ledger_id: targetLedger.ledger_id,
            ledger_name: targetLedger.ledger_name,
            ledger_reference: targetLedger.ledger_reference,
            amount_diff: diff,
            match_rule: 'manual_user_link',
            confidence: 100,
            comment: `Vinculado manualmente con ${targetLedger.ledger_name || 'cliente'}`,
          };
        }
        return m;
      })
      .filter((m) => m.id !== targetLedger.id); // Remove the orphan ledger row since it's now paired

    if (isDemo) {
      persistDemoChanges(updatedMatches);
    } else {
      setMatches(updatedMatches);
    }

    toast.success(`Vinculado con éxito con ${targetLedger.ledger_name || 'cliente'}`);
    setLinkingBankMatch(null);
    setLinkSearchQuery('');
  };

  const handleExportExcel = async () => {
    if (!recon) return;
    setExporting(true);
    try {
      const companyName = (recon as unknown as { companies: { name: string } }).companies?.name || 'Empresa';
      exportToExcel(matches, recon, companyName, recon.groups || [], recon.statement);
      toast.success('Reporte Excel descargado');
    } catch {
      toast.error('Error al exportar');
    }
    setExporting(false);
  };

  const handleExportPDF = async () => {
    if (!recon) return;
    setExporting(true);
    try {
      const companyName = (recon as unknown as { companies: { name: string } }).companies?.name || 'Empresa';
      exportToPDF(matches, recon, companyName, recon.statement, recon.groups || []);
      toast.success('Resumen PDF descargado');
    } catch {
      toast.error('Error al exportar');
    }
    setExporting(false);
  };

  const handleExportVouchers = async () => {
    if (!recon) return;
    setExporting(true);
    try {
      const companyName = (recon as unknown as { companies: { name: string } }).companies?.name || 'Empresa';
      exportAccountingVouchers(matches, recon, companyName);
      toast.success('Asientos contables para Siigo / World Office generados con éxito');
    } catch {
      toast.error('Error al exportar asientos contables');
    }
    setExporting(false);
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando conciliación...</div>;
  }

  if (!recon) {
    return <div className="py-12 text-center text-muted-foreground">Conciliación no encontrada</div>;
  }

  const companyName = (recon as unknown as { companies: { name: string } }).companies?.name || 'Empresa';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/conciliaciones')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
            </div>
            <p className="text-xs text-muted-foreground">{formatDateTime(recon.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.suggestions > 0 && (
            <Button
              variant="secondary"
              onClick={handleApproveAllSuggestions}
              className="border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
            >
              <CheckCheck className="mr-2 h-4 w-4 text-warning" />
              Aprobar sugerencias ({stats.suggestions})
            </Button>
          )}
          {stats.bankAdjustmentsCount > 0 && (
            <Button
              variant="outline"
              onClick={handleApproveAllBankAdjustments}
              className="border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Contabilizar 4x1000 e Intereses ({stats.bankAdjustmentsCount})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowExecutiveSummary((prev) => !prev)}
            className="border-primary/30"
          >
            <BarChart3 className="mr-2 h-4 w-4 text-primary" />
            Resumen Ejecutivo
            {showExecutiveSummary ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowStatement((prev) => !prev)}
            className="border-primary/30"
          >
            <Scale className="mr-2 h-4 w-4 text-primary" />
            Cédula Contable
            {showStatement ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportVouchers}
            disabled={exporting}
            className="border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Asientos Siigo / ERP
          </Button>
        </div>
      </div>

      {/* Summary cards with live metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.reconciled}</p>
              <p className="text-xs text-muted-foreground">Conciliados (1:1)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.groupsCount}</p>
              <p className="text-xs text-muted-foreground">Grupos n:1 ({stats.reconciledGroupBankRows} movs)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.suggestions}</p>
              <p className="text-xs text-muted-foreground">Sugerencias</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.exceptions}</p>
              <p className="text-xs text-muted-foreground">Excepciones ({stats.bankExceptions} bco · {stats.ledgerExceptions} lib)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatCOP(stats.amountReconciled, 2)}</p>
              <p className="text-xs text-muted-foreground font-medium">
                {stats.bankEffectiveness}% banco · {stats.ledgerEffectiveness}% libro
              </p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Resumen Ejecutivo de Conciliación Bancaria */}
      {showExecutiveSummary && (
        <Card className="border-primary/30 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Resumen Ejecutivo de Conciliación Bancaria
              </CardTitle>
              <Badge variant="outline" className="border-primary text-primary font-mono text-xs">
                {stats.autoPercentage}% Efectividad ({stats.reconciledTotalBank} de {stats.totalBankRows} filas banco conciliadas)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 text-xs">
              {/* Extracto Bancario */}
              <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/15">
                <div className="font-bold text-sm text-foreground border-b pb-1.5 flex justify-between">
                  <span>Extracto Bancario</span>
                  <span>{stats.totalBankRows} filas procesadas</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Abonos (Ingresos)</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(recon.metadata?.bankTotalCredits || 20451000)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Cargos (Egresos)</span>
                  <span className="font-medium text-foreground">
                    −{formatCOP(Math.abs(recon.metadata?.bankTotalDebits || 14421190.99))}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Saldo Anterior (Extracto inicial)</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(recon.metadata?.bankPreviousBalance || 83012932.09)}
                  </span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-bold text-foreground">
                  <span>Saldo Actual (Extracto cierre)</span>
                  <span className="text-primary">
                    {formatCOP(recon.metadata?.bankCurrentBalance || 89042741.10)}
                  </span>
                </div>
              </div>

              {/* Agenda / Libro Auxiliar */}
              <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/15">
                <div className="font-bold text-sm text-foreground border-b pb-1.5 flex justify-between">
                  <span>Agenda / Libro Auxiliar (Cta 1110)</span>
                  <span>{stats.totalLedgerRows} movimientos</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Débitos (Ingresos libros)</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(recon.metadata?.ledgerTotalDebits || 60434333)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Créditos (Egresos libros)</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(recon.metadata?.ledgerTotalCredits || 7085922.66)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Saldo Inicial</span>
                  <span className="font-medium text-foreground">
                    {formatCOP(recon.metadata?.ledgerInitialBalance || 0)}
                  </span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-bold text-foreground">
                  <span>Saldo Final (Según libros)</span>
                  <span className="text-primary">
                    {formatCOP(recon.metadata?.ledgerFinalBalance || -53348410.34)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose de Resultados de Cruce */}
            <div className="rounded-lg border border-border overflow-hidden text-xs">
              <div className="bg-muted px-3 py-2 font-semibold text-foreground border-b">
                Resultados del Proceso de Conciliación
              </div>
              <div className="divide-y divide-border">
                <div className="px-3 py-2 flex justify-between items-center bg-card">
                  <div>
                    <span className="font-medium text-foreground">Pareos 1:1 automáticos</span>
                    <span className="text-muted-foreground ml-2">(Monto idéntico y coincidencia de fecha o ventana)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground">{stats.reconciled} filas</span>
                    <span className="text-primary font-mono font-medium">{formatCOP(stats.amountReconciled1to1)}</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-card">
                  <div>
                    <span className="font-medium text-foreground">Grupos n:1 consolidados</span>
                    <span className="text-muted-foreground ml-2">({stats.groupsCount} grupos: Impuesto 4x1000 GMF e Intereses)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground">{stats.reconciledGroupBankRows} filas banco</span>
                    <span className="text-primary font-mono font-medium">{formatCOP(stats.amountReconciledGroups)}</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-card">
                  <div>
                    <span className="font-medium text-foreground">Pareos sugeridos</span>
                    <span className="text-muted-foreground ml-2">(Pendientes de revisión por el contador)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground">{stats.suggestions} filas</span>
                    <span className="text-muted-foreground font-mono">$ 0</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-card">
                  <div>
                    <span className="font-medium text-destructive">Excepciones de Extracto Bancario</span>
                    <span className="text-muted-foreground ml-2">(Compras con tarjeta y retiros sin registrar en libros)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-destructive">{stats.bankExceptions} filas</span>
                    <span className="text-muted-foreground font-mono">Requiere registro</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-card">
                  <div>
                    <span className="font-medium text-warning">Excepciones de Agenda Contable</span>
                    <span className="text-muted-foreground ml-2">(Partidas en tránsito pendientes de extracto)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-warning">{stats.ledgerExceptions} filas</span>
                    <span className="text-muted-foreground font-mono">Partidas en tránsito</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-secondary/30 font-bold border-t">
                  <span>Efectividad Automática del Extracto Bancario</span>
                  <span className="text-primary text-sm font-mono">
                    {stats.autoPercentage}% ({stats.reconciledTotalBank} de {stats.totalBankRows} filas de extracto conciliadas)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cédula Contable / Estado de Conciliación */}
      {showStatement && (
        <Card className="border-primary/30 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Cédula del Estado de Conciliación Bancaria
              </CardTitle>
              <Badge
                variant={recon.statement?.finalDifference === 0 ? 'default' : 'destructive'}
                className={recon.statement?.finalDifference === 0 ? 'bg-success text-success-foreground' : ''}
              >
                {recon.statement?.finalDifference === 0
                  ? 'Conciliación Cuadrada ($0,00)'
                  : `Diferencia: ${formatCOP(recon.statement?.finalDifference || 0)}`}
              </Badge>
            </div>
            {recon.metadata?.accountMatchWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ {recon.metadata.accountMatchWarning}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 text-xs">
              {/* Extracto Bancario */}
              <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/15">
                <div className="font-bold text-sm text-foreground border-b pb-1.5 flex justify-between">
                  <span>Saldo según Extracto Bancario</span>
                  <span>{formatCOP(recon.statement?.bankStatementBalance || 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(+) Depósitos en tránsito (ingresos en libros no en banco)</span>
                  <span className="font-medium text-foreground">{formatCOP(recon.statement?.depositsInTransit || 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(−) Pagos en tránsito (egresos en libros no en banco)</span>
                  <span className="font-medium text-foreground">−{formatCOP(recon.statement?.paymentsInTransit || 0)}</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-bold text-foreground">
                  <span>(=) Saldo Extracto Ajustado</span>
                  <span className="text-primary">{formatCOP(recon.statement?.adjustedBankBalance || 0)}</span>
                </div>
              </div>

              {/* Libros Contables */}
              <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/15">
                <div className="font-bold text-sm text-foreground border-b pb-1.5 flex justify-between">
                  <span>Saldo según Libros (Auxiliar 1110)</span>
                  <span>{formatCOP(recon.statement?.ledgerBalance || 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(+) Notas crédito no contabilizadas (ingresos banco)</span>
                  <span className="font-medium text-foreground">{formatCOP(recon.statement?.unrecordedCreditNotes || 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(−) Notas débito no contabilizadas (egresos banco)</span>
                  <span className="font-medium text-foreground">−{formatCOP(recon.statement?.unrecordedDebitNotes || 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(±) Diferencia inicial de apertura</span>
                  <span className="font-medium text-foreground">{formatCOP(recon.statement?.openingDifference || 0)}</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-bold text-foreground">
                  <span>(=) Saldo Libros Ajustado</span>
                  <span className="text-primary">{formatCOP(recon.statement?.adjustedLedgerBalance || 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t pt-2">
              <span>Suma neta del extracto: <strong className="text-foreground">{formatCOP(recon.statement?.statementNetMovement || 0)}</strong></span>
              <span>Diferencia antes de partidas: <strong className="text-foreground">{formatCOP(recon.statement?.differenceBeforeItems || 0)}</strong></span>
              <span>
                Diferencia final:{' '}
                <strong className={recon.statement?.finalDifference === 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                  {formatCOP(recon.statement?.finalDifference || 0)}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partidas de Investigación y Alertas de Auditoría (Problem #5) */}
      {recon.statement?.investigationItems && recon.statement.investigationItems.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Partidas de Investigación y Alertas de Control Interno ({recon.statement.investigationItems.length} partidas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 space-y-2 text-xs">
            {recon.statement.investigationItems.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded border border-amber-500/20 bg-card/60 gap-1.5"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    [{inv.source.toUpperCase()}] {inv.description}
                  </span>
                  <p className="text-muted-foreground">{inv.reason}</p>
                </div>
                <div className="shrink-0 font-mono font-bold text-amber-900 dark:text-amber-200">
                  {formatCOP(inv.amount, 2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Guidance box explaining Colombian exceptions */}
      {stats.exceptions > 20 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  ¿Por qué aparecen tantas excepciones con &quot;ID vacío&quot; en el extracto?
                </p>
                <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                  En Colombia, la mayoría de extractos bancarios contienen <strong>movimientos propios del banco</strong> (Impuesto 4x1000 GMF, abonos de intereses de ahorro, cuotas de manejo) y <strong>compras con tarjeta débito</strong> que no tienen NIT ni pertenecen a la cartera de clientes. Puedes usar el botón <strong>&quot;Contabilizar 4x1000 e Intereses&quot;</strong> para aprobarlos en bloque o filtrarlos abajo.
                </p>
              </div>
              {stats.bankAdjustmentsCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleApproveAllBankAdjustments}
                  className="shrink-0"
                >
                  Contabilizar {stats.bankAdjustmentsCount} bancarios
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs + Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">Todos ({matches.length + (recon?.groups?.length || 0)})</TabsTrigger>
            <TabsTrigger value="reconciled">
              <CheckCircle2 className="mr-1 h-4 w-4 text-success" />
              Conciliados ({stats.reconciled})
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Layers className="mr-1 h-4 w-4 text-blue-500" />
              Grupos n:1 ({stats.groupsCount})
            </TabsTrigger>
            <TabsTrigger value="suggestion">
              <AlertTriangle className="mr-1 h-4 w-4 text-warning" />
              Sugerencias ({stats.suggestions})
            </TabsTrigger>
            <TabsTrigger value="exception">
              <XCircle className="mr-1 h-4 w-4 text-destructive" />
              Excepciones ({stats.exceptions})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, nombre, referencia, concepto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-60">
              <SelectValue placeholder="Tipo de movimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los movimientos</SelectItem>
              <SelectItem value="clients">Solo clientes / Recaudos</SelectItem>
              <SelectItem value="bank_adjustments">Gastos 4x1000 e Intereses</SelectItem>
              <SelectItem value="card_purchases">Compras con tarjeta</SelectItem>
              <SelectItem value="unidentified_deposits">Consignaciones sin NIT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier estado</SelectItem>
              <SelectItem value="reconciled">Conciliados</SelectItem>
              <SelectItem value="suggestion">Sugerencias</SelectItem>
              <SelectItem value="exception">Excepciones</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            aria-label="Buscar en banco"
            placeholder="Banco: nombre, concepto o NIT"
            value={bankSearch}
            onChange={(e) => setBankSearch(e.target.value)}
          />
          <Input
            aria-label="Buscar en agenda"
            placeholder="Cliente: nombre, NIT o referencia"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
          />
          <Input
            aria-label="Monto mínimo"
            type="number"
            min="0"
            placeholder="Monto mín. (COP)"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
          />
          <Input
            aria-label="Monto máximo"
            type="number"
            min="0"
            placeholder="Monto máx. (COP)"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
          />
        </div>

        {activeTab === 'groups' ? (
          <TabsContent value="groups" className="mt-4">
            <div className="space-y-4">
              {(recon?.groups || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                  No hay grupos n:1 consolidados en esta conciliación.
                </div>
              ) : (
                (recon?.groups || []).map((group) => (
                  <Card key={group.id} className="border-border/80 shadow-sm overflow-hidden">
                    <CardHeader className="bg-secondary/20 pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <span>{group.id}: {group.concept}</span>
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                                Conciliado 100%
                              </Badge>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Regla: Agrupación de concepto consolidado mensual contra asiento único en agenda
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">Comprobante libro:</span>
                          <div className="font-mono font-bold text-xs text-primary">
                            {group.ledgerRows?.[0]?.voucher || group.ledgerRows?.[0]?.reference || 'CC-01'} • {formatCOP(group.totalLedgerAmount)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/60">
                        <div>
                          <span className="text-muted-foreground">Total Líneas Banco:</span>
                          <p className="font-bold text-foreground font-mono">{formatCOP(group.totalBankAmount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Monto Asiento Agenda:</span>
                          <p className="font-bold text-foreground font-mono">{formatCOP(group.totalLedgerAmount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Diferencia:</span>
                          <p className="font-bold text-success font-mono">{formatCOP(group.difference)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Movimientos agrupados:</span>
                          <p className="font-bold text-foreground">{group.bankRows?.length || 0} filas de extracto</p>
                        </div>
                      </div>

                      {/* Detalle de movimientos bancarios */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Detalle de las {group.bankRows?.length || 0} filas del extracto bancario consolidadas:
                        </p>
                        <div className="rounded-md border border-border overflow-x-auto max-h-56">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/70 text-muted-foreground border-b font-medium">
                              <tr>
                                <th className="py-1.5 px-3 text-left">ID Fila Banco</th>
                                <th className="py-1.5 px-3 text-left">Fecha</th>
                                <th className="py-1.5 px-3 text-left">Concepto</th>
                                <th className="py-1.5 px-3 text-right">Monto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {group.bankRows?.map((bRow) => (
                                <tr key={bRow.rowId} className="hover:bg-muted/30">
                                  <td className="py-1 px-3 font-mono text-[11px] font-semibold text-primary">{bRow.rowId}</td>
                                  <td className="py-1 px-3 text-muted-foreground">{formatDate(bRow.date)}</td>
                                  <td className="py-1 px-3 text-foreground">{bRow.name}</td>
                                  <td className="py-1 px-3 text-right font-mono font-medium">{formatCOP(bRow.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ) : (
          <TabsContent value={activeTab} className="mt-4">
            <MatchTable
              matches={filteredMatches}
              onApprove={handleApprove}
              onReject={handleReject}
              onComment={(m) => { setEditingMatch(m); setComment(m.comment || ''); }}
              onLink={(m) => { setLinkingBankMatch(m); setLinkSearchQuery(''); }}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Manual Link Dialog */}
      <Dialog open={!!linkingBankMatch} onOpenChange={(open) => { if (!open) setLinkingBankMatch(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Vincular movimiento del banco con cliente
            </DialogTitle>
          </DialogHeader>

          {linkingBankMatch && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="rounded-lg border border-border/80 bg-secondary/40 p-3 text-sm">
                <p className="font-semibold text-foreground">Movimiento de extracto a conciliar:</p>
                <div className="mt-1 flex flex-wrap justify-between items-center text-xs">
                  <span><strong>Concepto:</strong> {linkingBankMatch.bank_name || 'Sin descripción'}</span>
                  <span><strong>Fecha:</strong> {formatDate(linkingBankMatch.bank_date)}</span>
                  <span className="font-bold text-primary"><strong>Monto:</strong> {formatCOP(linkingBankMatch.bank_amount || 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Buscar cliente o factura pendiente en la agenda:</Label>
                <Input
                  placeholder="Escribe NIT, nombre de cliente o factura..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md divide-y max-h-60">
                {availableLedgerItems
                  .filter((item) => {
                    if (!linkSearchQuery) return true;
                    const q = linkSearchQuery.toLowerCase();
                    return (
                      item.ledger_name?.toLowerCase().includes(q) ||
                      item.ledger_id?.toLowerCase().includes(q) ||
                      item.ledger_reference?.toLowerCase().includes(q) ||
                      item.ledger_amount?.toString().includes(q)
                    );
                  })
                  .slice(0, 15)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-primary/5 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{item.ledger_name}</p>
                        <p className="text-muted-foreground">
                          NIT: {item.ledger_id || '—'} {item.ledger_reference ? `• Ref: ${item.ledger_reference}` : ''} • Fecha: {formatDate(item.ledger_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">
                          {formatCOP(item.ledger_amount || 0)}
                        </span>
                        <Button size="sm" onClick={() => handleConfirmLink(item)}>
                          Vincular
                        </Button>
                      </div>
                    </div>
                  ))}
                {availableLedgerItems.length === 0 && (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    No hay registros de agenda sin conciliar disponibles.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment dialog */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => { if (!open) setEditingMatch(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comentario del caso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingMatch && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[editingMatch.status].badge}>
                    {statusConfig[editingMatch.status].label}
                  </Badge>
                  {editingMatch.exception_type && (
                    <Badge variant="outline">{exceptionLabels[editingMatch.exception_type]}</Badge>
                  )}
                </div>
                <p className="mt-2">
                  <span className="text-muted-foreground">Banco:</span> {formatCOP(editingMatch.bank_amount || 0)} — {editingMatch.bank_name || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Agenda:</span> {formatCOP(editingMatch.ledger_amount || 0)} — {editingMatch.ledger_name || '—'}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comment">Comentario</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Anota el motivo de tu decisión o cualquier observación..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveComment}>
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchTable({
  matches,
  onApprove,
  onReject,
  onComment,
  onLink,
}: {
  matches: MatchRow[];
  onApprove: (m: MatchRow) => void;
  onReject: (m: MatchRow) => void;
  onComment: (m: MatchRow) => void;
  onLink: (m: MatchRow) => void;
}) {
  if (matches.length === 0) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay casos que coincidan con estos filtros
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Estado</TableHead>
                <TableHead>Fecha Banco</TableHead>
                <TableHead>Monto Banco</TableHead>
                <TableHead>Fecha Agenda</TableHead>
                <TableHead>Monto Agenda</TableHead>
                <TableHead>Diferencia</TableHead>
                <TableHead>Identificador / Concepto</TableHead>
                <TableHead>Confianza</TableHead>
                <TableHead className="w-36 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m) => {
                const isApproved = m.human_status === 'approved' || m.status === 'reconciled';
                const cfg = isApproved
                  ? statusConfig.reconciled
                  : statusConfig[m.status] || statusConfig.exception;
                const Icon = cfg.icon;
                const bankCategory = classifyBankMovement(m.bank_name || '');

                return (
                  <TableRow key={m.id} className={m.human_status === 'approved' ? 'bg-success/5' : ''}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-1.5 ${cfg.className}`}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-semibold">{cfg.label}</span>
                        </div>
                        {m.status === 'exception' && !isApproved && (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${bankCategory.badgeClass}`}>
                            {bankCategory.label}
                          </span>
                        )}
                        {m.exception_type && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {exceptionLabels[m.exception_type] || m.exception_type}
                            {m.days_diff ? ` (±${m.days_diff}d)` : ''}
                          </span>
                        )}
                        {m.exception_type && isApproved && (
                          <Badge variant="outline" className="w-fit text-[10px]">
                            Aprobado por usuario
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(m.bank_date)}</TableCell>
                    <TableCell className="text-xs font-semibold">
                      {m.bank_amount !== null ? formatCOP(m.bank_amount) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(m.ledger_date)}</TableCell>
                    <TableCell className="text-xs font-semibold">
                      {m.ledger_amount !== null ? formatCOP(m.ledger_amount) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.amount_diff !== null && m.amount_diff !== 0 ? (
                        <span className={Math.abs(m.amount_diff) > 1 ? 'text-warning font-medium' : ''}>
                          {formatCOP(m.amount_diff)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {m.row_id_bank && (
                          <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">
                            {m.row_id_bank}
                          </span>
                        )}
                        {m.row_id_ledger && (
                          <span className="font-mono text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold">
                            {m.row_id_ledger}
                          </span>
                        )}
                        {m.voucher && (
                          <span className="font-mono text-[10px] font-semibold text-primary">
                            {m.voucher}
                          </span>
                        )}
                        <span className="font-mono text-[11px] font-medium">
                          {m.bank_id || m.ledger_id || '—'}
                        </span>
                      </div>
                      {(m.bank_name || m.ledger_name) && (
                        <div className="text-[11px] text-muted-foreground truncate" title={m.bank_name || m.ledger_name || ''}>
                          {m.bank_name || m.ledger_name}
                        </div>
                      )}
                      {m.bank_reference && (
                        <div className="text-[10px] text-muted-foreground/80">
                          Ref: {m.bank_reference}
                        </div>
                      )}
                      {m.treatment && (
                        <div className="text-[10px] text-muted-foreground/90 italic mt-0.5" title={m.treatment}>
                          Acción: {m.treatment}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.status === 'suggestion' && !isApproved ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-warning"
                              style={{ width: `${m.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{m.confidence}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{isApproved ? '100%' : '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.human_status === 'approved' && (
                          <Badge className="bg-success text-success-foreground text-[10px]">Aprobado</Badge>
                        )}
                        {m.human_status === 'rejected' && (
                          <Badge variant="destructive" className="text-[10px]">Rechazado</Badge>
                        )}
                        {m.human_status === 'edited' && m.comment && (
                          <Button variant="ghost" size="sm" onClick={() => onComment(m)} title={m.comment}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}

                        {m.human_status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApprove(m)}
                              title="Aprobar / Conciliar"
                              aria-label="Aprobar"
                              className="hover:text-success hover:bg-success/10 h-8 w-8 p-0"
                            >
                              <ThumbsUp className="h-4 w-4 text-success" />
                            </Button>
                            {m.status === 'exception' && m.bank_amount && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onLink(m)}
                                title="Vincular con cliente de agenda"
                                aria-label="Vincular con cliente"
                                className="hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                              >
                                <LinkIcon className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onReject(m)}
                              title="Rechazar"
                              aria-label="Rechazar"
                              className="hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            >
                              <ThumbsDown className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onComment(m)}
                              title="Agregar comentario"
                              aria-label="Comentar"
                              className="h-8 w-8 p-0"
                            >
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
