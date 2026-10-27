'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, HardDrive, ShieldCheck, X } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineCedulasDialog } from './offline-cedulas-dialog';
import { OfflinePolicyDialog } from './offline-policy-dialog';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showCedulas, setShowCedulas] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setDismissed(false);
    } else if (wasOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showRestoredNotice) {
    return (
      <>
        <OfflineCedulasDialog open={showCedulas} onOpenChange={setShowCedulas} />
        <OfflinePolicyDialog open={showPolicy} onOpenChange={setShowPolicy} />
      </>
    );
  }

  // Connection Restored toast
  if (isOnline && showRestoredNotice) {
    return (
      <aside
        aria-label="Notificación de conectividad"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/90 px-3.5 py-2 text-xs font-medium text-emerald-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>Conexión restablecida. Sincronización en línea activa.</span>
      </aside>
    );
  }

  // Offline banner/pill (dismissible)
  if (dismissed) {
    return (
      <>
        {/* Floating mini trigger button to reopen offline drawer */}
        <aside aria-label="Acceso rápido sin conexión">
          <button
            onClick={() => setDismissed(false)}
            className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/90 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-md hover:bg-amber-900/90 transition"
            title="Abrir menú sin conexión"
          >
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            <span>Sin conexión</span>
          </button>
        </aside>
        <OfflineCedulasDialog open={showCedulas} onOpenChange={setShowCedulas} />
        <OfflinePolicyDialog open={showPolicy} onOpenChange={setShowPolicy} />
      </>
    );
  }

  return (
    <>
      <aside
        aria-label="Aviso de estado sin conexión"
        className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 rounded-xl border border-amber-500/40 bg-card/95 p-3 shadow-2xl backdrop-blur-md text-foreground transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <span>Modo sin conexión</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Puedes seguir consultando cédulas guardadas en la memoria local segura.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            title="Minimizar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-border/50">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCedulas(true)}
            className="h-7 text-xs gap-1.5 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30"
          >
            <HardDrive className="h-3 w-3" />
            Ver cédulas guardadas
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPolicy(true)}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Privacidad
          </Button>
        </div>
      </aside>

      <OfflineCedulasDialog open={showCedulas} onOpenChange={setShowCedulas} />
      <OfflinePolicyDialog open={showPolicy} onOpenChange={setShowPolicy} />
    </>
  );
}
