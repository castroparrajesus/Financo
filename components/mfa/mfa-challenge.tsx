'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Shield,
  ChevronDown,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FactorItem {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

interface MFAChallengeProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

const LOCAL_DEMO_FACTORS_KEY = 'financo_demo_mfa_factors_v2';

export function MFAChallenge({ onSuccess, redirectTo = '/dashboard' }: MFAChallengeProps) {
  const router = useRouter();
  const { isDemo } = useAuth();
  const [totpCode, setTotpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [factors, setFactors] = useState<FactorItem[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [showFactorSelector, setShowFactorSelector] = useState(false);

  useEffect(() => {
    async function loadFactors() {
      setLoadingFactors(true);
      if (isDemo) {
        if (typeof window !== 'undefined') {
          const stored = window.sessionStorage.getItem(LOCAL_DEMO_FACTORS_KEY);
          if (stored) {
            try {
              const parsed: FactorItem[] = JSON.parse(stored);
              setFactors(parsed);
              if (parsed.length > 0) setSelectedFactorId(parsed[0].id);
            } catch {
              setFactors([]);
            }
          } else {
            const demoDefault: FactorItem[] = [
              { id: 'demo-factor-primary', friendly_name: 'Dispositivo Principal (Demo)', factor_type: 'totp', status: 'verified' },
              { id: 'demo-factor-backup', friendly_name: 'Factor de Respaldo (Demo)', factor_type: 'totp', status: 'verified' },
            ];
            setFactors(demoDefault);
            setSelectedFactorId(demoDefault[0].id);
          }
        }
        setLoadingFactors(false);
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
        setFactors([]);
      } finally {
        setLoadingFactors(false);
      }
    }
    loadFactors();
  }, [isDemo]);

  const selectedFactor = factors.find((f) => f.id === selectedFactorId) || factors[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim().replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error('Ingresa los 6 dígitos que muestra tu aplicación autenticadora.');
      return;
    }

    setVerifying(true);

    if (isDemo) {
      setTimeout(() => {
        setVerifying(false);
        toast.success(`Identidad verificada con ${selectedFactor?.friendly_name || 'segundo factor'}.`);
        if (onSuccess) onSuccess();
        else router.push(redirectTo);
      }, 500);
      return;
    }

    try {
      if (!selectedFactorId) {
        toast.error('No se encontró un factor TOTP configurado en esta cuenta.');
        setVerifying(false);
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

      // Paso 2: verify() con factorId y challengeId (evita bug de cuelgue de challengeAndVerify)
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

      // Refrescar sesión para emitir token JWT con claim aal2
      await supabase.auth.refreshSession();

      toast.success('¡Segundo factor verificado! Nivel AAL2 activo.');
      if (onSuccess) onSuccess();
      else router.push(redirectTo);
    } catch {
      toast.error('Código incorrecto. Intenta de nuevo.');
    } finally {
      setVerifying(false);
    }
  };

  if (loadingFactors) {
    return (
      <Card className="border-border/80 shadow-md max-w-md mx-auto">
        <CardContent className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Verificando factores de autenticación...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-xl max-w-md mx-auto">
      <CardHeader className="text-center pb-4 bg-muted/20 border-b">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold">Verificación de Segundo Factor (MFA)</CardTitle>
        <CardDescription className="text-xs">
          Tu cuenta requiere verificación AAL2 para acceder a la plataforma contable.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        {/* Indicador del factor actualmente seleccionado */}
        <div className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {selectedFactor?.friendly_name || 'Dispositivo TOTP'}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              TOTP
            </Badge>
          </div>

          {/* Botón para alternar a factor de respaldo si tiene más de 1 factor */}
          {factors.length > 1 && (
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFactorSelector(!showFactorSelector)}
                className="w-full text-xs h-7 text-primary justify-between px-2 hover:bg-primary/10"
              >
                <span>Usar factor de respaldo ({factors.length} disponibles)</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFactorSelector ? 'rotate-180' : ''}`} />
              </Button>

              {showFactorSelector && (
                <div className="mt-2 space-y-1.5 pt-1 border-t border-border/60">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Elige el factor con el que deseas autenticarte:
                  </p>
                  {factors.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFactorId(f.id);
                        setShowFactorSelector(false);
                        setTotpCode('');
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors border ${
                        f.id === selectedFactorId
                          ? 'border-primary bg-primary/10 font-semibold text-primary'
                          : 'border-border/60 hover:bg-muted/40 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>{f.friendly_name || 'Factor TOTP'}</span>
                      </div>
                      {f.id === selectedFactorId && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="challenge-totp" className="text-xs font-semibold text-foreground">
              Ingresa el código de 6 dígitos que muestra tu app
            </Label>
            <Input
              id="challenge-totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center text-2xl font-mono tracking-widest font-bold"
              autoFocus
              required
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Abre tu app autenticadora configurada para este dispositivo.
            </p>
          </div>

          <Button
            type="submit"
            disabled={verifying || totpCode.length !== 6}
            className="w-full h-10 text-xs font-semibold gap-2"
          >
            {verifying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Verificar y Entrar</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="border-t border-border/70 pt-2 text-center text-xs text-muted-foreground">
          <p className="text-[11px] flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            <span>Autenticación de grado financiero conforme a NIIF y Ley 1581</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
