'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, startDemo, recoverPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Recovery modal state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleDemoLogin = () => {
    startDemo();
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Sesión iniciada correctamente');
      router.push('/dashboard');
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setRecoveryLoading(true);
    const res = await recoverPassword(recoveryEmail, recoveryPassword);
    setRecoveryLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || 'Contraseña actualizada con éxito');
      setEmail(recoveryEmail);
      setPassword(recoveryPassword);
      setShowRecovery(false);
      setRecoveryPassword('');
      setRecoveryConfirm('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-14 w-16 items-center justify-center" suppressHydrationWarning>
              <BrandLogo size="md" />
            </div>
            <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales privadas para acceder al panel
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico o usuario</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="username"
                    type="text"
                    placeholder="tu-correo@empresa.com"
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(email);
                      setShowRecovery(true);
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 text-base sm:text-sm"
                    required
                    autoComplete="current-password"
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

              <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
                {loading ? 'Ingresando...' : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">o</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-10 border-border/80 hover:bg-secondary/60"
              onClick={handleDemoLogin}
            >
              <Eye className="mr-2 h-4 w-4 text-primary" />
              Explorar en Modo Demostración
            </Button>

            <div className="pt-4 text-center text-sm text-muted-foreground border-t border-border/40">
              ¿No tienes una cuenta aún?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Crear tu cuenta privada
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacidad" className="hover:text-foreground hover:underline">
            Política de Tratamiento de Datos (Ley 1581)
          </Link>
          <span>·</span>
          <Link href="/terminos" className="hover:text-foreground hover:underline">
            Términos de Servicio
          </Link>
        </div>
      </div>

      {/* Modal de Recuperación y Restablecimiento de Contraseña */}
      <Dialog open={showRecovery} onOpenChange={setShowRecovery}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <KeyRound className="h-5 w-5 text-primary" />
              Recuperar contraseña privada
            </DialogTitle>
            <DialogDescription>
              Ingresa el correo registrado de tu cuenta para restablecer tu clave de acceso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecoverySubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder="tu-correo@empresa.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="pl-10 text-base sm:text-sm"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-password">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recovery-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  className="pl-10 text-base sm:text-sm"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-confirm">Confirmar nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recovery-confirm"
                  type="password"
                  placeholder="Repite la nueva contraseña"
                  value={recoveryConfirm}
                  onChange={(e) => setRecoveryConfirm(e.target.value)}
                  className="pl-10 text-base sm:text-sm"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRecovery(false)}
                disabled={recoveryLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={recoveryLoading} className="font-semibold">
                {recoveryLoading ? 'Guardando...' : 'Restablecer contraseña'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
