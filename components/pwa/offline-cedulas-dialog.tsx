'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Calendar,
  Building2,
  HardDrive,
  ArrowRight,
  Trash2,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  listCachedReconciliations,
  deleteReconciliationOffline,
  CachedReconciliationSummary,
} from '@/lib/offline/storage';
import { formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

interface OfflineCedulasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfflineCedulasDialog({
  open,
  onOpenChange,
}: OfflineCedulasDialogProps) {
  const router = useRouter();
  const [cachedItems, setCachedItems] = useState<CachedReconciliationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      const items = await listCachedReconciliations();
      setCachedItems(items);
    } catch {
      setCachedItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  const handleOpenCedula = (id: string) => {
    onOpenChange(false);
    router.push(`/dashboard/conciliaciones/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteReconciliationOffline(id);
      setCachedItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Cédula eliminada de la memoria local');
    } catch {
      toast.error('No se pudo eliminar la cédula');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <HardDrive className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold">
              Cédulas Guardadas sin Conexión
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Consulta auditorías y hojas de trabajo de conciliación disponibles en la memoria de este dispositivo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2 pr-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Cargando cédulas en caché...
            </div>
          ) : cachedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 p-8 text-center">
              <WifiOff className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">
                No hay cédulas en la memoria local todavía
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Las conciliaciones que abras o proceses en Financo se almacenan automáticamente para que puedas revisarlas en cualquier lugar sin internet.
              </p>
            </div>
          ) : (
            cachedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenCedula(item.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3 hover:border-primary/50 hover:bg-secondary/40 transition cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm truncate text-foreground">
                      {item.companyName}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.period}
                    </span>
                    <span>•</span>
                    <span>{item.totalBankRows} movs banco</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {item.autoPercentage}% conciliado
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(e, item.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Eliminar de la memoria local"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs group-hover:border-primary group-hover:text-primary"
                  >
                    <span>Abrir cédula</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
          <span>{cachedItems.length} {cachedItems.length === 1 ? 'cédula lista' : 'cédulas listas'} para uso offline</span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
