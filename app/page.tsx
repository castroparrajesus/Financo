'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  UserCheck,
  Download,
  ShieldCheck,
  Clock,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/supabase/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { startDemo } = useAuth();

  const handleDemo = () => {
    startDemo();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10 selection:text-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-xl font-bold tracking-tight text-foreground">Financo</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Iniciar sesión
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32 bg-gradient-mesh border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs sm:text-sm font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Diseñado para contadores en Colombia</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground mb-6">
              Concilia tus pagos en minutos, no en horas
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Sube tu extracto bancario y tu agenda de clientes. Financo detecta automáticamente los cruces,
              identifica excepciones y te entrega un reporte listo para exportar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button asChild size="lg" className="w-full sm:w-auto text-base px-8 h-12 shadow-md">
                <Link href="/signup">
                  Comenzar gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleDemo}
                className="w-full sm:w-auto text-base px-8 h-12 border-border/80 hover:bg-muted"
              >
                Ver demostración
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Sin tarjeta de crédito · Plan Esencial desde COP 120.000/mes
            </p>
          </div>
        </section>

        {/* 4 Steps Section */}
        <section className="py-20 bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                Tu primera conciliación en 4 pasos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Sube tus archivos</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Arrastra el extracto bancario y tu agenda de clientes.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Configura el cruce</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Selecciona columnas o usa un perfil de banco guardado.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Revisa resultados</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Aprueba sugerencias, comenta excepciones, ajusta manualmente.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-4">
                  4
                </div>
                <h3 className="text-lg font-semibold mb-2">Exporta el reporte</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Descarga Excel y PDF para compartir con tu cliente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                Todo lo que necesitas para conciliar
              </h2>
              <p className="text-lg text-muted-foreground">
                Una plataforma completa para contadores independientes y áreas de recaudo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Carga multiformato</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sube extractos de cualquier banco colombiano. Detectamos encabezados, fechas y montos automáticamente.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Cruce inteligente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Conciliación por NIT, cédula o referencia. Tolerancia de valor y sugerencias con coincidencia difusa.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Revisión humana</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nunca afirmamos un cruce dudoso. Tú apruebas o rechazas cada sugerencia con un clic.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Download className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Reportes exportables</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Descarga en Excel con hojas separadas: conciliados, excepciones y resumen ejecutivo.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Cumplimiento Ley 1581</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cifrado en tránsito y reposo. Borrado automático de archivos. Registro de auditoría completo.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Clock className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Resultados en segundos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Procesa hasta 50.000 filas en menos de 30 segundos. Tu primera conciliación en 5 minutos.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                Planes simples y transparentes
              </h2>
              <p className="text-lg text-muted-foreground">
                Precios en pesos colombianos. Cambia o cancela cuando quieras.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* Plan Esencial */}
              <Card className="border bg-card flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Esencial</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-foreground">COP 120.000</span>
                      <span className="text-muted-foreground text-sm">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Hasta 5 empresas cliente</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Conciliaciones ilimitadas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Exportación a Excel y PDF</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Perfiles por banco</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Registro de auditoría</span>
                      </li>
                    </ul>
                  </CardContent>
                </div>
                <div className="p-6 pt-0">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signup?plan=esencial">Elegir Esencial</Link>
                  </Button>
                </div>
              </Card>

              {/* Plan Profesional (Featured) */}
              <Card className="border-2 border-primary bg-card relative shadow-lg flex flex-col justify-between">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1">
                    Más popular
                  </Badge>
                </div>
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Profesional</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-foreground">COP 250.000</span>
                      <span className="text-muted-foreground text-sm">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Hasta 20 empresas cliente</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Conciliaciones ilimitadas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Exportación a Excel y PDF</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Perfiles por banco</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Registro de auditoría</span>
                      </li>
                    </ul>
                  </CardContent>
                </div>
                <div className="p-6 pt-0">
                  <Button asChild className="w-full">
                    <Link href="/signup?plan=profesional">Elegir Profesional</Link>
                  </Button>
                </div>
              </Card>

              {/* Plan Firma */}
              <Card className="border bg-card flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Firma</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-foreground">COP 600.000</span>
                      <span className="text-muted-foreground text-sm">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Hasta 60 empresas cliente</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Múltiples usuarios</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Conciliaciones ilimitadas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Exportación a Excel y PDF</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Perfiles por banco</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Registro de auditoría</span>
                      </li>
                    </ul>
                  </CardContent>
                </div>
                <div className="p-6 pt-0">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signup?plan=firma">Elegir Firma</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
              ¿Listo para ahorrar horas de trabajo?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Únete a los contadores que ya concilian sus pagos automáticamente con Financo.
            </p>
            <Button asChild size="lg" className="px-8 h-12 text-base shadow-md">
              <Link href="/signup">Crear cuenta gratis</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-12 text-muted-foreground text-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" priority={false} />
              <div>
                <span className="font-bold text-base text-foreground">Financo</span>
                <p className="text-xs text-muted-foreground">Conciliación Contable y Bancaria Automatizada</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm">
              <Link
                href="/politica-de-tratamiento-de-datos"
                className="hover:text-foreground transition-colors"
              >
                Política de Tratamiento de Datos (Ley 1581)
              </Link>
              <Link href="/terminos" className="hover:text-foreground transition-colors">
                Términos del Servicio
              </Link>
              <Link href="/privacidad" className="hover:text-foreground transition-colors">
                Canal PQR / Habeas Data
              </Link>
            </div>
          </div>

          <div className="pt-8 text-center text-xs space-y-2 text-muted-foreground">
            <p>© 2026 Financo S.A.S. · NIT 901.842.193-4 · Bogotá D.C., Colombia.</p>
            <p>Conforme al Régimen General de Protección de Datos Personales (Ley 1581 de 2012 / SIC).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
