'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  Trash2,
  Plus,
  Smartphone,
  Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface EnrolledFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at?: string;
}

const LOCAL_DEMO_FACTORS_KEY = 'financo_demo_mfa_factors_v2';

export function EnrollMFA() {
  const { user, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<EnrolledFactor[]>([]);

  // Enrollment State
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [factorFriendlyName, setFactorFriendlyName] = useState('');
  const [enrollingFactorId, setEnrollingFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [secretText, setSecretText] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const loadFactors = useCallback(async () => {
    setLoading(true);
    if (isDemo || !user) {
      if (typeof window !== 'undefined') {
        const stored = window.sessionStorage.getItem(LOCAL_DEMO_FACTORS_KEY);
        if (stored) {
          try {
            setFactors(JSON.parse(stored));
          } catch {
            setFactors([]);
          }
        } else {
          // Check legacy session flag
          const legacy = window.sessionStorage.getItem('financo_demo_mfa_active') === 'true';
          if (legacy) {
            const initialDemo: EnrolledFactor[] = [
              {
                id: 'demo-factor-primary',
                friendly_name: 'Dispositivo Principal (Demo)',
                factor_type: 'totp',
                status: 'verified',
              },
            ];
            window.sessionStorage.setItem(LOCAL_DEMO_FACTORS_KEY, JSON.stringify(initialDemo));
            setFactors(initialDemo);
          } else {
            setFactors([]);
          }
        }
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data?.totp) {
        const verifiedOnly = data.totp
          .filter((f) => f.status === 'verified')
          .map((f) => ({
            id: f.id,
            friendly_name: f.friendly_name || 'Dispositivo TOTP',
            factor_type: f.factor_type,
            status: f.status,
            created_at: f.created_at,
          }));
        setFactors(verifiedOnly);
      } else {
        setFactors([]);
      }
    } catch {
      setFactors([]);
    } finally {
      setLoading(false);
    }
  }, [isDemo, user]);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  const verifiedFactors = factors.filter((f) => f.status === 'verified');
  const canAddMoreFactors = verifiedFactors.length < 10;

  // Start enrollment of primary or backup TOTP factor
  const handleStartEnrollment = async (isBackup = false) => {
    setIsEnrolling(true);
    setTotpCode('');
    setQrCodeSvg(null);
    setSecretText(null);

    const defaultName = isBackup
      ? `Factor de Respaldo #${verifiedFactors.length + 1}`
      : verifiedFactors.length === 0
      ? 'Dispositivo Principal'
      : `Factor Adicional #${verifiedFactors.length + 1}`;

    setFactorFriendlyName(defaultName);

    if (isDemo) {
      const mockSecret = 'JBSWY3DPEHPK3PXP' + Math.floor(Math.random() * 89 + 10);
      setEnrollingFactorId(`demo-factor-${Date.now()}`);
      setSecretText(mockSecret);
      setQrCodeSvg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="160" height="160">
          <rect width="120" height="120" fill="white"/>
          <rect x="10" y="10" width="30" height="30" fill="black"/>
          <rect x="15" y="15" width="20" height="20" fill="white"/>
          <rect x="20" y="20" width="10" height="10" fill="black"/>
          <rect x="80" y="10" width="30" height="30" fill="black"/>
          <rect x="85" y="15" width="20" height="20" fill="white"/>
          <rect x="90" y="20" width="10" height="10" fill="black"/>
          <rect x="10" y="80" width="30" height="30" fill="black"/>
          <rect x="15" y="85" width="20" height="20" fill="white"/>
          <rect x="20" y="90" width="10" height="10" fill="black"/>
          <rect x="50" y="20" width="20" height="10" fill="black"/>
          <rect x="50" y="50" width="20" height="20" fill="black"/>
          <rect x="80" y="60" width="10" height="20" fill="black"/>
          <rect x="20" y="50" width="10" height="20" fill="black"/>
        </svg>`
      );
      return;
    }

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Financo',
        friendlyName: defaultName,
      });

      if (error) {
        toast.error(`Error al iniciar enrolamiento: ${error.message}`);
        setIsEnrolling(false);
        return;
      }

      if (data?.totp) {
        setEnrollingFactorId(data.id);
        setQrCodeSvg(data.totp.qr_code);
        setSecretText(data.totp.secret);
      }
    } catch {
      toast.error('No se pudo conectar con el servicio de autenticación.');
      setIsEnrolling(false);
    }
  };

  // Cancel enrollment
  const handleCancelEnrollment = async () => {
    if (enrollingFactorId && !isDemo) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollingFactorId });
      } catch {
        // Silently clean up
      }
    }
    setIsEnrolling(false);
    setEnrollingFactorId(null);
    setQrCodeSvg(null);
    setSecretText(null);
    setTotpCode('');
    toast.info('Enrolamiento de factor cancelado.');
  };

  // Submit and verify TOTP code: challenge() followed by verify()
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim().replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos emitido por tu aplicación autenticadora.');
      return;
    }

    setVerifying(true);

    if (isDemo) {
      setTimeout(() => {
        setVerifying(false);
        const newFactor: EnrolledFactor = {
          id: enrollingFactorId || `demo-factor-${Date.now()}`,
          friendly_name: factorFriendlyName || 'Dispositivo TOTP (Demo)',
          factor_type: 'totp',
          status: 'verified',
        };
        const updated = [...factors, newFactor];
        setFactors(updated);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LOCAL_DEMO_FACTORS_KEY, JSON.stringify(updated));
          window.sessionStorage.setItem('financo_demo_mfa_active', 'true');
        }
        setIsEnrolling(false);
        toast.success(`¡"${newFactor.friendly_name}" verificado y habilitado con éxito!`);
      }, 600);
      return;
    }

    try {
      if (!enrollingFactorId) {
        toast.error('Sesión de enrolamiento no válida.');
        setVerifying(false);
        return;
      }

      // Paso 1: challenge() explícito
      const challengeRes = await supabase.auth.mfa.challenge({ factorId: enrollingFactorId });
      if (challengeRes.error || !challengeRes.data?.id) {
        toast.error('Código incorrecto. Intenta de nuevo.');
        setVerifying(false);
        return;
      }

      // Paso 2: verify() con challengeId
      const verifyRes = await supabase.auth.mfa.verify({
        factorId: enrollingFactorId,
        challengeId: challengeRes.data.id,
        code: cleanCode,
      });

      if (verifyRes.error) {
        toast.error('Código incorrecto. Intenta de nuevo.');
        setVerifying(false);
        return;
      }

      // Refrescar sesión para actualizar claims a AAL2
      await supabase.auth.refreshSession();

      setIsEnrolling(false);
      toast.success(`¡Factor "${factorFriendlyName}" activado exitosamente!`);
      await loadFactors();
    } catch {
      toast.error('Código incorrecto. Intenta de nuevo.');
    } finally {
      setVerifying(false);
    }
  };

  // Unenroll a factor
  const handleUnenrollFactor = async (factor: EnrolledFactor) => {
    const isLast = verifiedFactors.length <= 1;
    const msg = isLast
      ? '¿Estás seguro de deshabilitar este factor? Al ser tu único factor, tu cuenta volverá al nivel básico AAL1.'
      : `¿Estás seguro de eliminar el factor "${factor.friendly_name}"?`;

    const ok = window.confirm(msg);
    if (!ok) return;

    if (isDemo) {
      const updated = factors.filter((f) => f.id !== factor.id);
      setFactors(updated);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(LOCAL_DEMO_FACTORS_KEY, JSON.stringify(updated));
        if (updated.length === 0) {
          window.sessionStorage.removeItem('financo_demo_mfa_active');
        }
      }
      toast.success('Factor eliminado.');
      return;
    }

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        toast.error(`Error al eliminar factor: ${error.message}`);
      } else {
        toast.success(`Factor "${factor.friendly_name}" deshabilitado correctamente.`);
        await supabase.auth.refreshSession();
        await loadFactors();
      }
    } catch {
      toast.error('No se pudo eliminar el factor.');
    }
  };

  const handleCopySecret = () => {
    if (!secretText) return;
    navigator.clipboard.writeText(secretText);
    setCopiedSecret(true);
    toast.success('Clave secreta copiada al portapapeles');
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  if (loading) {
    return (
      <Card className="border-border/80 shadow-xs">
        <CardContent className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Verificando estado de seguridad MFA...</span>
        </CardContent>
      </Card>
    );
  }

  // Vista: Enrolamiento en progreso (Escaneo de QR + Input de 6 dígitos)
  if (isEnrolling) {
    return (
      <Card className="border-primary/40 shadow-md">
        <CardHeader className="bg-primary/5 border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Configurar Factor TOTP: {factorFriendlyName}
                </CardTitle>
                <CardDescription className="text-xs">
                  Escanea el código con tu app autenticadora (Google Authenticator, Microsoft Authenticator, 1Password o Authy)
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancelEnrollment} className="h-8 text-xs">
              Cancelar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Paso 1: Código QR */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/80 bg-white dark:bg-zinc-900 text-center space-y-3">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                1. Escanea este código QR con tu app:
              </p>
              {qrCodeSvg ? (
                <div
                  className="p-2 bg-white rounded-lg shadow-xs inline-block max-w-[160px] max-h-[160px]"
                  dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                />
              ) : (
                <div className="h-40 w-40 flex items-center justify-center bg-muted/40 rounded-lg">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Secreto manual */}
              {secretText && (
                <div className="w-full pt-1 space-y-1">
                  <span className="text-[10px] text-muted-foreground block">
                    ¿No puedes escanear? Ingresa esta clave secreta:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xs font-mono font-bold bg-muted/60 px-2 py-1 rounded text-foreground select-all">
                      {secretText}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopySecret}
                      className="h-7 w-7 p-0"
                      title="Copiar clave secreta"
                    >
                      {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Paso 2: Input de 6 dígitos */}
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  2. Ingresa el código de 6 dígitos emitido:
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="totp-input" className="text-xs font-medium text-muted-foreground">
                    Código de verificación
                  </Label>
                  <Input
                    id="totp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-center text-xl font-mono tracking-widest font-bold"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  El código cambia automáticamente cada 30 segundos en tu dispositivo móvil.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={totpCode.length !== 6 || verifying}
                  className="w-full text-xs h-9 gap-1.5"
                >
                  {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  <span>{verifying ? 'Verificando...' : 'Habilitar Factor'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEnrollment}
                  className="text-xs h-9"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista: Factores verificados existentes y/o botón de enrolar
  if (verifiedFactors.length > 0) {
    return (
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="bg-muted/20 border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span>Autenticación de Dos Factores (TOTP)</span>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5 text-[10px]">
                    Activo · AAL2 ({verifiedFactors.length} {verifiedFactors.length === 1 ? 'factor' : 'factores'})
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Tu cuenta requiere código TOTP en cada inicio de sesión y acciones sensibles.
                </CardDescription>
              </div>
            </div>

            {canAddMoreFactors && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleStartEnrollment(true)}
                className="text-xs h-8 gap-1.5 self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Enrolar Factor de Respaldo</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Factores TOTP Registrados ({verifiedFactors.length}/10):
            </p>
            <div className="grid gap-2">
              {verifiedFactors.map((factor, index) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {factor.friendly_name || `Factor ${index + 1}`}
                        </span>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                            Principal
                          </Badge>
                        )}
                        {index > 0 && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                            Respaldo #{index}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        ID: {factor.id.slice(0, 18)}...
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnenrollFactor(factor)}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                    title="Eliminar factor"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/10 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Respaldo y Continuidad Operativa:</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Puedes registrar hasta 10 aplicaciones o dispositivos autenticadores. Si pierdes acceso a tu teléfono principal, puedes autenticarte con tu factor de respaldo registrado en tu tablet, gestor de contraseñas u otro dispositivo.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista: Sin factores aún
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="bg-muted/20 border-b pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>Autenticación de Dos Factores (TOTP)</span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  No configurado
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Añade una capa bancaria de seguridad exigiendo un código temporal generado en tu teléfono
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => handleStartEnrollment(false)}
            className="text-xs h-8 gap-1.5 self-start sm:self-auto"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Configurar Primer Factor (TOTP)</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 text-xs space-y-2 text-muted-foreground">
        <p>
          Al habilitar el segundo factor, tu sesión ascenderá al nivel de garantía <strong>AAL2</strong> (Authenticator Assurance Level 2). Esto garantiza que las conciliaciones bancarias y extractos solo puedan ser manipulados con tu autorización física. Podrás registrar factores adicionales de respaldo una vez configurado el primero.
        </p>
      </CardContent>
    </Card>
  );
}
