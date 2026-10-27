'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User,
  Shield,
  CreditCard,
  Building2,
  Clock,
  Check,
  Lock,
  KeyRound,
  MessageSquarePlus,
  Download,
  Smartphone,
  HardDrive,
  ShieldCheck,
  Trash2,
  Scale,
  FileCheck,
  ExternalLink,
  History,
  Activity,
  Sliders,
  Settings,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { getStoredFeedbacks } from '@/components/feedback-modal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PLAN_LIMITS, Plan } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { PWAInstallButton } from '@/components/pwa/pwa-install-button';
import { OfflineCedulasDialog } from '@/components/pwa/offline-cedulas-dialog';
import { OfflinePolicyDialog } from '@/components/pwa/offline-policy-dialog';
import { getOfflineStorageMetrics, clearAllOfflineCache } from '@/lib/offline/storage';

export default function SettingsPage() {
  const { user, profile, refreshProfile, changePassword, isDemo } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [professionalId, setProfessionalId] = useState('T.P. 248193-T');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [auditLog, setAuditLog] = useState<{ id: string; action: string; entity_type: string | null; created_at: string }[]>([]);
  const [showOfflineCedulas, setShowOfflineCedulas] = useState(false);
  const [showOfflinePolicy, setShowOfflinePolicy] = useState(false);
  const [offlineMetrics, setOfflineMetrics] = useState({ count: 0, estimatedKb: 0 });

  const refreshOfflineMetrics = () => {
    getOfflineStorageMetrics().then(setOfflineMetrics).catch(() => {});
  };

  useEffect(() => {
    setFullName(profile?.full_name || 'Contador Principal Financo');
    setFeedbackCount(getStoredFeedbacks().length);
    refreshOfflineMetrics();

    if (isDemo) {
      setAuditLog([
        { id: 'demo-audit-1', action: 'reconcile', entity_type: 'reconciliation', created_at: '2026-01-31T18:30:00.000Z' },
        { id: 'demo-audit-2', action: 'export', entity_type: 'cedula_pdf', created_at: '2026-02-05T10:15:00.000Z' },
        { id: 'demo-audit-3', action: 'upload', entity_type: 'bank_statement', created_at: '2026-01-31T17:45:00.000Z' },
        { id: 'demo-audit-4', action: 'modify', entity_type: 'match_approved', created_at: '2026-01-31T18:05:00.000Z' },
        { id: 'demo-audit-5', action: 'login', entity_type: 'session', created_at: '2026-01-31T16:20:00.000Z' },
      ]);
      return;
    }

    async function loadAudit() {
      const { data } = await supabase
        .from('audit_log')
        .select('id, action, entity_type, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setAuditLog(data);
    }
    loadAudit();
  }, [profile, isDemo]);

  const handleSaveProfile = async () => {
    if (isDemo) {
      toast.success('Perfil actualizado correctamente (modo demostración)');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user!.id);
    setSaving(false);
    if (error) {
      toast.error('Error al guardar cambios');
    } else {
      toast.success('Perfil profesional actualizado');
      refreshProfile();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setChangingPass(true);
    const { error } = await changePassword(newPassword);
    setChangingPass(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Contraseña actualizada con éxito');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleExportFeedbacks = () => {
    const list = getStoredFeedbacks();
    if (list.length === 0) {
      toast.info('Aún no hay retroalimentaciones registradas.');
      return;
    }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retroalimentaciones-evaluadores-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo de retroalimentaciones descargado con éxito');
  };

  const handleClearCache = async () => {
    try {
      await clearAllOfflineCache();
      refreshOfflineMetrics();
      toast.success('Caché local offline vaciada exitosamente');
    } catch {
      toast.error('No se pudo limpiar la caché local');
    }
  };

  const handleDownloadConsentCertificate = () => {
    const certDate = profile?.data_consent_at
      ? new Date(profile.data_consent_at).toLocaleString('es-CO')
      : new Date().toLocaleString('es-CO');
    const certificateText = `================================================================================
FINANCO S.A.S. - NIT 901.842.193-4 · BOGOTÁ D.C., COLOMBIA
CERTIFICADO DE AUTORIZACIÓN Y CONSENTIMIENTO INFORMADO DE DATOS PERSONALES
RÉGIMEN GENERAL DE HABEAS DATA - LEY ESTATUTARIA 1581 DE 2012 / DECRETO 1377 DE 2013
================================================================================

1. IDENTIFICACIÓN DEL TITULAR DE LA INFORMACIÓN:
   - Nombre Completo: ${fullName || profile?.full_name || 'Usuario Financo'}
   - Correo Electrónico: ${profile?.email || user?.email || 'N/A'}
   - Rol Profesional: Contador Público / Revisoría Fiscal
   - Identificador de Cuenta: ${profile?.id || user?.id || 'demo-user-id'}

2. CONSTANCIA DE AUTORIZACIÓN:
   El Titular otorgó formalmente su autorización PREVIA, EXPRESA E INFORMADA a Financo S.A.S.
   para el tratamiento de sus datos personales y la información contable/financiera
   relacionada con sus conciliaciones bancarias.

3. EVIDENCIA TÉCNICA DEL CONSENTIMIENTO:
   - Estado de Autorización: VÁLIDA Y ACTIVA
   - Fecha y Hora de Registro: ${certDate}
   - Versión de Política Aceptada: ${profile?.data_consent_version || 'Ley1581-2026-v1.2'}
   - Canal de Registro: Web Secure SSL / TLS 1.3
   - Agente de Navegación: Plataforma Web Financo

4. FINALIDADES ESPECÍFICAS AUTORIZADAS:
   a) Conciliación automática entre extractos bancarios y auxiliares contables.
   b) Emisión y custodia de la Cédula Contable oficial y papeles de auditoría NIIF / NIC 7.
   c) Soporte probatorio contable conforme al Art. 60 del Código de Comercio y Art. 632 del E.T.
   d) EXCLUSIÓN EXPRESA: Financo jamás almacena claves bancarias ni comercializa datos con terceros.

5. EJERCICIO DE DERECHOS ARCO (Habeas Data):
   El titular puede conocer, actualizar, rectificar y suprimir sus datos en cualquier momento
   mediante solicitud dirigida al canal oficial: privacidad@financo.co.

Bogotá D.C., República de Colombia.
Superintendencia de Industria y Comercio (SIC).
================================================================================`;

    const blob = new Blob([certificateText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificado-Habeas-Data-${(fullName || 'usuario').replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Certificado de consentimiento descargado con éxito');
  };

  const actionLabels: Record<string, { label: string; badge: string }> = {
    reconcile: { label: 'Conciliación NIIF Ejecutada', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
    upload: { label: 'Carga de Archivo Validada (SHA-256)', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    export: { label: 'Exportación de Cédula PDF / Excel', badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' },
    modify: { label: 'Revisión y Aprobación de Partida', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    delete: { label: 'Eliminación de Registro', badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30' },
    login: { label: 'Inicio de Sesión Seguro', badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30' },
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header institucional de Ajustes */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Ajustes del Sistema</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Ajustes y Parámetros</h1>
              <p className="text-xs text-muted-foreground">
                Configuración de perfil profesional, seguridad, Habeas Data Ley 1581, PWA offline y planes COP
              </p>
            </div>
          </div>
        </div>

        {isDemo && (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1.5 text-xs py-1 px-3 self-start sm:self-auto">
            <Sparkles className="h-3.5 w-3.5" />
            Entorno Demostrativo Activo
          </Badge>
        )}
      </div>

      {/* 2. Navegación por pestañas organizada y limpia */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/60 rounded-xl gap-1">
          <TabsTrigger value="profile" className="text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <User className="mr-1.5 h-3.5 w-3.5" />
            Perfil & Firma
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Scale className="mr-1.5 h-3.5 w-3.5" />
            Ley 1581
          </TabsTrigger>
          <TabsTrigger value="pwa" className="text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Smartphone className="mr-1.5 h-3.5 w-3.5" />
            PWA Offline
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Planes COP
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <History className="mr-1.5 h-3.5 w-3.5" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- */}
        {/* PESTAÑA 1: PERFIL PROFESIONAL Y FIRMA CONTABLE       */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Datos del Contador y Firma de Cédula NIIF
              </CardTitle>
              <CardDescription className="text-xs">
                Esta información se utiliza para certificar los reportes PDF y exportaciones oficiales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname" className="text-xs font-semibold">
                    Nombre Completo del Contador / Auditor *
                  </Label>
                  <Input
                    id="fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Lic. Carlos Andrés Restrepo"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="proId" className="text-xs font-semibold">
                    Tarjeta Profesional (T.P. No.)
                  </Label>
                  <Input
                    id="proId"
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                    placeholder="Ej: T.P. 248193-T"
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Correo Electrónico Registrado</Label>
                  <Input
                    value={user?.email || 'contador@financo.co'}
                    disabled
                    className="text-xs h-9 bg-muted/40 font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Canal seguro para notificaciones de cierre y avisos de auditoría.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Rol del Sistema</Label>
                  <div className="flex items-center h-9 px-3 rounded-md border border-border/80 bg-muted/20 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary mr-2" />
                    <span>Contador Certificador NIIF / Administrador</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="gap-2">
                  <Check className="h-4 w-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar Datos Profesionales'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* PESTAÑA 2: SEGURIDAD Y ACCESO PRIVADO               */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="security" className="space-y-6 mt-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Actualizar Contraseña de Acceso Privado
              </CardTitle>
              <CardDescription className="text-xs">
                Financo maneja autenticación cifrada sin contraseñas compartidas ni expuestas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-semibold">
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold">
                    Confirmar Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repite la nueva clave"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={changingPass} size="sm" className="gap-2">
                  <Lock className="h-4 w-4" />
                  <span>{changingPass ? 'Actualizando clave...' : 'Actualizar Contraseña'}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                Estándares de Seguridad Activos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-foreground">Cifrado en Tránsito y Reposo (AES-256 / SSL TLS 1.3)</p>
                    <p className="text-[11px] text-muted-foreground">Tus extractos y libros nunca viajan sin cifrado robusto.</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5 text-[10px]">
                  Activo
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/10">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-semibold text-foreground">Depuración Automática de Archivos Temporales</p>
                    <p className="text-[11px] text-muted-foreground">Los archivos planos temporales se depuran tras procesar el cruce.</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  30 Días
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* PESTAÑA 3: CUMPLIMIENTO LEY 1581 (HABEAS DATA)       */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="compliance" className="space-y-6 mt-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    Tratamiento de Datos Personales (Ley 1581 de 2012 / SIC)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Certificación de consentimiento informado y cumplimiento de la Superintendencia de Industria y Comercio
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10 text-xs py-0.5">
                  <ShieldCheck className="h-3 w-3 mr-1 inline" />
                  Autorización Vigente
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground block font-medium">Versión de Política</span>
                  <span className="font-bold text-foreground font-mono">Ley1581-2026-v1.2</span>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground block font-medium">Estado Legal SIC</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Previa, Expresa e Informada</span>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground block font-medium">Canal Derechos ARCO</span>
                  <span className="font-bold text-foreground font-mono">privacidad@financo.co</span>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs">
                <p className="font-semibold text-foreground">Finalidades Contables Autorizadas en Financo S.A.S.:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px]">
                  <li>Cruce automatizado y estructuración de la Cédula Contable bajo NIIF para las Pymes / NIC 7.</li>
                  <li>Generación de papeles de trabajo de auditoría para archivo probatorio (Art. 60 Código de Comercio).</li>
                  <li>Exportación de comprobantes de ajuste para Siigo Nube y World Office.</li>
                  <li className="font-semibold text-foreground">Exclusión estricta: Financo jamás solicita claves transaccionales ni comparte datos con terceros.</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-muted-foreground">
                  Emitido por Financo S.A.S. · NIT 901.842.193-4 · Bogotá D.C.
                </div>
                <Button onClick={handleDownloadConsentCertificate} size="sm" className="gap-2">
                  <FileCheck className="h-4 w-4" />
                  <span>Descargar Certificado Oficial (.txt)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* PESTAÑA 4: PWA Y CONSULTA OFFLINE EN MOVILIDAD      */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="pwa" className="space-y-6 mt-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Aplicación Web Progresiva (PWA) y Operación Offline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Instala Financo en tu computador o celular y consulta cédulas de auditoría sin conexión a internet
                  </CardDescription>
                </div>
                <PWAInstallButton />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/80 p-4 space-y-2 bg-muted/10 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <HardDrive className="h-4 w-4 text-primary" />
                      Almacenamiento Local (IndexedDB)
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {offlineMetrics.estimatedKb} KB usados
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {offlineMetrics.count} conciliaciones guardadas para consulta sin señal o en desplazamientos.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOfflineCedulas(true)}
                      className="text-xs h-8"
                    >
                      Ver Cédulas Guardadas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCache}
                      className="text-xs h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Vaciar Caché
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 p-4 space-y-2 bg-muted/10 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Política de Cifrado Local
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Las copias locales de tus cédulas se almacenan únicamente en el navegador de este dispositivo y se protegen bajo sandbox de seguridad.
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowOfflinePolicy(true)}
                      className="p-0 h-auto text-xs text-primary font-medium"
                    >
                      Consultar política de retención local →
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <OfflineCedulasDialog open={showOfflineCedulas} onOpenChange={setShowOfflineCedulas} />
          <OfflinePolicyDialog open={showOfflinePolicy} onOpenChange={setShowOfflinePolicy} />
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* PESTAÑA 5: PLANES Y FACTURACIÓN EN PESOS (COP)      */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="plans" className="space-y-6 mt-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Planes en Pesos Colombianos (COP)
              </CardTitle>
              <CardDescription className="text-xs">
                Sin tarjeta de crédito obligatoria para comenzar · Cambia o cancela cuando quieras
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {(Object.keys(PLAN_LIMITS) as Plan[]).map((p) => {
                  const plan = PLAN_LIMITS[p];
                  const isCurrent = (profile?.plan || 'esencial') === p;

                  return (
                    <div
                      key={p}
                      className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                          : 'border-border/80 hover:border-border hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">{plan.label}</h4>
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] py-0 px-1.5">
                              Plan Actual
                            </Badge>
                          )}
                        </div>

                        <div>
                          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                            COP {plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">/mes</span>
                        </div>

                        <Separator />

                        <ul className="space-y-2 text-xs text-muted-foreground">
                          <li className="flex items-center gap-2 text-foreground font-medium">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Hasta {plan.companies} empresas cliente</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Conciliaciones NIIF ilimitadas</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Cédula Oficial en PDF y Excel</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Planos Siigo Nube y World Office</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Grupos N:1 (4x1000 GMF e Intereses)</span>
                          </li>
                        </ul>
                      </div>

                      <div className="pt-5">
                        <Button
                          variant={isCurrent ? 'secondary' : 'default'}
                          className="w-full text-xs"
                          disabled={isCurrent}
                          onClick={() => toast.info(`Plan ${plan.label} seleccionado. Facturación en pesos colombianos.`)}
                        >
                          {isCurrent ? 'Plan Activo' : `Elegir ${plan.label}`}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* PESTAÑA 6: BITÁCORA Y AUDITORÍA CONTABLE             */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="audit" className="space-y-6 mt-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Bitácora de Trazabilidad y Control Interno
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registro inmutable de actividades para cumplimiento de Revisoría Fiscal y Auditoría Externa
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {auditLog.length} eventos registrados
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {auditLog.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No hay eventos registrados en la bitácora aún.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold">Fecha y Hora</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Tipo de Evento</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Entidad / Módulo</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLog.map((log) => {
                      const item = actionLabels[log.action] || {
                        label: log.action,
                        badge: 'bg-muted text-muted-foreground',
                      };
                      return (
                        <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-medium text-foreground">{item.label}</span>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground font-mono">
                            {log.entity_type || 'sistema'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Badge variant="outline" className={`text-[10px] py-0 px-2 font-mono ${item.badge}`}>
                              Registrado
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Panel para Evaluadores / Feedback */}
          <Card className="border-border/80 bg-muted/20 shadow-xs">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <MessageSquarePlus className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-foreground">
                    Módulo de Evaluadores Internos ({feedbackCount} retroalimentaciones)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Descarga todas las calificaciones y observaciones emitidas por el equipo contable en formato JSON.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportFeedbacks}
                className="gap-2 text-xs shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar JSON</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
