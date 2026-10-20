import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function PrivacyPage() {
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
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Política de Tratamiento de Datos Personales</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">Última actualización: 6 de octubre de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Responsable del tratamiento</h2>
            <p className="mt-2 text-muted-foreground">
              Financo es responsable del tratamiento de datos personales de conformidad con la Ley 1581 de 2012
              y el Decreto 1377 de 2013 de Colombia. Los datos se utilizan exclusivamente para prestar el servicio
              de conciliación automatizada de pagos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Datos tratados</h2>
            <p className="mt-2 text-muted-foreground">
              Tratamos los siguientes datos: nombre, correo electrónico, y la información contenida en los
              archivos que sube para conciliación (extractos bancarios y agendas de clientes). Esta información
              incluye identificadores como NIT, cédulas, nombres de empresas y valores transaccionales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Finalidad del tratamiento</h2>
            <p className="mt-2 text-muted-foreground">
              Los datos se utilizan únicamente para: (i) cruzar movimientos entre extractos bancarios y agendas de
              clientes, (ii) generar reportes de conciliación, (iii) mantener un registro de auditoría, y (iv) mejorar
              la precisión del motor de conciliación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Cifrado y seguridad</h2>
            <p className="mt-2 text-muted-foreground">
              La aplicación usa Supabase Auth y políticas de seguridad a nivel de fila para separar los datos de
              las cuentas. El cifrado en tránsito y en reposo depende de la configuración y garantías del proveedor
              de despliegue. Antes de habilitar el servicio para datos reales, el responsable debe verificar los
              controles, contratos y medidas de seguridad aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Borrado automático</h2>
            <p className="mt-2 text-muted-foreground">
              En la versión actual los archivos se procesan en el navegador y no se guardan como archivos originales
              en almacenamiento remoto. Para cuentas registradas se persiste metadata y hasta 100 filas de datos
              procesados por archivo, además de los resultados de conciliación. El borrado automático configurable
              todavía no está implementado; no se debe asumir un plazo de eliminación de 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Derechos del titular</h2>
            <p className="mt-2 text-muted-foreground">
              Como titular de los datos, tiene derecho a: acceder, conocer, actualizar, rectificar y suprimir
              sus datos personales. Para ejercer estos derechos, contacte a protecciondatos@financo.co.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Autorización</h2>
            <p className="mt-2 text-muted-foreground">
              Al registrarse y utilizar Financo, usted autoriza el tratamiento de sus datos personales conforme
              a esta política. Esta autorización es revocable en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Contacto</h2>
            <p className="mt-2 text-muted-foreground">
              Para cualquier inquietud sobre el tratamiento de datos: protecciondatos@financo.co
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
