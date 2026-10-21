'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, User, Briefcase, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand-logo';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('accountant');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('Debes autorizar el tratamiento de datos personales (Ley 1581) para continuar.');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('¡Cuenta creada con éxito! Bienvenido a Financo.');
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
            <div className="mx-auto mb-3 flex h-14 w-16 items-center justify-center">
              <BrandLogo size="md" />
            </div>
            <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
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
                    type="text"
                    placeholder="Ej. Juan Carlos Meza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol o cargo profesional</Label>
                <div className="relative">
                  <Select value={role} onValueChange={(val: UserRole) => setRole(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona tu rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accountant">Contador Principal</SelectItem>
                      <SelectItem value="assistant">Auxiliar de Contabilidad / Tesorería</SelectItem>
                      <SelectItem value="auditor">Revisor Fiscal / Auditor Financiero</SelectItem>
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
                    type="email"
                    placeholder="contador@miempresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="habeas-data"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                />
                <label htmlFor="habeas-data" className="text-xs text-muted-foreground leading-snug cursor-pointer select-none">
                  Autorizo el tratamiento de mis datos personales según la <strong>Ley 1581 de 2012</strong> (Habeas Data) y acepto la{' '}
                  <Link href="/privacidad" target="_blank" className="text-primary hover:underline font-medium">
                    Política de Privacidad
                  </Link>{' '}
                  y{' '}
                  <Link href="/terminos" target="_blank" className="text-primary hover:underline font-medium">
                    Términos de Servicio
                  </Link>.
                </label>
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
    </div>
  );
}
