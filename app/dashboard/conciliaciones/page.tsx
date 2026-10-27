'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  HardDrive,
  WifiOff,
  Search,
  Building2,
  Calendar,
  ArrowRight,
  Filter,
  CheckCheck,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCOP, formatDateTime } from '@/lib/format';
import { Reconciliation } from '@/lib/types';
import { DEMO_RECONCILIATIONS, getDemoRuns } from '@/lib/demo-data';
import { useAuth } from '@/lib/supabase/auth-context';
import { listCachedReconciliations } from '@/lib/offline/storage';
import { OfflineCedulasDialog } from '@/components/pwa/offline-cedulas-dialog';

interface ReconWithCompany extends Reconciliation {
  companies: { name: string } | null;
  period?: string;
  reconciliation_date?: string;
  matched_count?: number;
  difference?: number;
}

function mapCachedToRecon(c: any): ReconWithCompany {
  return {
    id: c.id,
    company_id: 'offline',
    owner_id: 'offline-user',
    bank_upload_id: 'offline-bank',
    ledger_upload_id: 'offline-ledger',
    period: c.period,
    reconciliation_date: c.date,
    status: 'completed',
    tolerance_percent: 0,
    total_bank_rows: c.totalBankRows,
    total_ledger_rows: c.totalLedgerRows,
    total_reconciled: Math.round((c.totalBankRows * c.autoPercentage) / 100),
    total_suggestions: 0,
    total_exceptions: 0,
    total_amount_reconciled: c.amountReconciled,
    matched_count: Math.round((c.totalBankRows * c.autoPercentage) / 100),
    difference: c.amountReconciled,
    auto_percentage: c.autoPercentage,
    created_at: c.cachedAt,
    companies: { name: c.companyName },
  } as unknown as ReconWithCompany;
}

export default function ReconciliationsListPage() {
  const { isDemo } = useAuth();
  const [recons, setRecons] = useState<ReconWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'perfect' | 'pending_review'>('all');

  useEffect(() => {
    async function load() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOfflineMode(true);
        const cached = await listCachedReconciliations();
        if (cached.length > 0) {
          setRecons(cached.map(mapCachedToRecon));
          setLoading(false);
          return;
        }
      }

      if (isDemo) {
        const demoRuns = getDemoRuns().map((run) => run.reconciliation);
        setRecons([...demoRuns, ...DEMO_RECONCILIATIONS]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('reconciliations')
          .select('*, companies(name)')
          .order('created_at', { ascending: false });
        if (error) {
          console.error(error);
          const cached = await listCachedReconciliations();
          if (cached.length > 0) {
            setIsOfflineMode(true);
            setRecons(cached.map(mapCachedToRecon));
          }
        } else {
          setRecons(data as ReconWithCompany[]);
        }
      } catch {
        const cached = await listCachedReconciliations();
        if (cached.length > 0) {
          setIsOfflineMode(true);
          setRecons(cached.map(mapCachedToRecon));
        }
      }
      setLoading(false);
    }
    load();
  }, [isDemo]);

  // Overall statistics for the summary strip
  const aggregateStats = useMemo(() => {
    const totalRecons = recons.length;
    const totalAmount = recons.reduce((sum, r) => sum + Number(r.total_amount_reconciled || 0), 0);
    const avgEffectiveness = totalRecons > 0
      ? Math.round(recons.reduce((sum, r) => sum + Number(r.auto_percentage || 0), 0) / totalRecons)
      : 0;
    const totalPendingExceptions = recons.reduce((sum, r) => sum + Number(r.total_exceptions || 0), 0);

    return {
      totalRecons,
      totalAmount,
      avgEffectiveness,
      totalPendingExceptions,
    };
  }, [recons]);

  // Filtered list
  const filteredRecons = useMemo(() => {
    return recons.filter((r) => {
      const companyName = (r.companies?.name || 'Empresa').toLowerCase();
      const period = (r.period || '').toLowerCase();
      const searchMatch = !searchTerm || companyName.includes(searchTerm.toLowerCase()) || period.includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      if (filterStatus === 'perfect') {
        return (r.auto_percentage || 0) >= 90;
      }
      if (filterStatus === 'pending_review') {
        return (r.total_exceptions || 0) > 0 || (r.total_suggestions || 0) > 0;
      }

      return true;
    });
  }, [recons, searchTerm, filterStatus]);

  return (
    <div className="space-y-6">
      <OfflineCedulasDialog open={showOfflineDialog} onOpenChange={setShowOfflineDialog} />

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Conciliaciones Bancarias</h1>
            {isOfflineMode && (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 text-xs">
                <WifiOff className="h-3 w-3" />
                Modo sin conexión
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cédulas contables y cruce de extractos bancarios con agenda de clientes
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOfflineDialog(true)}
            className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300 min-h-[40px]"
          >
            <HardDrive className="h-4 w-4" />
            <span>Cédulas offline</span>
          </Button>
          <Button asChild className="min-h-[40px] shadow-sm">
            <Link href="/dashboard/nueva">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva conciliación
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monto Total Conciliado</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {formatCOP(aggregateStats.totalAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            En {aggregateStats.totalRecons} cédula{aggregateStats.totalRecons === 1 ? '' : 's'} registradas
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Efectividad Promedio</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {aggregateStats.avgEffectiveness}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cruce de extractos por NIT, referencia y valor
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Cédulas Registradas</span>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {aggregateStats.totalRecons}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Empresas y períodos auditables
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Partidas en Revisión</span>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {aggregateStats.totalPendingExceptions}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Excepciones bancarias o contables
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-xl border border-border/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa o período..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Todas ({recons.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending_review')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterStatus === 'pending_review'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/30'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Con revisión pendiente
          </button>
          <button
            onClick={() => setFilterStatus('perfect')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterStatus === 'perfect'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Efectividad &gt;90%
          </button>
        </div>
      </div>

      {/* Reconciliations List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredRecons.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {searchTerm ? 'No se encontraron resultados' : 'Sin conciliaciones registradas'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {searchTerm
                  ? 'Intenta con otro término de búsqueda o limpia los filtros activos'
                  : 'Sube tu extracto bancario y agenda para generar tu primera cédula de conciliación'}
              </p>
            </div>
            {searchTerm ? (
              <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>
                Limpiar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/nueva">Iniciar conciliación</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecons.map((r) => {
            const companyName = r.companies?.name || 'Empresa';
            const autoPct = r.auto_percentage || 0;
            const isHighAuto = autoPct >= 80;

            return (
              <Link
                key={r.id}
                href={`/dashboard/conciliaciones/${r.id}`}
                className="group block rounded-xl border border-border/80 bg-card p-5 transition-all hover:border-primary/60 hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  {/* Left: Company & Meta */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                          {companyName}
                        </h3>
                        {r.period && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                            {r.period}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          isHighAuto
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {autoPct}% automático
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateTime(r.created_at)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{r.total_bank_rows || 0} filas extracto</span>
                        <span aria-hidden="true">·</span>
                        <span>{r.total_ledger_rows || 0} filas agenda</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics + Action */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
                    <div className="grid grid-cols-3 gap-5 text-center sm:text-right">
                      {/* Conciliados */}
                      <div>
                        <div className="flex items-center justify-center sm:justify-end gap-1 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-bold text-sm font-mono tabular-nums">{r.total_reconciled}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Conciliados</p>
                      </div>

                      {/* Sugerencias */}
                      <div>
                        <div className="flex items-center justify-center sm:justify-end gap-1 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-bold text-sm font-mono tabular-nums">{r.total_suggestions}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Sugerencias</p>
                      </div>

                      {/* Excepciones */}
                      <div>
                        <div className="flex items-center justify-center sm:justify-end gap-1 text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span className="font-bold text-sm font-mono tabular-nums">{r.total_exceptions}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Excepciones</p>
                      </div>
                    </div>

                    {/* Total Amount + Arrow */}
                    <div className="flex items-center gap-4 text-right border-l pl-6 border-border/60">
                      <div>
                        <span className="text-[11px] text-muted-foreground block font-medium">Monto conciliado</span>
                        <span className="font-bold text-base text-foreground font-mono tabular-nums">
                          {formatCOP(Number(r.total_amount_reconciled))}
                        </span>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
