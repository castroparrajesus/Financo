'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLAN_LIMITS } from '@/lib/types';
import { BrandLogo } from '@/components/brand-logo';

const features = [
  {
    icon: FileSpreadsheet,
    title: 'Carga multiformato',
    description: 'Sube extractos de cualquier banco colombiano. Detectamos encabezados, fechas y montos automáticamente.',
  },
  {
    icon: Zap,
    title: 'Cruce inteligente',
    description: 'Conciliación por NIT, cédula o referencia. Tolerancia de valor y sugerencias con coincidencia difusa.',
  },
  {
    icon: ShieldCheck,
    title: 'Revisión humana',
    description: 'Nunca afirmamos un cruce dudoso. Tú apruebas o rechazas cada sugerencia con un clic.',
  },
  {
    icon: TrendingUp,
    title: 'Reportes exportables',
    description: 'Descarga en Excel con hojas separadas: conciliados, excepciones y resumen ejecutivo.',
  },
  {
    icon: Lock,
    title: 'Cumplimiento Ley 1581',
    description: 'Cifrado en tránsito y reposo. Borrado automático de archivos. Registro de auditoría completo.',
  },
  {
    icon: Clock,
    title: 'Resultados en segundos',
    description: 'Procesa hasta 50.000 filas en menos de 30 segundos. Tu primera conciliación en 5 minutos.',
  },
];

const steps = [
  { num: '1', title: 'Sube tus archivos', description: 'Arrastra el extracto bancario y tu agenda de clientes.' },
  { num: '2', title: 'Configura el cruce', description: 'Selecciona columnas o usa un perfil de banco guardado.' },
  { num: '3', title: 'Revisa resultados', description: 'Aprueba sugerencias, comenta excepciones, ajusta manualmente.' },
  { num: '4', title: 'Exporta el reporte', description: 'Descarga Excel y PDF para compartir con tu cliente.' },
];

export default function LandingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="text-xl font-bold tracking-tight">Financo</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={() => router.push('/signup')}>
              Crear cuenta
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 animate-fade-in">
            <Sparkles className="mr-1 h-3 w-3" />
            Diseñado para contadores en Colombia
          </Badge>
          <h1 className="animate-slide-up text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Concilia tus pagos en{' '}
            <span className="text-primary">minutos</span>,
            no en horas
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Sube tu extracto bancario y tu agenda de clientes. Financo detecta
 automáticamente los cruces, identifica excepciones y te entrega un reporte listo para exportar.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => router.push('/signup')}>
              Comenzar gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
              Ver demostración
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sin tarjeta de crédito · Plan Esencial desde COP 120.000/mes
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
          Tu primera conciliación en 4 pasos
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <Card key={step.num} className="relative animate-slide-up border-border/60">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {step.num}
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          Todo lo que necesitas para conciliar
        </h2>
        <p className="mb-12 text-center text-lg text-muted-foreground">
          Una plataforma completa para contadores independientes y áreas de recaudo
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="animate-fade-in border-border/60 transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          Planes simples y transparentes
        </h2>
        <p className="mb-12 text-center text-lg text-muted-foreground">
          Precios en pesos colombianos. Cambia o cancela cuando quieras.
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          {(Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>).map((planKey) => {
            const plan = PLAN_LIMITS[planKey];
            const isPopular = planKey === 'profesional';
            return (
              <Card
                key={planKey}
                className={`relative animate-slide-up ${isPopular ? 'border-primary shadow-lg ring-1 ring-primary' : 'border-border/60'}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Más popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.label}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">COP {plan.price}</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Hasta {plan.companies} empresas cliente</span>
                  </div>
                  {planKey === 'firma' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Múltiples usuarios</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Conciliaciones ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Exportación a Excel y PDF</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Perfiles por banco</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Registro de auditoría</span>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => router.push('/signup')}
                  >
                    Elegir {plan.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-center gap-6 p-12 text-center">
            <h2 className="text-3xl font-bold">¿Listo para ahorrar horas de trabajo?</h2>
            <p className="max-w-2xl text-primary-foreground/80">
              Únete a los contadores que ya concilian sus pagos automáticamente con Financo.
            </p>
            <Button size="lg" variant="secondary" onClick={() => router.push('/signup')}>
              Crear cuenta gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-semibold">Financo</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacidad" className="hover:text-foreground transition-colors">
              Política de tratamiento de datos
            </Link>
            <Link href="/terminos" className="hover:text-foreground transition-colors">
              Términos y condiciones
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Financo. Hecho en Colombia.</p>
        </div>
      </footer>
    </div>
  );
}
