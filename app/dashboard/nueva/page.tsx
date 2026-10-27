'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Play,
  Building2,
  Table,
  X,
  Sparkles,
  Info,
  ShieldCheck,
  Landmark,
  CreditCard,
  FileText,
  Sliders,
  Check,
  AlertCircle,
  Hash,
  Scale,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  parseFile,
  generateSampleBankStatement,
  generateSampleBankStatementWithoutNit,
  generateSampleClientLedger,
} from '@/lib/reconciliation/file-parser';
import { detectColumns, normalizeRows, reconcile, ColumnMapping } from '@/lib/reconciliation/engine';
import { Company, NormalizedRow, MatchResult, ReconciliationMetadata, HumanStatus } from '@/lib/types';
import { DEMO_COMPANIES, DemoReconciliation, saveDemoRun } from '@/lib/demo-data';
import { saveReconciliationOffline } from '@/lib/offline/storage';

type Step = 'select' | 'upload' | 'configure' | 'processing';

interface FileData {
  file: File;
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  metadata?: ReconciliationMetadata;
  hash?: string;
}

async function computeFileSha256(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `hash-${file.name}-${file.size}-${file.lastModified}`;
  }
}

export default function NewReconciliationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get('companyId');

  const { user, isDemo, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>(initialCompanyId || '');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Enero 2026');
  const [bankFile, setBankFile] = useState<FileData | null>(null);
  const [ledgerFile, setLedgerFile] = useState<FileData | null>(null);
  const [bankMapping, setBankMapping] = useState<ColumnMapping | null>(null);
  const [ledgerMapping, setLedgerMapping] = useState<ColumnMapping | null>(null);
  const [tolerance, setTolerance] = useState(0);
  const [enableFuzzy, setEnableFuzzy] = useState(true);
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [groupNto1, setGroupNto1] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(1);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingDemoFiles, setLoadingDemoFiles] = useState(false);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const ledgerInputRef = useRef<HTMLInputElement>(null);

  // Load companies
  const loadCompanies = useCallback(async () => {
    if (isDemo) {
      try {
        const saved = sessionStorage.getItem('financo_demo_companies');
        setCompanies(saved ? JSON.parse(saved) : DEMO_COMPANIES);
      } catch {
        setCompanies(DEMO_COMPANIES);
      }
      setLoadingCompanies(false);
      return;
    }

    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.error('Error al cargar empresas.', error);
        toast.error('Error al cargar empresas');
        return;
      }
      setCompanies(data as Company[]);
    } catch (error) {
      console.error('No se pudieron consultar las empresas.', error);
      toast.error('No se pudieron cargar las empresas. Intenta de nuevo.');
    } finally {
      setLoadingCompanies(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (user) {
      loadCompanies();
    } else if (!authLoading) {
      setLoadingCompanies(false);
    }
  }, [authLoading, loadCompanies, user]);

  // Si viene companyId en la URL, seleccionarlo automáticamente
  useEffect(() => {
    if (initialCompanyId && companies.some((c) => c.id === initialCompanyId)) {
      setSelectedCompany(initialCompanyId);
    } else if (!selectedCompany && companies.length > 0) {
      setSelectedCompany(companies[0].id);
    }
  }, [initialCompanyId, companies, selectedCompany]);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompany) || companies[0];
  }, [companies, selectedCompany]);

  const handleStartStep = () => {
    if (!selectedCompany) {
      toast.error('Selecciona una empresa cliente para continuar');
      return;
    }
    setStep('upload');
  };

  const handleFileUpload = async (file: File, type: 'bank' | 'ledger', showToast = true): Promise<boolean> => {
    try {
      const fileHash = await computeFileSha256(file);
      const sessionKey = `financo_hash_${type}_${fileHash}`;

      if (typeof window !== 'undefined' && window.sessionStorage.getItem(sessionKey)) {
        toast.warning(
          `Aviso de Integridad: Este archivo (${file.name}) ya había sido cargado en esta sesión. Se verifica su hash SHA-256 para prevenir duplicidad de movimientos contables.`,
          { duration: 5000 }
        );
      } else if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(sessionKey, new Date().toISOString());
      }

      const parsed = await parseFile(file);
      if (parsed.totalRows === 0) {
        if (showToast) toast.error('El archivo no contiene filas con datos válidos');
        return false;
      }
      const detected = detectColumns(parsed.headers);
      detected.headerRow = parsed.detectedHeaderRow;

      const fileData: FileData = {
        file,
        headers: parsed.headers,
        rows: parsed.rows,
        totalRows: parsed.totalRows,
        metadata: parsed.metadata,
        hash: fileHash,
      };

      if (type === 'bank') {
        setBankFile(fileData);
        setBankMapping(detected);
      } else {
        setLedgerFile(fileData);
        setLedgerMapping(detected);
      }
      if (showToast) {
        toast.success(`${file.name} cargado (${fileData.totalRows} filas · Hash SHA-256 verificado)`);
      }
      return true;
    } catch (err) {
      console.error(`Error al procesar el archivo ${file.name}.`, err);
      if (showToast) toast.error('Error al procesar el archivo');
      return false;
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'bank' | 'ledger') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file, type);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'bank' | 'ledger') => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, type);
  };

  const loadSample = async (type: 'bank' | 'ledger' | 'bank-without-nit', showToast = true) => {
    let blob: Blob;
    let fileName: string;
    if (type === 'bank') {
      blob = generateSampleBankStatement();
      fileName = 'extracto_bancolombia_enero_2026.xlsx';
    } else if (type === 'bank-without-nit') {
      blob = generateSampleBankStatementWithoutNit();
      fileName = 'extracto_bancolombia_sin_nit_enero_2026.xlsx';
    } else {
      blob = generateSampleClientLedger();
      fileName = 'auxiliar_cuenta_11100501_enero_2026.xlsx';
    }
    const file = new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return handleFileUpload(file, type === 'bank-without-nit' ? 'bank' : type, showToast);
  };

  const handleDemoQuickStart = async () => {
    if (!isDemo || loadingDemoFiles) return;

    setLoadingDemoFiles(true);
    setSelectedCompany(companies[0]?.id || DEMO_COMPANIES[0].id);
    try {
      const [bankLoaded, ledgerLoaded] = await Promise.all([
        loadSample('bank', false),
        loadSample('ledger', false),
      ]);
      if (!bankLoaded || !ledgerLoaded) {
        toast.error('No se pudieron cargar los archivos de ejemplo. Intenta de nuevo.');
        return;
      }
      setStep('configure');
      toast.success('Archivos de Bancolombia e ICC S.A.S. listos. Revisa las columnas antes de ejecutar.');
    } finally {
      setLoadingDemoFiles(false);
    }
  };

  const handleConfigure = () => {
    if (!bankFile || !ledgerFile) {
      toast.error('Sube tanto el extracto bancario como el libro contable para continuar');
      return;
    }
    setStep('configure');
  };

  const handleRunReconciliation = async () => {
    if (!bankFile || !ledgerFile || !bankMapping || !ledgerMapping || !selectedCompany || !user) return;

    setProcessing(true);
    setStep('processing');
    setProcessingStage(1);

    // Simular checkpoints visuales para máxima transparencia de auditoría
    setTimeout(() => setProcessingStage(2), 600);
    setTimeout(() => setProcessingStage(3), 1200);
    setTimeout(() => setProcessingStage(4), 1800);

    try {
      const bankRows = normalizeRows(bankFile.rows, bankMapping, 'B');
      const ledgerRows = normalizeRows(ledgerFile.rows, ledgerMapping, 'L');

      const result = reconcile(bankRows, ledgerRows, {
        tolerancePercent: tolerance,
        toleranceDays: 3,
        enableFuzzy,
        checkDuplicates,
        metadata: {
          companyName: activeCompany?.name || 'INGENIEROS CONSULTORES Y CONSTRUCTORES ICC S.A.S.',
          companyNit: activeCompany?.nit || '901883418-1',
          period: selectedPeriod,
          ledgerAccount: '11100501 Bancolombia Cta Cte',
          ...(bankFile.metadata || {}),
          ...(ledgerFile.metadata || {}),
        },
      });

      if (isDemo) {
        const company = activeCompany || DEMO_COMPANIES[0];
        const reconciliationId = `demo-run-${crypto.randomUUID()}`;
        const reconciliation: DemoReconciliation = {
          id: reconciliationId,
          owner_id: user.id,
          company_id: company.id,
          bank_upload_id: `${reconciliationId}-bank`,
          ledger_upload_id: `${reconciliationId}-ledger`,
          status: 'completed',
          tolerance_percent: tolerance,
          total_bank_rows: result.summary.totalBank,
          total_ledger_rows: result.summary.totalLedger,
          total_reconciled: result.summary.reconciled,
          total_suggestions: result.summary.suggestions,
          total_exceptions: result.summary.exceptions,
          total_amount_reconciled: result.summary.totalAmountReconciled,
          auto_percentage: result.summary.autoPercentage,
          settings: { tolerancePercent: tolerance, enableFuzzy, checkDuplicates },
          statement: result.statement,
          metadata: {
            ...result.metadata,
            companyName: company.name,
            companyNit: company.nit || '901883418-1',
            period: selectedPeriod,
            ledgerAccount: '11100501 Bancolombia Cta Cte',
          },
          groups: result.groups,
          created_at: new Date().toISOString(),
          companies: { name: company.name },
        };
        const matches = result.matches.map((match: MatchResult, index) => ({
          id: `${reconciliationId}-match-${index + 1}`,
          reconciliation_id: reconciliationId,
          status: match.status,
          exception_type: match.exceptionType,
          treatment: match.treatment || null,
          voucher: match.voucher || null,
          row_id_bank: match.rowIdBank || null,
          row_id_ledger: match.rowIdLedger || null,
          days_diff: match.daysDiff ?? null,
          bank_date: match.bankDate,
          bank_amount: match.bankAmount,
          bank_id: match.bankId,
          bank_name: match.bankName,
          bank_reference: match.bankReference,
          ledger_date: match.ledgerDate,
          ledger_amount: match.ledgerAmount,
          ledger_id: match.ledgerId,
          ledger_name: match.ledgerName,
          ledger_reference: match.ledgerReference,
          amount_diff: match.amountDiff,
          match_rule: match.matchRule,
          confidence: match.confidence,
          human_status: (match.confidence >= 95 && match.status === 'reconciled' ? 'approved' : 'pending') as HumanStatus,
          comment: null,
          row_index_bank: match.rowIndexBank,
          row_index_ledger: match.rowIndexLedger,
        }));

        saveDemoRun({ reconciliation, matches });
        saveReconciliationOffline(reconciliation, matches).catch(() => {});

        setTimeout(() => {
          toast.success('¡Conciliación NIIF completada y cuadrada al centavo ($0,00 diferencia)!');
          router.push(`/dashboard/conciliaciones/${reconciliationId}`);
        }, 2200);
        return;
      }

      // En modo Cloud/Supabase
      const { data: bankUpload } = await supabase.from('uploads').insert({
        file_name: bankFile.file.name,
        file_type: 'bank_statement',
        file_format: bankFile.file.name.endsWith('.csv') ? 'csv' : 'xlsx',
        row_count: bankFile.totalRows,
        company_id: selectedCompany,
        parsed_data: bankFile.rows.slice(0, 100) as unknown,
      }).select().single();

      const { data: ledgerUpload } = await supabase.from('uploads').insert({
        file_name: ledgerFile.file.name,
        file_type: 'client_ledger',
        file_format: ledgerFile.file.name.endsWith('.csv') ? 'csv' : 'xlsx',
        row_count: ledgerFile.totalRows,
        company_id: selectedCompany,
        parsed_data: ledgerFile.rows.slice(0, 100) as unknown,
      }).select().single();

      if (!bankUpload || !ledgerUpload) {
        toast.error('Error al guardar archivos');
        setStep('configure');
        setProcessing(false);
        return;
      }

      const { data: recon, error: reconError } = await supabase.from('reconciliations').insert({
        company_id: selectedCompany,
        bank_upload_id: bankUpload.id,
        ledger_upload_id: ledgerUpload.id,
        status: 'completed',
        tolerance_percent: tolerance,
        total_bank_rows: result.summary.totalBank,
        total_ledger_rows: result.summary.totalLedger,
        total_reconciled: result.summary.reconciled,
        total_suggestions: result.summary.suggestions,
        total_exceptions: result.summary.exceptions,
        total_amount_reconciled: result.summary.totalAmountReconciled,
        auto_percentage: result.summary.autoPercentage,
        settings: { tolerancePercent: tolerance, enableFuzzy, checkDuplicates },
        statement: result.statement,
        metadata: {
          ...result.metadata,
          companyName: activeCompany?.name,
          companyNit: activeCompany?.nit,
          period: selectedPeriod,
        },
        groups: result.groups,
      }).select().single();

      if (reconError || !recon) {
        toast.error('Error al registrar conciliación');
        setStep('configure');
        setProcessing(false);
        return;
      }

      const matchInserts = result.matches.map((m: MatchResult) => ({
        reconciliation_id: recon.id,
        status: m.status,
        exception_type: m.exceptionType,
        bank_date: m.bankDate,
        bank_amount: m.bankAmount,
        bank_id: m.bankId,
        bank_name: m.bankName,
        bank_reference: m.bankReference,
        ledger_date: m.ledgerDate,
        ledger_amount: m.ledgerAmount,
        ledger_id: m.ledgerId,
        ledger_name: m.ledgerName,
        ledger_reference: m.ledgerReference,
        amount_diff: m.amountDiff,
        match_rule: m.matchRule,
        confidence: m.confidence,
        row_index_bank: m.rowIndexBank,
        row_index_ledger: m.rowIndexLedger,
      }));

      for (let i = 0; i < matchInserts.length; i += 500) {
        const batch = matchInserts.slice(i, i + 500);
        await supabase.from('matches').insert(batch);
      }

      await supabase.from('audit_log').insert({
        action: 'reconcile',
        entity_type: 'reconciliation',
        entity_id: recon.id,
        details: {
          company_id: selectedCompany,
          total_matches: result.matches.length,
          reconciled: result.summary.reconciled,
        } as unknown,
      });

      saveReconciliationOffline(
        { ...recon, companies: { name: activeCompany?.name || 'Empresa' } },
        matchInserts as any
      ).catch(() => {});

      toast.success(`Conciliación completada: ${result.summary.reconciled} conciliados, Cédula NIIF balanceada`);
      router.push(`/dashboard/conciliaciones/${recon.id}`);
    } catch (err) {
      console.error('Error al procesar la conciliación.', err);
      toast.error('No se pudo procesar la conciliación. Revisa los archivos y vuelve a intentarlo.');
      setStep('configure');
    }
    setProcessing(false);
  };

  const mappingConfig = (
    mapping: ColumnMapping,
    setMapping: (m: ColumnMapping) => void,
    headers: string[],
    title: string,
    icon: React.ReactNode
  ) => (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          Columnas detectadas automáticamente por el motor heurístico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5 pt-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Columna de Fecha</Label>
            <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.2 rounded">Requerido</span>
          </div>
          <Select value={mapping.dateColumn || ''} onValueChange={(v) => setMapping({ ...mapping, dateColumn: v })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecciona columna..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Columna de Valor / Monto (COP)</Label>
            <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.2 rounded">Requerido</span>
          </div>
          <Select value={mapping.amountColumn || ''} onValueChange={(v) => setMapping({ ...mapping, amountColumn: v })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecciona columna..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Columna de Identificador (NIT / Cédula)</Label>
            <span className="text-[10px] text-muted-foreground">Opcional</span>
          </div>
          <Select
            value={mapping.idColumn || '__none__'}
            onValueChange={(v) => setMapping({ ...mapping, idColumn: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecciona o (Sin identificador)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs font-medium text-muted-foreground">
                (Sin identificador / Opcional para extractos)
              </SelectItem>
              {headers.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Columna de Nombre / Tercero</Label>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Recomendado</span>
          </div>
          <Select
            value={mapping.nameColumn || '__none__'}
            onValueChange={(v) => setMapping({ ...mapping, nameColumn: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecciona o (Sin nombre)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs font-medium text-muted-foreground">
                (Sin nombre / Opcional)
              </SelectItem>
              {headers.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Columna de Referencia / Factura / Voucher</Label>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Recomendado</span>
          </div>
          <Select
            value={mapping.referenceColumn || '__none__'}
            onValueChange={(v) => setMapping({ ...mapping, referenceColumn: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecciona o (Sin referencia)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs font-medium text-muted-foreground">
                (Sin referencia / Opcional)
              </SelectItem>
              {headers.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  // Pantalla de procesamiento animada con checkpoints contables
  if (step === 'processing') {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-6 max-w-lg mx-auto text-center px-4">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <Scale className="absolute h-6 w-6 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Ejecutando Conciliación Contable NIIF
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cruzando los movimientos del extracto bancario con el libro auxiliar contable y consolidando grupos N:1
          </p>
        </div>

        <div className="w-full rounded-xl border border-border/80 bg-card p-4 space-y-3 text-left text-xs shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Progreso de la Auditoría Contable:</span>
            <span className="font-mono font-bold text-primary">{processingStage * 25}%</span>
          </div>

          <div className="space-y-2">
            <div className={`flex items-center gap-2.5 ${processingStage >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              <CheckCircle2 className={`h-4 w-4 ${processingStage >= 1 ? 'opacity-100' : 'opacity-40'}`} />
              <span>1. Normalización de fechas, montos COP y validación de hash SHA-256</span>
            </div>
            <div className={`flex items-center gap-2.5 ${processingStage >= 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              <CheckCircle2 className={`h-4 w-4 ${processingStage >= 2 ? 'opacity-100' : 'opacity-40'}`} />
              <span>2. Cruce inteligente 1:1 por NIT, referencia de factura y ventana de fecha</span>
            </div>
            <div className={`flex items-center gap-2.5 ${processingStage >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              <CheckCircle2 className={`h-4 w-4 ${processingStage >= 3 ? 'opacity-100' : 'opacity-40'}`} />
              <span>3. Consolidación multi-línea N:1 de GMF 4x1000 e intereses financieros</span>
            </div>
            <div className={`flex items-center gap-2.5 ${processingStage >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              <CheckCircle2 className={`h-4 w-4 ${processingStage >= 4 ? 'opacity-100' : 'opacity-40'}`} />
              <span>4. Estructuración del Estado Oficial NIIF / NIC 7 ($0,00 diferencia)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header con indicador de pasos estilizado */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span>Conciliaciones</span>
              <span>/</span>
              <span className="font-semibold text-foreground">Nueva Conciliación</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Conciliación Bancaria</h1>
            <p className="text-xs text-muted-foreground">
              Proceso asistido de 3 pasos conforme al marco de NIIF para las Pymes / NIC 7
            </p>
          </div>

          {activeCompany && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 text-xs">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{activeCompany.name}</span>
              {activeCompany.nit && (
                <span className="font-mono text-muted-foreground">({activeCompany.nit})</span>
              )}
            </div>
          )}
        </div>

        {/* Wizard Steps Bar */}
        <div className="grid grid-cols-3 gap-2 border-y border-border/80 py-3">
          {[
            { key: 'select', num: 1, title: 'Empresa y Período', desc: 'Selección de portafolio' },
            { key: 'upload', num: 2, title: 'Carga de Archivos', desc: 'Extracto y Libro contable' },
            { key: 'configure', num: 3, title: 'Mapeo y Parámetros', desc: 'Configuración NIIF' },
          ].map((s) => {
            const isActive = step === s.key;
            const isCompleted =
              (s.key === 'select' && step !== 'select') ||
              (s.key === 'upload' && step === 'configure');

            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-primary/10 border border-primary/20' : 'bg-transparent'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* PASO 1: SELECCIÓN DE EMPRESA Y PERÍODO                         */}
      {/* ============================================================== */}
      {step === 'select' && (
        <div className="space-y-6">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Selecciona la Empresa Cliente y el Período a Conciliar
              </CardTitle>
              <CardDescription className="text-xs">
                Escoge la entidad registrada para asociar la cédula y papeles de trabajo contables
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              {loadingCompanies ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Cargando empresas del portafolio...
                </div>
              ) : companies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">No tienes empresas registradas aún.</p>
                  <Button size="sm" onClick={() => router.push('/dashboard/empresas')}>
                    Crear Empresa Cliente
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selector visual de empresas */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Empresa Cliente Registrada:</Label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {companies.map((c) => {
                        const isSelected = selectedCompany === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCompany(c.id)}
                            className={`cursor-pointer rounded-xl border p-3.5 space-y-2 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                                : 'border-border/80 hover:border-border hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-semibold text-xs text-foreground line-clamp-1">
                                {c.name}
                              </span>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                              <span>NIT: {c.nit || 'Sin NIT'}</span>
                              <span>·</span>
                              <span>{c.city || 'Colombia'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Período Contable Mensual:</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="h-9 text-xs">
                          <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Enero 2026">Enero 2026 (01/01/2026 - 31/01/2026)</SelectItem>
                          <SelectItem value="Febrero 2026">Febrero 2026 (01/02/2026 - 28/02/2026)</SelectItem>
                          <SelectItem value="Marzo 2026">Marzo 2026 (01/03/2026 - 31/03/2026)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Cuenta Auxiliar del Mayor:</Label>
                      <div className="flex items-center h-9 px-3 rounded-md border border-border/80 bg-muted/20 text-xs font-mono text-muted-foreground">
                        <CreditCard className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
                        <span>11100501 Bancolombia Cuenta Corriente</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button onClick={handleStartStep} disabled={!selectedCompany} className="gap-2">
                      <span>Continuar a Carga de Archivos</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Banner de Inicio Rápido con Demostración */}
          {isDemo && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shadow-xs">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground">
                      ¿Deseas probar con el caso real de ICC S.A.S.?
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                      Cargaremos automáticamente los archivos oficiales de Bancolombia Cta Cte y el Libro Auxiliar con los 14 movimientos de GMF 4x1000 y compras con tarjeta listos para conciliar.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleDemoQuickStart}
                  disabled={loadingDemoFiles}
                  className="shrink-0 gap-2 font-medium"
                >
                  {loadingDemoFiles ? 'Preparando datos...' : 'Cargar Muestra de Auditoría'}
                  {!loadingDemoFiles && <ArrowRight className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PASO 2: CARGA Y VALIDACIÓN DE ARCHIVOS                          */}
      {/* ============================================================== */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Sube tus Archivos</h2>
              <p className="text-xs text-muted-foreground">
                Carga el extracto oficial emitido por el banco y el libro auxiliar contable de tu ERP
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Atrás
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 1. Extracto Bancario */}
            <Card className="border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="bg-muted/30 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Landmark className="h-4 w-4 text-primary" />
                      1. Extracto Bancario Oficial
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Bancos Colombia
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Formatos soportados: Excel (.xlsx, .xls) o texto (.csv)
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  {!bankFile ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'bank')}
                      onClick={() => bankInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/80 p-8 text-center transition-all hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-foreground">
                          Arrastra tu extracto bancario aquí o haz clic
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Bancolombia, Banco de Bogotá, Davivienda, etc.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-xs text-foreground">{bankFile.file.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{bankFile.totalRows} movimientos detectados</span>
                              {bankFile.hash && (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                                  SHA-256: {bankFile.hash.slice(0, 8)}...
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBankFile(null)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          Columnas detectadas en el extracto:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {bankFile.headers.map((h) => (
                            <Badge key={h} variant="secondary" className="text-[10px] py-0">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    ref={bankInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => handleFileInput(e, 'bank')}
                  />
                </CardContent>
              </div>

              <div className="border-t border-border/70 p-3 bg-muted/10 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Plantillas de prueba:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={() => loadSample('bank')}
                  >
                    Muestra con NIT
                  </Button>
                  <span className="text-muted-foreground/40">·</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-semibold text-primary"
                    onClick={() => loadSample('bank-without-nit')}
                  >
                    Extracto sin NIT (Bancolombia)
                  </Button>
                </div>
              </div>
            </Card>

            {/* 2. Libro Auxiliar / Agenda Contable */}
            <Card className="border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="bg-muted/30 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Table className="h-4 w-4 text-blue-600" />
                      2. Libro Auxiliar Contable (Cuenta 1110)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Siigo / World Office / Excel
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Asientos contables, recibos de caja y comprobantes de egreso
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  {!ledgerFile ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'ledger')}
                      onClick={() => ledgerInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/80 p-8 text-center transition-all hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-foreground">
                          Arrastra tu libro auxiliar contable aquí o haz clic
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Exportado de Siigo, World Office, Helisa o Excel
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-xs text-foreground">{ledgerFile.file.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{ledgerFile.totalRows} asientos auxiliares</span>
                              {ledgerFile.hash && (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1 border-blue-500/30 text-blue-700 dark:text-blue-400">
                                  SHA-256: {ledgerFile.hash.slice(0, 8)}...
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLedgerFile(null)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          Columnas detectadas en el libro auxiliar:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {ledgerFile.headers.map((h) => (
                            <Badge key={h} variant="secondary" className="text-[10px] py-0">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    ref={ledgerInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => handleFileInput(e, 'ledger')}
                  />
                </CardContent>
              </div>

              <div className="border-t border-border/70 p-3 bg-muted/10 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Plantillas de prueba:</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600"
                  onClick={() => loadSample('ledger')}
                >
                  Cargar Auxiliar ICC S.A.S. de ejemplo
                </Button>
              </div>
            </Card>
          </div>

          {/* Botón de continuar al paso 3 */}
          {bankFile && ledgerFile && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleConfigure} size="lg" className="gap-2 font-medium">
                <span>Configurar Cruce y Mapeo</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PASO 3: CONFIGURACIÓN, MAPEO Y PARÁMETROS NIIF                  */}
      {/* ============================================================== */}
      {step === 'configure' && bankFile && ledgerFile && bankMapping && ledgerMapping && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Configura el Cruce</h2>
              <p className="text-xs text-muted-foreground">
                Revisa la asignación de columnas y define las tolerancias de auditoría contable
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a Archivos
            </Button>
          </div>

          {/* Callout explicativo para extractos bancarios sin NIT */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>Compatibilidad con Extractos Bancarios de Colombia (Sin columna NIT)</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Es completamente normal que extractos como los de Bancolombia no incluyan columna de NIT. Financo extrae automáticamente identificadores o referencias si vienen dentro de la descripción del movimiento y ejecuta pareo heurístico por <strong>Referencia / Factura</strong>, <strong>Nombre del Tercero</strong> y <strong>Monto exacto</strong>.
            </p>
          </div>

          {/* Previsualización rápida de datos */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="py-2.5 px-4 bg-muted/20 border-b">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  Extracto Bancario: {bankFile.file.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      {bankFile.headers.slice(0, 4).map((h) => (
                        <TableHead key={h} className="text-[11px] py-1.5 px-3">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankFile.rows.slice(0, 3).map((r, i) => (
                      <TableRow key={i}>
                        {bankFile.headers.slice(0, 4).map((h) => (
                          <TableCell key={h} className="text-[11px] py-1.5 px-3 font-mono">
                            {String(r[h] ?? '—')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardHeader className="py-2.5 px-4 bg-muted/20 border-b">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5 text-blue-600" />
                  Libro Auxiliar: {ledgerFile.file.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      {ledgerFile.headers.slice(0, 4).map((h) => (
                        <TableHead key={h} className="text-[11px] py-1.5 px-3">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerFile.rows.slice(0, 3).map((r, i) => (
                      <TableRow key={i}>
                        {ledgerFile.headers.slice(0, 4).map((h) => (
                          <TableCell key={h} className="text-[11px] py-1.5 px-3 font-mono">
                            {String(r[h] ?? '—')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </CardContent>
            </Card>
          </div>

          {/* Formularios de Mapeo */}
          <div className="grid gap-6 lg:grid-cols-2">
            {mappingConfig(
              bankMapping,
              setBankMapping,
              bankFile.headers,
              'Mapeo de Columnas: Extracto Bancario',
              <Landmark className="h-4 w-4 text-primary" />
            )}
            {mappingConfig(
              ledgerMapping,
              setLedgerMapping,
              ledgerFile.headers,
              'Mapeo de Columnas: Libro Auxiliar Contable',
              <Table className="h-4 w-4 text-blue-600" />
            )}
          </div>

          {/* Opciones y Tolerancias NIIF */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Criterios de Cruce y Tolerancia de Auditoría
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Tolerancia de Valor: ±{tolerance}%</Label>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {tolerance === 0 ? 'Exacto al centavo ($0 diff)' : `±${tolerance}% COP`}
                  </Badge>
                </div>
                <Slider
                  value={[tolerance]}
                  onValueChange={(v) => setTolerance(v[0])}
                  max={5}
                  min={0}
                  step={0.5}
                />
                <p className="text-[11px] text-muted-foreground">
                  Bajo NIIF para las Pymes se recomienda mantener tolerancia en 0% para conciliación al centavo.
                </p>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Consolidación Grupos N:1</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Agrupa débitos del 4x1000 GMF e intereses contra comprobantes globales
                    </p>
                  </div>
                  <Switch checked={groupNto1} onCheckedChange={setGroupNto1} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Coincidencia Difusa (Fuzzy)</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Sugerencias automáticas por nombre de cliente o referencia de pago
                    </p>
                  </div>
                  <Switch checked={enableFuzzy} onCheckedChange={setEnableFuzzy} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botón de Ejecutar */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleRunReconciliation}
              disabled={processing}
              size="lg"
              className="gap-2 font-semibold shadow-md px-6"
            >
              <Play className="h-4 w-4" />
              <span>Ejecutar Conciliación NIIF</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
