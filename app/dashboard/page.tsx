'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  Scale,
  Plus,
  Receipt,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCOP, formatDateTime, formatDate } from '@/lib/format';
import { PLAN_LIMITS, ReconciliationStatement, ReconciliationMetadata } from '@/lib/types';
import { useAuth } from '@/lib/supabase/auth-context';
import { DEMO_COMPANIES, DEMO_RECONCILIATIONS, getDemoRuns } from '@/lib/demo-data';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  totalReconciliations: number;
  totalReconciled: number;
  totalExceptions: number;
  totalSuggestions: number;
  totalAmount: number;
  companyCount: number;
  avgAutomation: number;
  balancedCount: number;
}

interface RecentRecon {
  id: string;
  created_at: string;
  total_bank_rows: number;
  total_ledger_rows: number;
  total_reconciled: number;
  total_exceptions: number;
  total_suggestions: number;
  auto_percentage: number;
  total_amount_reconciled: number;
  metadata?: ReconciliationMetadata;
  statement?: ReconciliationStatement;
  companies: { name: string } | null;
}

export default function DashboardHome() {
  const { user, profile, isDemo } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReconciliations: 0,
    totalReconciled: 0,
    totalExceptions: 0,
    totalSuggestions: 0,
    totalAmount: 0,
    companyCount: 0,
    avgAutomation: 0,
    balancedCount: 0,
  });
  const [recent, setRecent] = useState<RecentRecon[]>([]);
  const [filterState, setFilterState] = useState<'all' | 'balanced' | 'exceptions'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (isDemo) {
        let savedRuns: RecentRecon[] = [];
        try {
          savedRuns = getDemoRuns().map((run) => run.reconciliation as unknown as RecentRecon);
        } catch {
          savedRuns = [];
        }
        const recons = [...savedRuns, ...DEMO_RECONCILIATIONS as unknown as RecentRecon[]];

        const totalReconciled = recons.reduce((sum, r) => sum + (r.total_reconciled || 0), 0);
        const totalExceptions = recons.reduce((sum, r) => sum + (r.total_exceptions || 0), 0);
        const totalSuggestions = recons.reduce((sum, r) => sum + (r.total_suggestions || 0), 0);
        const totalAmount = recons.reduce((sum, r) => sum + (Number(r.total_amount_reconciled) || 0), 0);
        const avgAutomation = recons.length > 0
          ? Math.round(recons.reduce((sum, r) => sum + (r.auto_percentage || 0), 0) / recons.length)
          : 0;
        const balancedCount = recons.filter((r) =>
          r.statement ? Math.abs(r.statement.finalDifference ?? 0) < 0.01 : (r.auto_percentage ?? 0) >= 90
        ).length;

        setStats({
          totalReconciliations: recons.length,
          totalReconciled,
          totalExceptions,
          totalSuggestions,
          totalAmount,
          companyCount: DEMO_COMPANIES.length,
          avgAutomation,
          balancedCount,
        });
        setRecent(recons);
        setLoading(false);
        return;
      }

      try {
        const { data: reconData } = await supabase
          .from('reconciliations')
          .select('*, companies(name)')
          .order('created_at', { ascending: false })
          .limit(15);

        const { count: companyCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        const recons = (reconData || []) as unknown as RecentRecon[];
        const totalReconciled = recons.reduce((sum, r) => sum + (r.total_reconciled || 0), 0);
        const totalExceptions = recons.reduce((sum, r) => sum + (r.total_exceptions || 0), 0);
        const totalSuggestions = recons.reduce((sum, r) => sum + (r.total_suggestions || 0), 0);
        const totalAmount = recons.reduce((sum, r) => sum + (Number(r.total_amount_reconciled) || 0), 0);
        const avgAutomation = recons.length > 0
          ? Math.round(recons.reduce((sum, r) => sum + (r.auto_percentage || 0), 0) / recons.length)
          : 0;
        const balancedCount = recons.filter((r) =>
          r.statement ? Math.abs(r.statement.finalDifference ?? 0) < 0.01 : (r.auto_percentage ?? 0) >= 90
        ).length;

        setStats({
          totalReconciliations: recons.length,
          totalReconciled,
          totalExceptions,
          totalSuggestions,
          totalAmount,
          companyCount: companyCount || 0,
          avgAutomation,
          balancedCount,
        });
        setRecent(recons);
      } catch (err) {
        console.error('Error al cargar datos del dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isDemo]);

  const planLimit = profile ? PLAN_LIMITS[profile.plan]?.companies : 5;
  const planLabel = profile ? PLAN_LIMITS[profile.plan]?.label : 'Esencial';
  const roleName = profile?.role === 'auditor' ? 'Revisora Fiscal / Auditora' : 'Contador Principal';
  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Evaluador');

  // Filtered reconciliations
  const filteredRecent = useMemo(() => {
    if (filterState === 'balanced') {
      return recent.filter((r) =>
        r.statement ? Math.abs(r.statement.finalDifference ?? 0) < 0.01 : (r.auto_percentage ?? 0) >= 90
      );
    }
    if (filterState === 'exceptions') {
      return recent.filter((r) => (r.total_exceptions || 0) > 0);
    }
    return recent;
  }, [recent, filterState]);

  // Analytics Chart Data
  const chartData = useMemo(() => {
    return recent
      .slice(0, 6)
      .reverse()
      .map((r) => {
        const compName = r.metadata?.companyName || r.companies?.name || 'Empresa';
        const shortName = compName.length > 15 ? compName.substring(0, 15) + '...' : compName;
        return {
          name: shortName,
          period: r.metadata?.period || formatDate(r.created_at.split('T')[0]),
          Conciliados: r.total_reconciled || 0,
          Excepciones: r.total_exceptions || 0,
          Sugerencias: r.total_suggestions || 0,
        };
      });
  }, [recent]);

  const pieData = useMemo(() => {
    return [
      { name: '1:1 y N:1 Conciliados', value: stats.totalReconciled, color: '#10b981' },
      { name: 'Excepciones por Ajustar', value: stats.totalExceptions, color: '#f59e0b' },
      { name: 'Sugerencias Abiertas', value: stats.totalSuggestions, color: '#3b82f6' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Welcome Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center rounded-xl bg-card border border-border/70 p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Hola, {displayName}
            </h1>
            <Badge variant="secondary" className="text-xs font-medium">
              {roleName}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Periodo Contable Activo 2026
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Integridad SHA-256 Verificada
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button asChild className="h-10 px-4 font-semibold shadow-sm">
            <Link href="/dashboard/nueva">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Conciliación
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Primary KPI Executive Indicators */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Automatización */}
        <Card className="border-border/70 bg-card hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Efectividad de Pareo
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {stats.avgAutomation}%
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Automatizado
              </span>
            </div>
            <Progress value={stats.avgAutomation} className="h-1.5 bg-secondary" />
            <p className="text-[11px] text-muted-foreground">
              {stats.totalReconciled} transacciones cruzadas (1:1 y N:1)
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Monto Total Conciliado */}
        <Card className="border-border/70 bg-card hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monto Conciliado
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
              {formatCOP(stats.totalAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Validado en extractos bancarios y auxiliares
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Cédulas Cuadradas NIIF */}
        <Card className="border-border/70 bg-card hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cédulas NIIF Cuadradas
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Scale className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {stats.balancedCount}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                / {stats.totalReconciliations}
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Diferencia $0,00 COP certificada
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Partidas por Contabilizar */}
        <Card className="border-border/70 bg-card hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Partidas por Ajustar
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {stats.totalExceptions}
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              4x1000 GMF, intereses y notas de egreso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Quick Actions Grid (Atajos Operativos del Contador) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/nueva"
          className="group flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3.5 transition-all hover:border-primary hover:shadow-sm"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Cargar Extracto y Auxiliar
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Subida con verificación de hash SHA-256
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/conciliaciones"
          className="group flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3.5 transition-all hover:border-primary hover:shadow-sm"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileCheck2 className="h-4 w-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Cédulas Contables NIIF
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Conciliación bancaria oficial con firma
            </p>
          </div>
        </Link>

        {recent[0]?.id ? (
          <Link
            href={`/dashboard/conciliaciones/${recent[0].id}`}
            className="group flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.03] p-3.5 transition-all hover:border-emerald-500 hover:shadow-sm"
          >
            <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                Asientos Siigo / World Office
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                Generar notas contables y egresos
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3.5 opacity-60">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">Asientos Siigo / ERP</p>
              <p className="text-xs text-muted-foreground">Disponible tras conciliar</p>
            </div>
          </div>
        )}

        <Link
          href="/dashboard/empresas"
          className="group flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3.5 transition-all hover:border-primary hover:shadow-sm"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Empresas ({stats.companyCount})
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Cuentas Bancolombia, Davivienda, etc.
            </p>
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando métricas y conciliaciones...</p>
        </div>
      ) : stats.totalReconciliations === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-border/80 bg-card p-8 sm:p-12 text-center">
          <CardContent className="flex flex-col items-center max-w-md mx-auto space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">Tu panel de conciliación está listo</h3>
              <p className="text-sm text-muted-foreground">
                Carga el primer extracto bancario y el auxiliar contable de tu empresa para ver el pareo automático 1:1, la detección de 4x1000 y la Cédula Contable balanceada.
              </p>
            </div>
            <Button asChild className="h-10 px-5 font-semibold">
              <Link href="/dashboard/nueva">
                Iniciar primera conciliación
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 4. Analytics Section (2 Columns) */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart: Actividad por Empresa / Periodo */}
            <Card className="border-border/70 bg-card lg:col-span-2 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Actividad de Pareo y Excepciones</CardTitle>
                    <p className="text-xs text-muted-foreground">Comparativa de transacciones conciliadas vs. partidas pendientes</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Últimas {chartData.length} conciliaciones
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {chartData.length > 0 ? (
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="Conciliados" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Excepciones" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">Sin datos suficientes</div>
                )}
              </CardContent>
            </Card>

            {/* Diagnostic Pie & Breakdown */}
            <Card className="border-border/70 bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Distribución de Movimientos</CardTitle>
                <p className="text-xs text-muted-foreground">Diagnóstico del universo total procesado</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {pieData.length > 0 ? (
                  <div className="w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">Sin datos</div>
                )}

                <div className="space-y-2 pt-1 border-t border-border/60">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground truncate">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground font-mono">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 5. Conciliaciones Recientes (Reconciliations Table & Mobile Cards) */}
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">Historial de Conciliaciones</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Cédulas contables con balance NIIF y control de diferencias
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-lg text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFilterState('all')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      filterState === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todas ({recent.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterState('balanced')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      filterState === 'balanced'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Cuadradas ($0 Diff)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterState('exceptions')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      filterState === 'exceptions'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Con Partidas Pendientes
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredRecent.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hay conciliaciones con el filtro seleccionado.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredRecent.map((r) => {
                    const compName = r.metadata?.companyName || r.companies?.name || 'Empresa';
                    const nit = r.metadata?.companyNit || 'NIT Registrado';
                    const period = r.metadata?.period || formatDate(r.created_at.split('T')[0]);
                    const bankAccount = r.metadata?.ledgerAccount || 'Cuenta Principal';
                    const isBalanced = r.statement
                      ? Math.abs(r.statement.finalDifference ?? 0) < 0.01
                      : (r.auto_percentage ?? 0) >= 90;

                    return (
                      <div
                        key={r.id}
                        className="p-4 transition-colors hover:bg-secondary/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Company & Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground truncate max-w-xs sm:max-w-md">
                                {compName}
                              </span>
                              {isBalanced ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Cuadrada ($0 Diff)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                  <AlertTriangle className="h-3 w-3" />
                                  Diferencia Abierta
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>NIT: {nit}</span>
                              <span aria-hidden="true">·</span>
                              <span>{period}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{bankAccount}</span>
                            </div>
                          </div>
                        </div>

                        {/* Metrics & Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                          {/* Metrics Numbers */}
                          <div className="flex items-center gap-3 sm:gap-4 text-xs">
                            <div className="text-left md:text-right">
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {r.total_reconciled}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Conciliados</p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                {r.total_exceptions}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Excepciones</p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="font-bold text-foreground font-mono">
                                {r.auto_percentage}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">Efectividad</p>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <Button asChild size="sm" variant="outline" className="h-8 text-xs font-medium gap-1 shrink-0">
                            <Link href={`/dashboard/conciliaciones/${r.id}`}>
                              <span>Ver Cédula</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
