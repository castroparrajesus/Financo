'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2, AlertTriangle, Building, Mail, Scale, Printer } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PrivacyPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/60 sticky top-0 z-20 bg-background/95 backdrop-blur-sm print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-bold tracking-tight">Financo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs h-8">
              <Printer className="h-3.5 w-3.5" />
              Imprimir / Guardar PDF
            </Button>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-4 py-10 print:py-4">
        {/* Header */}
        <div className="border-b border-border/60 pb-8 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
              Ley Estatutaria 1581 de 2012
            </Badge>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
              Decreto 1377 de 2013 / DUR 1074 de 2015
            </Badge>
            <Badge variant="secondary">Versión Ley1581-2026-v1</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Política de Tratamiento de Información y Protección de Datos Personales
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Régimen General de Habeas Data · Financo S.A.S. (Colombia) · Vigente para 2026
              </p>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 mb-8 text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Scale className="h-4 w-4" />
            <span>Marco Legal Regulatorio en la República de Colombia</span>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            La presente Política de Tratamiento de la Información (en adelante la &quot;Política&quot;) da cumplimiento estricto
            a lo dispuesto en el Artículo 15 de la Constitución Política de Colombia, la <strong>Ley Estatutaria 1581 de 2012</strong>,
            el <strong>Decreto Reglamentario 1377 de 2013</strong> (compilado en el Decreto Único Reglamentario 1074 de 2015),
            la <strong>Ley 1266 de 2008</strong> (Habeas Data Financiero) y las directrices vinculantes de la
            Delegatura para la Protección de Datos Personales de la <strong>Superintendencia de Industria y Comercio (SIC)</strong>.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Building className="h-5 w-5 text-primary" />
              1. Identificación del Responsable y Encargado del Tratamiento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border/60 bg-secondary/20 p-4 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-muted-foreground block text-xs">Razón Social:</span>
                <span className="font-medium text-foreground">Financo S.A.S.</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block text-xs">NIT:</span>
                <span className="font-medium text-foreground">901.842.193-4</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block text-xs">Domicilio Legal:</span>
                <span className="font-medium text-foreground">Bogotá D.C., República de Colombia</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block text-xs">Canal Oficial de Habeas Data y PQR:</span>
                <span className="font-medium text-primary">privacidad@financo.co</span>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Principios Rectores del Tratamiento</h2>
            <p className="text-muted-foreground">
              De conformidad con el artículo 4 de la Ley 1581 de 2012, Financo aplica de forma transversal los principios de:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground">
              <li className="rounded-lg border border-border/40 p-2.5 bg-background">
                <strong className="text-foreground">Principio de Legalidad:</strong> Tratamiento sujeto a la Constitución y la ley.
              </li>
              <li className="rounded-lg border border-border/40 p-2.5 bg-background">
                <strong className="text-foreground">Principio de Finalidad:</strong> Finalidad legítima informada previamente al titular.
              </li>
              <li className="rounded-lg border border-border/40 p-2.5 bg-background">
                <strong className="text-foreground">Principio de Libertad:</strong> Requiere consentimiento previo, expreso e informado.
              </li>
              <li className="rounded-lg border border-border/40 p-2.5 bg-background">
                <strong className="text-foreground">Principio de Seguridad:</strong> Medidas técnicas y organizativas de cifrado.
              </li>
              <li className="rounded-lg border border-border/40 p-2.5 bg-background">
                <strong className="text-foreground">Acceso y Circulación Restringida:</strong> Aislamiento estricto multi-inquilino.
              </li>
              <li className="rounded-lg border border-border/40 p-2.5 bg-background">
                <strong className="text-foreground">Confidencialidad:</strong> Reserva profesional y deber legal de secreto.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Categorías de Datos Tratados</h2>
            <p className="text-muted-foreground">
              Financo recolecta y almacena exclusivamente la información indispensable para la prestación del software de conciliación contable:
            </p>
            <div className="space-y-2">
              <div className="rounded-lg border border-border/60 p-3 bg-secondary/15">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wide">A. Datos del Usuario / Contador:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nombre completo, correo electrónico corporativo o personal, rol profesional en la organización, empresa vinculada, registro de consentimiento y contraseña privada cifrada.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3 bg-secondary/15">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wide">B. Información Contable y Financiera de Soporte:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registros contenidos en extractos bancarios y libros auxiliares de contabilidad en formatos Excel (XLSX, XLS) y CSV: fechas contables, números de NIT o cédula de terceros, conceptos, descripciones de movimientos, valores en pesos colombianos (COP), débitos y créditos.
                </p>
              </div>
            </div>

            {/* Prohibition Banner */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Exclusión Absoluta de Credenciales Bancarias y Datos Biométricos Sensibles:
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90">
                  Financo <strong>JAMÁS</strong> solicita, almacena, captura ni procesa contraseñas bancarias, números de clave secreta, pines transaccionales, tokens dinámicos ni códigos CVV/CVC de tarjetas. La operación de Financo se basa exclusivamente en la ingesta voluntaria de extractos y auxiliares generados previamente por el usuario.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Finalidad Específica del Tratamiento</h2>
            <p className="text-muted-foreground">
              Los datos personales y contables recolectados serán tratados con las siguientes finalidades unívocas:
            </p>
            <ul className="space-y-2 pl-4 list-disc text-muted-foreground text-xs sm:text-sm">
              <li>
                <strong className="text-foreground">Conciliación Contable Automatizada:</strong> Cotejo analítico algorítmico entre los movimientos reportados por entidades bancarias colombianas y los registros asentados en los auxiliares de contabilidad (Siigo, World Office, Confiable, Helisa, SAP, entre otros).
              </li>
              <li>
                <strong className="text-foreground">Emisión de Cédula Contable Oficial:</strong> Generación y exportación de la Cédula de Conciliación en PDF y Excel con desglose de partidas conciliatorias (depósitos en tránsito, cheques pendientes, notas débito y crédito).
              </li>
              <li>
                <strong className="text-foreground">Soporte de Auditoría y Revisoría Fiscal:</strong> Preservación de la trazabilidad y pistas de auditoría que demuestren ante revisores fiscales, socios y autoridades de control la debida diligencia en el cuadre bancario.
              </li>
              <li>
                <strong className="text-foreground">Cumplimiento Tributario:</strong> Facilitar al contador la preparación de la información exógena cambiaria y tributaria requerida por la Dirección de Impuestos y Aduanas Nacionales (DIAN).
              </li>
              <li>
                <strong className="text-foreground">Prohibición de Comercialización y Entrenamiento Externo:</strong> Financo se compromete formalmente a no comercializar, ceder, licenciar ni transferir las bases de datos contables a terceros, ni utilizarlas para entrenar modelos públicos de inteligencia artificial.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Derechos de los Titulares (Ley 1581 de 2012, Art. 8)</h2>
            <p className="text-muted-foreground">
              El Titular de los datos personales tiene los siguientes derechos de conformidad con el ordenamiento jurídico colombiano:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Conocer, actualizar y rectificar</strong> sus datos frente a Financo en su condición de Responsable o Encargado.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Solicitar prueba</strong> de la autorización otorgada a Financo para el tratamiento de su información.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Ser informado</strong> por Financo respecto del uso efectivo que se le ha dado a sus datos personales.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Presentar quejas ante la SIC</strong> (Superintendencia de Industria y Comercio) por infracciones a la ley.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Revocar la autorización</strong> o solicitar la supresión del dato cuando no medie deber legal o contractual de permanencia.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Acceder de forma gratuita</strong> a sus datos personales que hayan sido objeto de tratamiento.</span>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">6. Procedimiento para el Ejercicio de Derechos (Consultas y Reclamos)</h2>
            <p className="text-muted-foreground">
              Para radicar peticiones, consultas, quejas o reclamos (PQRS) relacionados con la protección de datos personales, el titular o sus causahabientes podrán utilizar los siguientes canales y términos legales:
            </p>
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-secondary/20">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Mail className="h-4 w-4" />
                <span>Canal Oficial: privacidad@financo.co</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong>A. Trámite de Consultas (Art. 14 Ley 1581):</strong> Serán atendidas en un término máximo de diez (10) días hábiles contados a partir de la fecha de recibo. Si no fuere posible resolver dentro de dicho término, se informará al interesado antes del vencimiento expresando los motivos de la demora y señalando la fecha en que se atenderá, la cual no podrá superar cinco (5) días hábiles siguientes al primer vencimiento.
                </p>
                <p>
                  <strong>B. Trámite de Reclamos (Art. 15 Ley 1581):</strong> Cuando el titular considere que la información debe ser corregida, actualizada o suprimida, formulará un reclamo dirigido a Financo. Si el reclamo resulta incompleto, se requerirá al interesado dentro de los cinco (5) días siguientes a la recepción para que subsane las fallas. El término máximo para atender el reclamo será de quince (15) días hábiles prorrogables por ocho (8) días hábiles adicionales.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">7. Seguridad Técnica, Aislamiento y Conservación</h2>
            <div className="space-y-2 text-muted-foreground text-xs sm:text-sm">
              <p>
                Financo implementa medidas de seguridad de estándar de la industria bancaria y contable:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cifrado de datos en tránsito mediante protocolos TLS 1.3 y en reposo mediante algoritmos AES-256.</li>
                <li>Políticas de seguridad a nivel de fila (Row Level Security - RLS) para garantizar el aislamiento multi-empresa.</li>
                <li>Comprobación criptográfica SHA-256 en la subida de extractos para prevenir duplicidad o manipulación de asientos.</li>
                <li>Conservación de la información de acuerdo con los plazos probatorios contemplados en el <strong>Artículo 60 del Código de Comercio</strong> y el <strong>Artículo 632 del Estatuto Tributario</strong> (conservación mínima de 5 años para papeles de comercio y soportes contables).</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">8. Modo Sin Conexión (PWA) y Memoria del Dispositivo</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              La funcionalidad Progressive Web App (PWA) permite almacenar temporalmente en el navegador local del usuario copias de consulta de cédulas contables previamente generadas. Dicho almacenamiento se encuentra restringido a la sesión local del usuario, no contiene contraseñas bancarias y puede ser purgado en cualquier momento desde el panel de <em>Ajustes &gt; Acceso Móvil y Memoria Local</em>.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground">9. Vigencia y Actualización</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              La presente Política rige a partir de su publicación en enero de 2026, con última revisión y actualización en octubre de 2026. Cualquier modificación sustancial en las finalidades del tratamiento será comunicada oportunamente a los titulares registrados a través del correo electrónico o notificación en la plataforma con una antelación mínima de diez (10) días hábiles.
            </p>
          </section>
        </div>

        {/* Footer Contact */}
        <div className="mt-12 rounded-xl border border-border/80 bg-secondary/40 p-5 text-center text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground">Financo S.A.S. — NIT 901.842.193-4</p>
          <p>Superintendencia de Industria y Comercio (SIC) · Delegatura para la Protección de Datos Personales</p>
          <p>Bogotá D.C., Colombia · Correo: <a href="mailto:privacidad@financo.co" className="text-primary hover:underline font-medium">privacidad@financo.co</a></p>
        </div>
      </article>
    </div>
  );
}
