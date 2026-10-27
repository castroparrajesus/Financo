'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  RefreshCw,
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
  clearAllOfflineCache,
  getOfflineStorageMetrics,
} from '@/lib/offline/storage';
import { toast } from 'sonner';

interface OfflinePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCacheCleared?: () => void;
}

export function OfflinePolicyDialog({
  open,
  onOpenChange,
  onCacheCleared,
}: OfflinePolicyDialogProps) {
  const [metrics, setMetrics] = useState<{ count: number; estimatedKb: number }>({ count: 0, estimatedKb: 0 });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (open) {
      getOfflineStorageMetrics().then(setMetrics).catch(() => {});
    }
  }, [open]);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearAllOfflineCache();
      setMetrics({ count: 0, estimatedKb: 0 });
      toast.success('Caché local de conciliaciones eliminada');
      if (onCacheCleared) onCacheCleared();
    } catch {
      toast.error('No se pudo limpiar la caché local');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold">
              Política de Datos sin Conexión (Offline)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Protección de información financiera y contable conforme a la Ley 1581 de 2012 (Habeas Data Colombia).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm text-foreground">
          {/* Storage metric banner */}
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/50 p-3">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Almacenamiento Local Ocupado</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.count} {metrics.count === 1 ? 'cédula guardada' : 'cédulas guardadas'} (~{metrics.estimatedKb} KB)
                </p>
              </div>
            </div>
            {metrics.count > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={clearing}
                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Purgar caché
              </Button>
            )}
          </div>

          {/* Policy items */}
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                ¿Qué datos se guardan en tu dispositivo?
              </div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Movimientos bancarios y contables de las cédulas que hayas consultado previamente.</li>
                <li>Saldos iniciales, finales, diferencias y partidas conciliadas de la empresa seleccionada.</li>
                <li>Notas o justificaciones contables registradas por el auditor.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-3">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                ¿Qué datos NUNCA se almacenan localmente?
              </div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Contraseñas de acceso, tokens de API o credenciales de portales bancarios.</li>
                <li>Números completos de tarjetas de crédito o firmas digitales privadas.</li>
                <li>Información de otras empresas a las que tu usuario no tenga acceso autorizado.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border/80 bg-secondary/30 p-3">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                Seguridad y vigencia en auditorías de campo
              </div>
              <p className="text-muted-foreground">
                Los datos se resguardan en la base IndexedDB de tu navegador protegida por la sandbox del sistema operativo. Al cerrar sesión en Financo o presionar «Purgar caché», se eliminan de inmediato todos los registros locales.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
