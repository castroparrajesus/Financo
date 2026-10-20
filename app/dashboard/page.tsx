'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Building2,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCOP, formatDateTime } from '@/lib/format';
import { PLAN_LIMITS } from '@/lib/types';
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
  totalAmount: number;
  companyCount: number;
}

interface RecentRecon {
  id: string;
  created_at: string;
  total_reconciled: number;
  total_exceptions: number;
  total_suggestions: number;
  auto_percentage: number;
  companies: { name: string } | null;
}

export default function DashboardHome() {
  const { profile, isDemo } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReconciliations: 0,
    totalReconciled: 0,
    totalExceptions: 0,
    totalAmount: 0,
    companyCount: 0,
  });
  const [recent, setRecent] = useState<RecentRecon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (isDemo) {
        const recons = [...getDemoRuns().map((run) => run.reconciliation), ...DEMO_RECONCILIATIONS];
        setStats({
          totalReconciliations: recons.length,
          totalReconciled: recons.reduce((sum, r) => sum + r.total_reconciled, 0),
          totalExceptions: recons.reduce((sum, r) => sum + r.total_exceptions, 0),
          totalAmount: recons.reduce((sum, r) => sum + r.total_amount_reconciled, 0),
          companyCount: DEMO_COMPANIES.length,
        });
        setRecent(recons);
        setLoading(false);
        return;
      }

      const { data: reconData } = await supabase
        .from('reconciliations')
        .select('id, created_at, total_reconciled, total_exceptions, total_suggestions, auto_percentage, total_amount_reconciled, companies(name)')
        .order('created_at', { ascending: false })
        .limit(10);

      const { count: companyCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const recons = reconData || [];
      const totalReconciled = recons.reduce((sum, r) => sum + r.total_reconciled, 0);
      const totalExceptions = recons.reduce((sum, r) => sum + r.total_exceptions, 0);
      const totalAmount = recons.reduce((sum, r) => sum + Number(r.total_amount_reconciled), 0);

      setStats({
        totalReconciliations: recons.length,
        totalReconciled,
        totalExceptions,
        totalAmount,
        companyCount: companyCount || 0,
      });
      setRecent(recons as unknown as RecentRecon[]);
      setLoading(false);
    }
    loadData();
  }, [isDemo]);

  const planLimit = profile ? PLAN_LIMITS[profile.plan]?.companies : 5;
  const planLabel = profile ? PLAN_LIMITS[profile.plan]?.label : 'Esencial';

  const pieData = [
    { name: 'Conciliados', value: stats.totalReconciled, color: 'hsl(142 71% 45%)' },
    { name: 'Sugerencias', value: recent.reduce((s, r) => s + r.total_suggestions, 0), color: 'hsl(38 92% 50%)' },
    { name: 'Excepciones', value: stats.totalExceptions, color: 'hsl(0 84% 60%)' },
  ].filter((d) => d.value > 0);

  const chartData = recent.slice(0, 7).reverse().map((r) => ({
    name: new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
    Conciliados: r.total_reconciled,
    Excepciones: r.total_exceptions,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel principal</h1>
          <p className="text-muted-foreground">Resumen de tu actividad de conciliación</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/nueva">
            Nueva conciliación
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conciliaciones</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReconciliations}</div>
            <p className="text-xs text-muted-foreground">total realizadas</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Movimientos conciliados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReconciled}</div>
            <p className="text-xs text-muted-foreground">cruces exitosos</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monto conciliado</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCOP(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">acumulado</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.companyCount} <span className="text-sm font-normal text-muted-foreground">/ {planLimit}</span>
            </div>
            <p className="text-xs text-muted-foreground">plan {planLabel}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando datos...</div>
      ) : stats.totalReconciliations === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aún no tienes conciliaciones</h3>
              <p className="text-sm text-muted-foreground">Crea tu primera conciliación para ver métricas aquí</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/nueva">
                Comenzar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Actividad reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0 0% 100%)',
                        border: '1px solid hsl(214 32% 91%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="Conciliados" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Excepciones" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Sin datos suficientes</p>
              )}
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Distribución de resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Sin datos</p>
              )}
              <div className="mt-4 space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                    </div>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent list */}
          <Card className="border-border/60 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Conciliaciones recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recent.map((r) => (
                  <Link
                    key={r.id}
                    href={`/dashboard/conciliaciones/${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{r.companies?.name || 'Empresa'}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(r.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">{r.total_reconciled}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">conciliados</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <span className="text-sm font-medium">{r.total_suggestions}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">sugerencias</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">{r.total_exceptions}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">excepciones</p>
                      </div>
                      <Badge variant="secondary">{r.auto_percentage}% automático</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
