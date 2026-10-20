import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-bold">Financo</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">Última actualización: 6 de octubre de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Aceptación</h2>
            <p className="mt-2 text-muted-foreground">
              Al registrarse y utilizar Financo, usted acepta estos términos y condiciones en su totalidad.
              Si no está de acuerdo, no debe utilizar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descripción del servicio</h2>
            <p className="mt-2 text-muted-foreground">
              Financo es una plataforma de conciliación automatizada de pagos que permite a contadores cruzar
              extractos bancarios con agendas de clientes, identificar excepciones y exportar reportes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Revisiones humanas</h2>
            <p className="mt-2 text-muted-foreground">
              Financo proporciona sugerencias automatizadas que requieren revisión humana. El sistema nunca
              afirma un cruce dudoso como definitivo. El usuario es responsable de aprobar o rechazar cada
              sugerencia antes de generar reportes finales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Planes y facturación</h2>
            <p className="mt-2 text-muted-foreground">
              Los planes disponibles son: Esencial (COP 120.000/mes, 5 empresas), Profesional (COP 250.000/mes,
              20 empresas) y Firma (COP 600.000/mes, 60 empresas). Estos valores son informativos: el cobro,
              la administración de suscripciones y la cancelación en línea no están habilitados en la versión actual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Uso aceptable</h2>
            <p className="mt-2 text-muted-foreground">
              El usuario se compromete a utilizar el servicio conforme a la ley colombiana, incluyendo la Ley 1581
              de 2012 sobre protección de datos personales. No debe subir información que no tenga autorización
              para procesar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Limitación de responsabilidad</h2>
            <p className="mt-2 text-muted-foreground">
              Financo no se hace responsable por decisiones financieras tomadas con base en los reportes
              generados. La herramienta es de asistencia y la responsabilidad final recae en el contador o
              empresa usuaria.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Modificaciones</h2>
            <p className="mt-2 text-muted-foreground">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios se
              notificarán a través de la plataforma y por correo electrónico.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
