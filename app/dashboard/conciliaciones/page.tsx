'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCOP, formatDateTime } from '@/lib/format';
import { Reconciliation } from '@/lib/types';
import { DEMO_RECONCILIATIONS, getDemoRuns } from '@/lib/demo-data';
import { useAuth } from '@/lib/supabase/auth-context';

interface ReconWithCompany extends Reconciliation {
  companies: { name: string } | null;
}

export default function ReconciliationsListPage() {
  const { isDemo } = useAuth();
  const [recons, setRecons] = useState<ReconWithCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (isDemo) {
        const demoRuns = getDemoRuns().map((run) => run.reconciliation);
        setRecons([...demoRuns, ...DEMO_RECONCILIATIONS]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('reconciliations')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
      } else {
        setRecons(data as ReconWithCompany[]);
      }
      setLoading(false);
    }
    load();
  }, [isDemo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conciliaciones</h1>
          <p className="text-muted-foreground">Historial de todas tus conciliaciones</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando...</div>
      ) : recons.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sin conciliaciones</h3>
              <p className="text-sm text-muted-foreground">Crea tu primera conciliación para comenzar</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/nueva">Comenzar</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recons.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/conciliaciones/${r.id}`}
              className="block rounded-xl border border-border/60 p-5 transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{r.companies?.name || 'Empresa'}</h3>
                    <p className="text-sm text-muted-foreground">{formatDateTime(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="font-medium">{r.total_reconciled}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">conciliados</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium">{r.total_suggestions}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">sugerencias</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{r.total_exceptions}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">excepciones</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCOP(Number(r.total_amount_reconciled))}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                  <Badge variant="secondary">{r.auto_percentage}% automático</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
