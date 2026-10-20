'use client';

import { useEffect, useState } from 'react';
import { User, Shield, CreditCard, Building2, Clock, Check, Lock, KeyRound, MessageSquarePlus, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { getStoredFeedbacks } from '@/components/feedback-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PLAN_LIMITS, Plan } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

export default function SettingsPage() {
  const { user, profile, refreshProfile, changePassword, isDemo } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [auditLog, setAuditLog] = useState<{ id: string; action: string; entity_type: string | null; created_at: string }[]>([]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setFeedbackCount(getStoredFeedbacks().length);

    if (isDemo) {
      setAuditLog([
        { id: 'demo-audit-1', action: 'reconcile', entity_type: 'reconciliation', created_at: '2026-10-06T14:30:00.000Z' },
        { id: 'demo-audit-2', action: 'upload', entity_type: 'file', created_at: '2026-10-06T14:25:00.000Z' },
        { id: 'demo-audit-3', action: 'login', entity_type: 'session', created_at: '2026-10-06T14:20:00.000Z' },
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
    if (isDemo) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user!.id);
    setSaving(false);
    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Perfil actualizado');
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
    toast.success('Descargado con éxito');
  };

  const actionLabels: Record<string, string> = {
    upload: 'Subida de archivo',
    view: 'Visualización',
    modify: 'Modificación',
    export: 'Exportación',
    delete: 'Eliminación',
    login: 'Inicio de sesión',
    reconcile: 'Conciliación',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">Administra tu perfil, privacidad y seguridad de tu cuenta</p>
      </div>

      {/* Profile */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} readOnly={isDemo} />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving || isDemo}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" />
            Seguridad y Contraseña Privada
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada usuario tiene su contraseña privada. Puedes cambiar tu clave de acceso en cualquier momento.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-pass">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-pass"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Confirmar nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-pass"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={changingPass || isDemo}>
              {changingPass ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feedback & Evaluators Hub */}
      <Card className="border-border/60 bg-secondary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              Retroalimentación de Evaluadores
            </CardTitle>
            <Badge variant="secondary">
              {feedbackCount} recibidas
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Los evaluadores pueden registrarse con su propio correo privado desde la pantalla de registro y enviar sus opiniones mediante el botón superior.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/80 p-3">
            <div>
              <p className="text-sm font-medium">Exportar retroalimentaciones de los usuarios</p>
              <p className="text-xs text-muted-foreground">Descarga todas las calificaciones y sugerencias en un archivo JSON.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExportFeedbacks}>
              <Download className="h-4 w-4" />
              Descargar reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Plan de suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge>{PLAN_LIMITS[profile?.plan || 'esencial'].label}</Badge>
            <span className="text-sm text-muted-foreground">
              COP {PLAN_LIMITS[profile?.plan || 'esencial'].price}/mes ·{' '}
              {PLAN_LIMITS[profile?.plan || 'esencial'].companies} empresas
            </span>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(PLAN_LIMITS) as Plan[]).map((p) => {
              const plan = PLAN_LIMITS[p];
              const isCurrent = profile?.plan === p;
              return (
                <div
                  key={p}
                  className={`rounded-lg border p-4 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border/60'}`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{plan.label}</h4>
                    {isCurrent && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-2xl font-bold">COP {plan.price}</p>
                  <p className="text-xs text-muted-foreground">/mes</p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.companies} empresas</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Seguridad y Privacidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Protección de contraseñas y sesiones</p>
                <p className="text-sm text-muted-foreground">
                  Cada usuario gestiona su propia clave privada sin acceso compartido ni contraseñas visibles.
                </p>
              </div>
            </div>
            <Badge variant="default">Protegido</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Borrado automático de archivos temporales</p>
                <p className="text-sm text-muted-foreground">Los extractos y comprobantes procesados se protegen y depuran</p>
              </div>
            </div>
            <Badge variant="secondary">30 días</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Registro de auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad registrada</p>
          ) : (
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {actionLabels[entry.action] || entry.action}
                    </Badge>
                    <span className="text-muted-foreground">{entry.entity_type || '—'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
