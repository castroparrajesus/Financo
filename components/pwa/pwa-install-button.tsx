'use client';

import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export function PWAInstallButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  showText = true,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed in standalone mode, do not display
  if (isInstalled) {
    return null;
  }

  // Handle click based on platform
  const handleClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      await install();
      setInstalling(false);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // In browsers where beforeinstallprompt hasn't fired yet or isn't supported
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={installing}
        className={`inline-flex items-center gap-2 border-emerald-600/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 min-h-[38px] ${className}`}
        title="Instalar Financo en este dispositivo (Tablet, PC o Móvil)"
      >
        <Download className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        {showText && <span className="font-medium text-xs sm:text-sm">Instalar App</span>}
      </Button>

      {/* iOS & Desktop Install Guide Dialog */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-md sm:rounded-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 mb-2">
              <Smartphone className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Instalar Financo en tu dispositivo
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Accede directamente desde tu pantalla de inicio y consulta cédulas de conciliación sin conexión a internet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            {isIOS ? (
              <div className="space-y-3 rounded-lg border border-border/80 bg-secondary/40 p-4">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">1</span>
                  En Safari de iPad o iPhone:
                </p>
                <div className="flex items-center gap-3 text-muted-foreground pl-7">
                  <Share className="h-5 w-5 text-primary shrink-0" />
                  <span>Presiona el botón <strong>Compartir</strong> en la barra superior o inferior.</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground pl-7">
                  <PlusSquare className="h-5 w-5 text-primary shrink-0" />
                  <span>Desplázate hacia abajo y selecciona <strong>«Agregar a inicio»</strong>.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border/80 bg-secondary/40 p-4">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">1</span>
                  En Chrome, Edge o navegador móvil:
                </p>
                <p className="text-muted-foreground pl-7">
                  Haz clic en el menú del navegador (tres puntos <span className="font-mono">⋮</span>) y selecciona <strong>«Instalar Financo»</strong> o <strong>«Agregar a la pantalla principal»</strong>.
                </p>
              </div>
            )}

            <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2 border border-emerald-500/20">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Ventajas offline:</strong> Podrás abrir conciliaciones previas durante auditorías en campo o visitas a clientes sin depender de cobertura celular.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowIOSGuide(false)} className="w-full sm:w-auto">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
