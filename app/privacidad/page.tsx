import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';
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
        <p className="mb-6 text-sm text-muted-foreground">
          En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia.
          <br />
          Última actualización: 20 de octubre de 2026.
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Responsable del Tratamiento</h2>
            <p className="mt-2 text-muted-foreground">
              Financo actúa como Encargado y Responsable del tratamiento de la información personal y contable suministrada
              por sus usuarios y empresas clientes, adoptando las medidas técnicas, humanas y administrativas necesarias
              para otorgar seguridad a los registros y evitar su adulteración, pérdida, consulta, uso o acceso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Datos Tratados y Finalidad Estricta</h2>
            <p className="mt-2 text-muted-foreground">
              Se recopilan nombres de usuarios, correos electrónicos, roles profesionales, así como la información estrictamente
              necesaria contenida en los extractos bancarios y auxiliares contables (fechas, NITs de terceros, conceptos,
              saldos y valores transaccionales).
            </p>
            <div className="mt-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Finalidad Exclusiva:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Ejecución del cruce y conciliación automatizada entre extracto bancario y auxiliares de contabilidad.</li>
                <li>Generación de la Cédula Contable oficial, reportes en PDF y exportaciones para auditoría.</li>
                <li><strong>Prohibición Expresa:</strong> La plataforma nunca comercializa, arrienda, cede ni utiliza la información financiera o de terceros para entrenar modelos externos de inteligencia artificial.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Confidencialidad y Aislamiento de Información</h2>
            <p className="mt-2 text-muted-foreground">
              Se garantiza el estricto aislamiento entre organizaciones (Multi-tenant) mediante control de acceso por roles
              (RBAC) y políticas de seguridad a nivel de fila (RLS). Ningún usuario ni cliente puede acceder a la información,
              extractos o cédulas contables pertenecientes a otra empresa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Integridad de los Datos y Control Anti-Duplicados</h2>
            <p className="mt-2 text-muted-foreground">
              Cada archivo cargado es validado mediante algoritmos de comprobación de integridad criptográfica (SHA-256)
              para garantizar que ninguna carga interrumpida o reanudada genere duplicación de registros contables ni alteración
              de saldos de apertura y cierre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Procedimiento ante Incidentes de Seguridad</h2>
            <p className="mt-2 text-muted-foreground">
              Financo cuenta con un protocolo técnico de respuesta ante incidentes (detección, contención, evaluación y recuperación).
              En caso de detectarse cualquier vulneración de seguridad que comprometa datos personales o información bancaria,
              se notificará oportunamente a las partes afectadas y a la Delegatura para la Protección de Datos Personales
              de la Superintendencia de Industria y Comercio (SIC) conforme a la normatividad vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Derechos del Titular (Habeas Data)</h2>
            <p className="mt-2 text-muted-foreground">
              Los titulares tienen derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos personales
              en cualquier momento, así como revocar la autorización otorgada para su tratamiento.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Canal de atención para PQRS y Habeas Data: <strong>privacidad@financo.co</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Tiempo de Conservación</h2>
            <p className="mt-2 text-muted-foreground">
              Los datos se conservarán durante el tiempo que dure la relación contractual y el periodo requerido por el
              Código de Comercio y Estatuto Tributario colombiano para efectos probatorios contables y fiscales.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
