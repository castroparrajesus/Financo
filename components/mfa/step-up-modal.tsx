'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Lock,
  ArrowRight,
  Smartphone,
  ChevronDown,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface FactorItem {
  id: string;
  friendly_name?: string;
}

interface StepUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function StepUpModal({
  open,
  onOpenChange,
  onSuccess,
  title = 'Re-autenticación de Seguridad (Paso Elevado AAL2)',
  description = 'Esta acción involucra exportación de papeles de trabajo o datos financieros sensibles. Ingresa tu código de 6 dígitos para continuar.',
}: StepUpModalProps) {
  const { isDemo } = useAuth();
  const [totpCode, setTotpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [factors, setFactors] = useState<FactorItem[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTotpCode('');
      setVerifying(false);
      return;
    }

    async function fetchFactors() {
      if (isDemo) {
        const demoFactors: FactorItem[] = [
          { id: 'demo-totp-primary', friendly_name: 'Dispositivo Principal' },
        ];
        setFactors(demoFactors);
        setSelectedFactorId('demo-totp-primary');
        return;
      }
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (!error && data?.totp) {
          const verified = data.totp.filter((f) => f.status === 'verified');
          setFactors(verified);
          if (verified.length > 0) {
            setSelectedFactorId(verified[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }
    fetchFactors();
  }, [open, isDemo]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim().replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos generado por tu app autenticadora.');
      return;
    }

    setVerifying(true);

    if (isDemo) {
      setTimeout(() => {
        setVerifying(false);
        onOpenChange(false);
        toast.success('Paso elevado verificado con éxito (modo demo)');
        onSuccess();
      }, 500);
      return;
    }

    try {
      if (!selectedFactorId) {
        // Si no hay factor verificado en la cuenta, autorizar directamente
        setVerifying(false);
        onOpenChange(false);
        onSuccess();
        return;
      }

      // Paso 1: challenge() explícito
      const challengeRes = await supabase.auth.mfa.challenge({
        factorId: selectedFactorId,
      });

      if (challengeRes.error || !challengeRes.data?.id) {
        toast.error('Código incorrecto. Intenta de nuevo.');
        setVerifying(false);
        return;
      }

      // Paso 2: verify() explícito con challengeId
      const verifyRes = await supabase.auth.mfa.verify({
        factorId: selectedFactorId,
        challengeId: challengeRes.data.id,
        code: cleanCode,
      });

      if (verifyRes.error) {
        toast.error('Código incorrecto. Intenta de nuevo.');
        setVerifying(false);
        return;
      }

      // Paso 3 (Requisito 6): Refrescar sesión para actualizar el token JWT a AAL2 ANTES de exportar
      await supabase.auth.refreshSession();

      toast.success('Nivel AAL2 confirmado. Procediendo con la acción solicitada...');
      setVerifying(false);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error('Código incorrecto. Intenta de nuevo.');
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 pb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 pt-2">
          {factors.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Dispositivo seleccionado:</Label>
              <select
                value={selectedFactorId || ''}
                onChange={(e) => setSelectedFactorId(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
              >
                {factors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.friendly_name || 'Dispositivo TOTP'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stepup-code" className="text-xs font-semibold">
              Código TOTP de 6 dígitos
            </Label>
            <Input
              id="stepup-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-xl font-mono tracking-widest font-bold"
              autoFocus
              required
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Abre tu aplicación autenticadora configurada.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={totpCode.length !== 6 || verifying}
              className="text-xs gap-1.5"
            >
              {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              <span>{verifying ? 'Verificando...' : 'Confirmar y Continuar'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
