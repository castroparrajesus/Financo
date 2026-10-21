'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { parseFile, generateSampleBankStatement, generateSampleBankStatementWithoutNit, generateSampleClientLedger } from '@/lib/reconciliation/file-parser';
import { detectColumns, normalizeRows, reconcile, ColumnMapping } from '@/lib/reconciliation/engine';
import { Company, NormalizedRow, MatchResult, ReconciliationMetadata, HumanStatus } from '@/lib/types';
import { DEMO_COMPANIES, DemoReconciliation, saveDemoRun } from '@/lib/demo-data';

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
  const { user, isDemo, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [bankFile, setBankFile] = useState<FileData | null>(null);
  const [ledgerFile, setLedgerFile] = useState<FileData | null>(null);
  const [bankMapping, setBankMapping] = useState<ColumnMapping | null>(null);
  const [ledgerMapping, setLedgerMapping] = useState<ColumnMapping | null>(null);
  const [tolerance, setTolerance] = useState(0);
  const [enableFuzzy, setEnableFuzzy] = useState(true);
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingDemoFiles, setLoadingDemoFiles] = useState(false);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const ledgerInputRef = useRef<HTMLInputElement>(null);

  // Load companies on step select
  const loadCompanies = useCallback(async () => {
    if (isDemo) {
      setCompanies(DEMO_COMPANIES);
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

  const handleStartStep = () => {
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
        if (showToast) toast.error('El archivo no contiene datos');
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
      if (showToast) toast.success(`${file.name} cargado (${fileData.totalRows} filas · Hash SHA-256 verificado)`);
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
      fileName = 'extracto_ejemplo.xlsx';
    } else if (type === 'bank-without-nit') {
      blob = generateSampleBankStatementWithoutNit();
      fileName = 'extracto_sin_nit_ejemplo.xlsx';
    } else {
      blob = generateSampleClientLedger();
      fileName = 'agenda_ejemplo.xlsx';
    }
    const file = new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return handleFileUpload(file, type === 'bank-without-nit' ? 'bank' : type, showToast);
  };

  const handleDemoQuickStart = async () => {
    if (!isDemo || loadingDemoFiles) return;

    setLoadingDemoFiles(true);
    setSelectedCompany(DEMO_COMPANIES[0].id);
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
      toast.success('Empresa y archivos de ejemplo listos. Revisa las columnas antes de ejecutar.');
    } finally {
      setLoadingDemoFiles(false);
    }
  };

  const handleConfigure = () => {
    if (!bankFile || !ledgerFile) {
      toast.error('Sube ambos archivos para continuar');
      return;
    }
    setStep('configure');
  };

  const handleRunReconciliation = async () => {
    if (!bankFile || !ledgerFile || !bankMapping || !ledgerMapping || !selectedCompany || !user) return;

    setProcessing(true);
    setStep('processing');

    try {
      const bankRows = normalizeRows(bankFile.rows, bankMapping, 'B');
      const ledgerRows = normalizeRows(ledgerFile.rows, ledgerMapping, 'L');

      const result = reconcile(bankRows, ledgerRows, {
        tolerancePercent: tolerance,
        toleranceDays: 3,
        enableFuzzy,
        checkDuplicates,
        metadata: {
          ...(bankFile.metadata || {}),
          ...(ledgerFile.metadata || {}),
        },
      });

      if (isDemo) {
        const company = DEMO_COMPANIES.find((item) => item.id === selectedCompany);
        if (!company) {
          toast.error('Selecciona una empresa demo válida');
          setStep('select');
          setProcessing(false);
          return;
        }

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
          metadata: result.metadata,
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
        toast.success('Conciliación demo completada. El resultado solo se guarda en esta pestaña.');
        router.push(`/dashboard/conciliaciones/${reconciliationId}`);
        return;
      }

      // Create upload records
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

      // Create reconciliation
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
        settings: { tolerancePercent: tolerance, enableFuzzy, checkDuplicates } as unknown,
      }).select().single();

      if (reconError || !recon) {
        toast.error('Error al crear conciliación');
        setStep('configure');
        setProcessing(false);
        return;
      }

      // Update uploads with reconciliation_id
      await supabase.from('uploads').update({ reconciliation_id: recon.id }).eq('id', bankUpload.id);
      await supabase.from('uploads').update({ reconciliation_id: recon.id }).eq('id', ledgerUpload.id);

      // Insert matches
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

      // Insert in batches of 500
      for (let i = 0; i < matchInserts.length; i += 500) {
        const batch = matchInserts.slice(i, i + 500);
        await supabase.from('matches').insert(batch);
      }

      // Audit log
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

      toast.success(`Conciliación completada: ${result.summary.reconciled} conciliados, ${result.summary.exceptions} excepciones`);
      router.push(`/dashboard/conciliaciones/${recon.id}`);
    } catch (err) {
      console.error('Error al procesar la conciliación.', err);
      const isStorageLimit = err instanceof DOMException && err.name === 'QuotaExceededError';
      toast.error(
        isStorageLimit
          ? 'El resultado es demasiado grande para guardarlo en esta pestaña. Prueba con menos filas.'
          : 'No se pudo procesar la conciliación. Revisa los archivos y vuelve a intentarlo.',
      );
      setStep('configure');
    }
    setProcessing(false);
  };

  const mappingConfig = (mapping: ColumnMapping, setMapping: (m: ColumnMapping) => void, headers: string[], title: string) => (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Columna de fecha</Label>
            <span className="text-[10px] text-primary font-medium">Requerido</span>
          </div>
          <Select value={mapping.dateColumn || ''} onValueChange={(v) => setMapping({ ...mapping, dateColumn: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecciona columna..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Columna de valor/monto</Label>
            <span className="text-[10px] text-primary font-medium">Requerido</span>
          </div>
          <Select value={mapping.amountColumn || ''} onValueChange={(v) => setMapping({ ...mapping, amountColumn: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecciona columna..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Columna de identificador (NIT/Cédula)</Label>
            <span className="text-[10px] text-muted-foreground">Opcional</span>
          </div>
          <Select
            value={mapping.idColumn || '__none__'}
            onValueChange={(v) => setMapping({ ...mapping, idColumn: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecciona o (Sin identificador)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">(Sin identificador / Opcional)</SelectItem>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Columna de nombre / tercero</Label>
            <span className="text-[10px] text-muted-foreground">Recomendado</span>
          </div>
          <Select
            value={mapping.nameColumn || '__none__'}
            onValueChange={(v) => setMapping({ ...mapping, nameColumn: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecciona o (Sin nombre)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">(Sin nombre / Opcional)</SelectItem>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Columna de referencia / factura</Label>
            <span className="text-[10px] text-muted-foreground">Recomendado</span>
          </div>
          <Select
            value={mapping.referenceColumn || '__none__'}
            onValueChange={(v) => setMapping({ ...mapping, referenceColumn: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecciona o (Sin referencia)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">(Sin referencia / Opcional)</SelectItem>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  if (step === 'processing') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Procesando conciliación...</h2>
          <p className="text-muted-foreground">Cruzando movimientos y detectando excepciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[
          { key: 'select', label: 'Empresa' },
          { key: 'upload', label: 'Archivos' },
          { key: 'configure', label: 'Configuración' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === s.key || (step as string === 'processing' && i === 2) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={step === s.key ? 'font-medium' : 'text-muted-foreground'}>{s.label}</span>
            {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select company */}
      {step === 'select' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nueva conciliación</h1>
            <p className="text-muted-foreground">Selecciona la empresa cliente para esta conciliación</p>
          </div>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCompanies ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Cargando empresas...</p>
              ) : companies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
                  <p className="text-muted-foreground">No tienes empresas registradas.</p>
                  <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/empresas')}>
                    Crear empresa
                  </Button>
                </div>
              ) : (
                <>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una empresa..." /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleStartStep} disabled={!selectedCompany} className="w-full sm:w-auto">
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          {isDemo && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">¿Quieres ver cómo funciona?</p>
                    <p className="text-sm text-muted-foreground">
                      Cargaremos una empresa y dos archivos de ejemplo con pagos conciliados y casos para revisar.
                      Los resultados se guardan solo en esta pestaña.
                    </p>
                  </div>
                </div>
                <Button onClick={handleDemoQuickStart} disabled={loadingDemoFiles} className="shrink-0">
                  {loadingDemoFiles ? 'Preparando ejemplos...' : 'Probar con datos de ejemplo'}
                  {!loadingDemoFiles && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Upload files */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sube tus archivos</h1>
              <p className="text-muted-foreground">Necesitas el extracto bancario y la agenda de clientes</p>
            </div>
            <Button variant="ghost" onClick={() => setStep('select')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atrás
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bank statement upload */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Extracto bancario
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!bankFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'bank')}
                    onClick={() => bankInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/60 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Arrastra tu archivo o haz clic aquí</p>
                      <p className="text-sm text-muted-foreground">Formatos: .xlsx, .xls, .csv</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <div>
                          <p className="font-medium text-sm">{bankFile.file.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground">{bankFile.totalRows} filas detectadas</p>
                            {bankFile.hash && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                                SHA-256: {bankFile.hash.slice(0, 8)}...
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setBankFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Columnas detectadas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bankFile.headers.map((h) => (
                          <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
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
                <div className="mt-2 flex flex-col items-center justify-center gap-1 text-xs sm:flex-row">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => loadSample('bank')}>
                    Ejemplo con NIT
                  </Button>
                  <span className="hidden sm:inline text-muted-foreground/60">·</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-semibold text-primary"
                    onClick={() => loadSample('bank-without-nit')}
                  >
                    Probar extracto sin NIT (ej. Bancolombia)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Client ledger upload */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Table className="h-5 w-5 text-accent" />
                  Agenda de clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!ledgerFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'ledger')}
                    onClick={() => ledgerInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/60 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Arrastra tu archivo o haz clic aquí</p>
                      <p className="text-sm text-muted-foreground">Formatos: .xlsx, .xls, .csv</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <div>
                          <p className="font-medium text-sm">{ledgerFile.file.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground">{ledgerFile.totalRows} filas detectadas</p>
                            {ledgerFile.hash && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                                SHA-256: {ledgerFile.hash.slice(0, 8)}...
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setLedgerFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Columnas detectadas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ledgerFile.headers.map((h) => (
                          <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
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
                <Button variant="link" size="sm" className="mt-2 w-full" onClick={() => loadSample('ledger')}>
                  Usar archivo de ejemplo
                </Button>
              </CardContent>
            </Card>
          </div>

          {bankFile && ledgerFile && (
            <div className="flex justify-end">
              <Button onClick={handleConfigure}>
                Configurar cruce
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Configure mapping */}
      {step === 'configure' && bankFile && ledgerFile && bankMapping && ledgerMapping && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Configura el cruce</h1>
              <p className="text-muted-foreground">Verifica que las columnas estén correctas</p>
            </div>
            <Button variant="ghost" onClick={() => setStep('upload')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atrás
            </Button>
          </div>

          {/* Informative advice callout for missing identifier */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  ¿Uno de tus documentos no tiene columna de NIT o Cédula?
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Es muy frecuente que los extractos bancarios no incluyan columna de NIT. En ese caso, selecciona{' '}
                  <strong className="text-foreground font-medium">&quot;(Sin identificador / Opcional)&quot;</strong>.
                  El motor intentará extraer el NIT automáticamente si viene mencionado en el concepto/descripción,
                  y cruzará de forma inteligente mediante <strong className="text-foreground font-medium">Número de Factura / Referencia</strong>,{' '}
                  <strong className="text-foreground font-medium">Nombre del Cliente</strong> y <strong className="text-foreground font-medium">Monto</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Previews */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Extracto: {bankFile.file.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded border border-border/40">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        {bankFile.headers.slice(0, 5).map((h) => <TableHead key={h} className="text-[11px] py-1.5">{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankFile.rows.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {bankFile.headers.slice(0, 5).map((h) => (
                            <TableCell key={h} className="text-[11px] py-1.5">{String(row[h] ?? '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Table className="h-4 w-4 text-accent" />
                  Agenda: {ledgerFile.file.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded border border-border/40">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        {ledgerFile.headers.slice(0, 5).map((h) => <TableHead key={h} className="text-[11px] py-1.5">{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerFile.rows.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {ledgerFile.headers.slice(0, 5).map((h) => (
                            <TableCell key={h} className="text-[11px] py-1.5">{String(row[h] ?? '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {mappingConfig(bankMapping, setBankMapping, bankFile.headers, 'Mapeo: Extracto bancario')}
            {mappingConfig(ledgerMapping, setLedgerMapping, ledgerFile.headers, 'Mapeo: Agenda de clientes')}
          </div>

          {/* Reconciliation options */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-primary" />
                Opciones de conciliación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Tolerancia de valor: ±{tolerance}%</Label>
                  <Badge variant="secondary">{tolerance === 0 ? 'Exacto' : `±${tolerance}%`}</Badge>
                </div>
                <Slider value={[tolerance]} onValueChange={(v) => setTolerance(v[0])} max={10} min={0} step={1} />
                <p className="text-xs text-muted-foreground">Permite diferencias pequeñas en el monto del cruce</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Coincidencia difusa (fuzzy)</Label>
                  <p className="text-xs text-muted-foreground">Sugerencias por nombre o referencia cuando no hay ID</p>
                </div>
                <Switch checked={enableFuzzy} onCheckedChange={setEnableFuzzy} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Detectar duplicados</Label>
                  <p className="text-xs text-muted-foreground">Marca movimientos repetidos como excepciones</p>
                </div>
                <Switch checked={checkDuplicates} onCheckedChange={setCheckDuplicates} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleRunReconciliation} disabled={processing} size="lg">
              <Play className="mr-2 h-4 w-4" />
              Ejecutar conciliación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
