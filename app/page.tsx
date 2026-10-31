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
  KeyRound,
  Users,
  Hash,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  Lock,
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
    router.push('/dashboard/nueva?demo=true');
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDemo}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
            >
              Probar demo
            </Button>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Iniciar sesión
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Acceso a la beta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28 bg-gradient-mesh border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs sm:text-sm font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Programa Beta Contable · Acceso gratuito para Colombia</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Conciliación bancaria automatizada en tu navegador, para contadores en Colombia
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Carga extractos de Bancolombia, Davivienda o Banco de Bogotá y tu libro auxiliar. Financo procesa localmente con SheetJS, verifica integridad SHA-256 y exporta hojas de trabajo en Excel y PDF.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button asChild size="lg" className="w-full sm:w-auto text-base px-8 h-12 shadow-sm">
                <Link href="/signup">
                  Solicitar acceso a la beta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleDemo}
                className="w-full sm:w-auto text-base px-8 h-12 border-border/80 hover:bg-muted"
              >
                Probar Demo sin registro
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Procesamiento local-first · Sin tarjeta de crédito · Sin checkout
            </p>
          </div>
        </section>

        {/* Verifiable Badges Section */}
        <section className="py-8 bg-muted/40 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-lg border bg-card text-card-foreground">
                <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Detección de cabeceras</p>
                  <p className="text-xs text-muted-foreground">Bancolombia, Davivienda, Bogotá</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-lg border bg-card text-card-foreground">
                <Hash className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Integridad SHA-256</p>
                  <p className="text-xs text-muted-foreground">Huella digital Web Crypto API</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-lg border bg-card text-card-foreground">
                <KeyRound className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Autenticación TOTP</p>
                  <p className="text-xs text-muted-foreground">Factor principal y de respaldo</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-lg border bg-card text-card-foreground">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Roles por empresa</p>
                  <p className="text-xs text-muted-foreground">Owner, admin, editor, viewer (RLS)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Steps Section */}
        <section className="py-16 sm:py-20 bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Tu primera conciliación en 4 pasos
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Flujo directo y sin fricción técnica, diseñado para el día a día contable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm mb-4">
                  1
                </div>
                <h3 className="text-base font-semibold mb-2">Sube tus archivos</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Arrastra el extracto bancario y el libro auxiliar en formato Excel (.xlsx) o CSV.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm mb-4">
                  2
                </div>
                <h3 className="text-base font-semibold mb-2">Configura el cruce</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ajusta columnas de fecha, valor y descripción, o usa perfiles detectados automáticamente.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm mb-4">
                  3
                </div>
                <h3 className="text-base font-semibold mb-2">Revisa resultados</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Aprueba sugerencias automáticas, revisa discrepancias y documenta excepciones.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative flex flex-col items-start p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm mb-4">
                  4
                </div>
                <h3 className="text-base font-semibold mb-2">Exporta la hoja de trabajo</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Descarga reportes detallados en Excel (.xlsx) y resumen ejecutivo en PDF para tus papeles de trabajo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section: Local-first with Total Transparency */}
        <section className="py-16 sm:py-20 bg-muted/20 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-3 text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary">
                Transparencia de datos
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Privacidad: Local-first, con transparencia total
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
                Sabemos la sensibilidad de la información financiera de tus clientes. Por eso explicamos exactamente qué ocurre con tus datos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Zap className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">Tus archivos no se suben al servidor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    El procesamiento y cruce de datos corre 100% en tu navegador con SheetJS. Los extractos y libros auxiliares nunca viajan al backend para ser procesados.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Hash className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">Verificación de integridad SHA-256</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Calculamos el hash SHA-256 del archivo en tu equipo usando Web Crypto API. Esto genera una huella criptográfica inalterable para validar que el archivo procesado no fue modificado.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">Datos persistidos en base de datos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Solo almacenamos metadatos de conciliación, resumen de montos conciliados y una muestra de hasta 100 filas para auditoría en Supabase. El resto de las miles de filas permanece en la memoria de tu navegador.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-muted/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Info className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">Lo que NO afirmamos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No prometemos &quot;cumplimiento Ley 1581 pleno&quot; sin una auditoría formal externa, ni &quot;cifrado en reposo&quot; de archivos completos que nuestra arquitectura deliberadamente nunca almacena.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Security Section: Financial Data Protection */}
        <section className="py-16 sm:py-20 bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-3 text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary">
                Capa de Seguridad
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Seguridad: Protección de datos financieros
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
                Mecanismos de autenticación y autorización técnica implementados a nivel de motor de base de datos y sesión.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">Autenticación de dos factores (TOTP)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Protege tu cuenta con Google Authenticator o cualquier app TOTP estándar, con soporte para enrolar un segundo factor de respaldo verificado.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-xl border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">Control de acceso basado en roles (RBAC)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Asigna roles independientes por cada empresa cliente: owner, admin, editor o viewer, garantizando que cada colaborador tenga exclusivamente los permisos necesarios.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-xl border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">Políticas RLS en PostgreSQL</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cada consulta en la base de datos valida automáticamente la membresía en la empresa y el nivel de aseguramiento de autenticación (AAL2) mediante Row Level Security.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-xl border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">Step-up MFA para acciones sensibles</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Las acciones sensibles (como exportar reportes de conciliación con datos de clientes) exigen verificación de segundo factor si está configurado en tu cuenta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features: Only What Actually Exists */}
        <section className="py-16 sm:py-20 bg-muted/20 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Funcionalidades: solo lo que existe
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Una herramienta honesta para contadores: sin funciones infladas ni promesas de módulos inexistentes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Formatos bancarios soportados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Detección automática de encabezados y columnas para extractos de Bancolombia, Davivienda y Banco de Bogotá.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Motor de cruce y tolerancias</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Coincidencia exacta y con tolerancia de valor configurable por el usuario, con sugerencias claras para revisión humana.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Hash className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Integridad criptográfica de datos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Hash SHA-256 calculado localmente para cada archivo cargado y registrado en la sesión de conciliación.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Download className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Exportación en Excel y PDF</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Hojas de trabajo completas en Excel (.xlsx) con pestañas separadas (Conciliados, Excepciones, Resumen) y reportes ejecutivos en PDF.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Auditoría básica y notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Registro de conciliaciones realizadas, estados de revisión aprobados o descartados y notas de justificación por partida.
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Users className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Multiusuario por empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Múltiples miembros por empresa con aislamiento estricto de datos verificado entre cuentas.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Beta Plan Section: Transparent, No-Checkout */}
        <section className="py-16 sm:py-20 bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-10">
              <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1 mb-3">
                Acceso gratuito
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Planes: Programa Beta Contable — Acceso gratuito
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                Estamos construyendo la mejor herramienta de conciliación para Colombia junto con contadores reales.
              </p>
            </div>

            <Card className="border-2 border-primary/40 bg-card shadow-sm p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Beta Abierta para Contadores</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-foreground">COP 0</span>
                    <span className="text-sm text-muted-foreground">/mes durante la fase beta</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Durante la fase beta, Financo es completamente gratuito para contadores y firmas contables en Colombia. Sin cobros ocultos ni pasarelas de pago activas.
                  </p>
                  <Button asChild size="lg" className="w-full sm:w-auto px-8">
                    <Link href="/signup">
                      Unirse a la Beta Gratuita
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-3.5 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-8 text-sm">
                  <div className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground font-medium">Hasta 5 empresas cliente</strong>
                      <p className="text-xs text-muted-foreground">Crea y administra empresas de forma aislada.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground font-medium">Conciliaciones ilimitadas</strong>
                      <p className="text-xs text-muted-foreground">Sin límite de extractos ni filas procesadas localmente.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground font-medium">Todos los formatos bancarios</strong>
                      <p className="text-xs text-muted-foreground">Bancolombia, Davivienda, Banco de Bogotá y genéricos.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground font-medium">Feedback directo</strong>
                      <p className="text-xs text-muted-foreground">Tu criterio profesional define las prioridades de desarrollo.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              ¿Listo para simplificar tus conciliaciones?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-8">
              Prueba la demostración interactiva en tu navegador o regístrate en la beta gratuita.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="px-8 h-12 text-base shadow-sm">
                <Link href="/signup">Solicitar acceso a la beta</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleDemo}
                className="px-8 h-12 text-base"
              >
                Probar Demo sin registro
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Truthful Footer */}
      <footer className="border-t bg-card py-10 text-muted-foreground text-xs sm:text-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" priority={false} />
              <div>
                <span className="font-bold text-sm text-foreground">Financo</span>
                <p className="text-xs text-muted-foreground">Conciliación bancaria y contable automatizada</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
              <Link href="/privacidad" className="hover:text-foreground transition-colors">
                Política de Privacidad
              </Link>
              <Link href="/terminos" className="hover:text-foreground transition-colors">
                Términos del Servicio
              </Link>
              <button
                onClick={handleDemo}
                className="hover:text-foreground transition-colors text-xs"
              >
                Entorno Demo
              </button>
            </div>
          </div>

          <div className="pt-6 text-center text-xs space-y-1.5 text-muted-foreground">
            <p>Financo — Herramienta de conciliación bancaria y contable para contadores en Colombia.</p>
            <p className="text-[11px] text-muted-foreground/80">
              Arquitectura local-first con procesamiento en cliente. Los extractos y archivos originales no se persisten en servidores de Financo.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
