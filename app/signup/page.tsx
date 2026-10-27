'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, CheckCircle2, Shield, FileText, AlertCircle, ExternalLink, Info } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand-logo';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('accountant');
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedConsent) {
      setConsentError(true);
      toast.error('Es requisito legal (Ley 1581 de 2012) autorizar de manera expresa el tratamiento de datos personales para continuar.');
      const elem = document.getElementById('habeas-data-consent');
      if (elem) elem.focus();
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role, {
      accepted: true,
      version: 'Ley1581-2026-v1',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser',
      ip: '127.0.0.1 (Web Registration)',
    });
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('¡Cuenta creada y consentimiento registrado con éxito! Bienvenido a Financo.');
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
        <Card className="border-border/60 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-16 items-center justify-center" suppressHydrationWarning>
              <BrandLogo size="md" />
            </div>
            <CardTitle className="text-2xl font-bold">Crear cuenta privada</CardTitle>
            <p className="text-sm text-muted-foreground">Comienza a conciliar extractos bancarios en minutos</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ej. Juan Carlos Meza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 text-base sm:text-sm"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol o cargo profesional</Label>
                <div className="relative">
                  <Select value={role} onValueChange={(val: UserRole) => setRole(val)}>
                    <SelectTrigger className="w-full text-base sm:text-sm">
                      <SelectValue placeholder="Selecciona tu rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accountant">Contador Principal</SelectItem>
                      <SelectItem value="assistant">Auxiliar de Contabilidad / Tesorería</SelectItem>
                      <SelectItem value="auditor">Revisora Fiscal / Auditora Financiera</SelectItem>
                      <SelectItem value="owner">Gerente / Director Financiero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contador@miempresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 text-base sm:text-sm"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 text-base sm:text-sm"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Consent Box — Ley 1581 de 2012 (Habeas Data Colombia) */}
              <div
                className={`rounded-lg border p-3 transition-colors ${
                  consentError && !acceptedConsent
                    ? 'border-destructive/80 bg-destructive/5'
                    : 'border-border/70 bg-secondary/20'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="habeas-data-consent"
                    checked={acceptedConsent}
                    onChange={(e) => {
                      setAcceptedConsent(e.target.checked);
                      if (e.target.checked) setConsentError(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    aria-describedby="habeas-data-desc"
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="habeas-data-consent"
                      id="habeas-data-desc"
                      className="text-xs text-muted-foreground leading-snug cursor-pointer select-none block"
                    >
                      Autorizo de manera <strong className="text-foreground">previa, expresa e informada</strong> a{' '}
                      <strong className="text-foreground">Financo S.A.S.</strong> el tratamiento de mis datos personales
                      conforme a la <strong>Ley Estatutaria 1581 de 2012</strong> y supletoriamente el Decreto 1377 de 2013, según
                      lo establecido en la{' '}
                      <Link
                        href="/privacidad"
                        target="_blank"
                        className="text-primary hover:underline font-semibold"
                      >
                        Política de Tratamiento de Información
                      </Link>{' '}
                      y acepto los{' '}
                      <Link
                        href="/terminos"
                        target="_blank"
                        className="text-primary hover:underline font-semibold"
                      >
                        Términos de Servicio
                      </Link>.
                    </label>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setShowConsentModal(true)}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <Info className="h-3 w-3" />
                        Ver resumen de la autorización legal
                      </button>
                    </div>
                  </div>
                </div>

                {consentError && !acceptedConsent && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Debes marcar esta casilla para autorizar el tratamiento conforme a la ley colombiana.</span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              </Button>
            </form>

            <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Acceso inmediato para pruebas y evaluación</span>
              </div>
              <p>Tu cuenta quedará activa inmediatamente con las empresas y datos de ejemplo listos para evaluar.</p>
            </div>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta o deseas usar una de prueba?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modal Resumen Informativo Habeas Data (Ley 1581 de 2012) */}
      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Shield className="h-5 w-5 text-primary" />
              Resumen de Autorización de Tratamiento de Datos Personales
            </DialogTitle>
            <DialogDescription className="text-xs">
              En cumplimiento del Artículo 12 de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs text-muted-foreground pt-2">
            <div className="rounded-lg bg-secondary/40 p-3 space-y-1">
              <p className="font-semibold text-foreground">Responsable del Tratamiento:</p>
              <p>Financo S.A.S. · NIT 901.842.193-4 · Domicilio: Bogotá D.C., Colombia.</p>
              <p>Canal de atención para el ejercicio de derechos ARCO: <strong className="text-foreground">privacidad@financo.co</strong></p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">Finalidades informadas al Titular:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Creación y administración de la cuenta de usuario y control de accesos.</li>
                <li>Conciliación analítica algorítmica entre extractos bancarios y auxiliares contables.</li>
                <li>Generación y exportación de la Cédula Contable oficial y papeles de auditoría.</li>
                <li>Soporte contable y tributario para requerimientos de auditoría y DIAN.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-1 text-emerald-950 dark:text-emerald-200">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Garantía de Seguridad Financiera:
              </p>
              <p className="text-[11px] leading-relaxed">
                Financo <strong>NUNCA</strong> solicita ni almacena contraseñas bancarias, tokens transaccionales ni claves de portales bancarios.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">Derechos que le asisten como Titular (Art. 8 Ley 1581):</p>
              <p>
                Usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos personales, solicitar prueba de la autorización otorgada, presentar quejas ante la Superintendencia de Industria y Comercio (SIC) y revocar la autorización en cualquier momento mediante solicitud a <strong>privacidad@financo.co</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/60">
              <Link
                href="/privacidad"
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Leer Política Completa (9 secciones)
              </Link>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setAcceptedConsent(true);
                  setConsentError(false);
                  setShowConsentModal(false);
                }}
                className="w-full sm:w-auto text-xs font-semibold"
              >
                Aceptar y marcar casilla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
