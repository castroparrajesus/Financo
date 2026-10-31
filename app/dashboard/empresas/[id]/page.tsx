'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Landmark,
  CreditCard,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Clock,
  Copy,
  ChevronDown,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Company, CompanyMember, CompanyRole } from '@/lib/types';
import {
  getDemoCompanies,
  getStoredCompanyMembers,
  saveStoredCompanyMember,
  removeStoredCompanyMember,
  updateStoredMemberRole,
} from '@/lib/demo-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const ROLE_DEFINITIONS: Record<CompanyRole, { label: string; description: string; badgeClass: string }> = {
  owner: {
    label: 'Propietario (Owner)',
    description: 'Control total de la empresa, gestión de membresías y eliminación de la compañía.',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  admin: {
    label: 'Administrador',
    description: 'Invitar y gestionar miembros del equipo, cargar extractos y autorizar conciliaciones.',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  editor: {
    label: 'Editor Contable',
    description: 'Carga de archivos bancarios/auxiliares y ejecución de cruces de conciliación.',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  viewer: {
    label: 'Lector (Viewer)',
    description: 'Acceso de solo lectura a extractos, cédulas y reportes. Sin permiso de subida.',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
  },
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, isDemo } = useAuth();
  const companyId = (params?.id as string) || '';

  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de invitación
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<CompanyRole>('editor');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const isSupabaseConfigured = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return url.length > 0 && !url.includes('placeholder-project');
  }, []);

  const loadData = useCallback(async () => {
    if (!companyId) return;

    if (isDemo) {
      const demoCompanies = getDemoCompanies();
      const found = demoCompanies.find((c) => c.id === companyId);
      if (found) {
        setCompany(found);
      }
      const localMembers = getStoredCompanyMembers(companyId);
      setMembers(localMembers);
      setLoading(false);
      return;
    }

    // Cuenta Real: Cargar exclusivamente desde Supabase con RLS
    if (isSupabaseConfigured()) {
      try {
        const { data: compData, error: compErr } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();

        if (!compErr && compData) {
          setCompany(compData as Company);
        } else {
          setCompany(null);
        }

        // Consultar miembros de la empresa
        const { data: remoteMembers, error: memErr } = await supabase
          .from('company_members')
          .select('id, company_id, user_id, role, created_at')
          .eq('company_id', companyId);

        if (!memErr && remoteMembers && remoteMembers.length > 0) {
          const userIds = remoteMembers.map((m) => m.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

          const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

          const mapped: CompanyMember[] = remoteMembers.map((m) => {
            const prof = profileMap.get(m.user_id);
            return {
              id: m.id,
              company_id: m.company_id,
              user_id: m.user_id,
              role: m.role as CompanyRole,
              created_at: m.created_at,
              email: prof?.email || 'usuario@financo.co',
              full_name: prof?.full_name || 'Miembro del Equipo',
              status: 'active',
            };
          });

          setMembers(mapped);
        } else {
          setMembers([]);
        }
      } catch (err) {
        console.warn('Error al consultar empresa y miembros en Supabase:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [companyId, isDemo, isSupabaseConfigured]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('financo_members_updated', handleUpdate);
    return () => window.removeEventListener('financo_members_updated', handleUpdate);
  }, [loadData]);

  // Determinar rol del usuario actual en esta empresa
  const currentUserRole = useMemo<CompanyRole>(() => {
    if (!user) return 'viewer';
    const member = members.find(
      (m) =>
        m.user_id === user.id ||
        (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
    if (member) return member.role;

    // Si es el creador original de la empresa
    if (company && (company.owner_id === user.id || company.user_id === user.id)) {
      return 'owner';
    }

    return 'owner'; // En modo demo/local concedemos permisos administrativos por defecto
  }, [user, members, company]);

  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleCopyNit = (nit: string | null) => {
    if (!nit) return;
    navigator.clipboard.writeText(nit);
    toast.success(`NIT ${nit} copiado al portapapeles`);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Por favor ingresa un correo electrónico válido');
      return;
    }

    // Verificar si ya es miembro
    const existing = members.find((m) => m.email?.toLowerCase() === cleanEmail);
    if (existing) {
      toast.error('Este usuario ya es miembro del equipo de esta empresa');
      return;
    }

    setSubmittingInvite(true);

    try {
      if (isDemo) {
        const resolvedUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newMember: CompanyMember = {
          id: `mem-${Date.now()}`,
          company_id: companyId,
          user_id: resolvedUserId,
          role: inviteRole,
          email: cleanEmail,
          full_name: inviteName.trim() || cleanEmail.split('@')[0],
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        saveStoredCompanyMember(newMember);
        setMembers([...members, newMember]);
        toast.success(`Invitación enviada a ${cleanEmail} con rol de ${ROLE_DEFINITIONS[inviteRole].label}`);
        setInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('editor');
        return;
      }

      // Cuenta Real: Resolver usuario en Supabase y persistir en company_members
      if (isSupabaseConfigured()) {
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (profileMatch) {
          const { error: insErr } = await supabase.from('company_members').insert({
            company_id: companyId,
            user_id: profileMatch.id,
            role: inviteRole,
          });

          if (insErr) {
            toast.error('Error al agregar miembro: ' + insErr.message);
            return;
          }

          toast.success(`Miembro ${profileMatch.full_name || cleanEmail} vinculado con éxito`);
        } else {
          toast.info(
            `El usuario ${cleanEmail} no está registrado aún. Una vez cree su cuenta podrá ser asignado.`
          );
        }

        await loadData();
        setInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('editor');
      }
    } catch {
      toast.error('Ocurrió un error al procesar la invitación');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: CompanyRole) => {
    if (!canManageTeam) {
      toast.error('Solo el propietario o administradores pueden modificar roles');
      return;
    }

    if (isDemo) {
      updateStoredMemberRole(companyId, memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId || m.user_id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success('Rol de acceso actualizado correctamente en la demo');
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('company_members')
          .update({ role: newRole })
          .eq('company_id', companyId)
          .eq('id', memberId);

        if (error) {
          toast.error('Error al actualizar rol en Supabase: ' + error.message);
          return;
        }

        setMembers((prev) =>
          prev.map((m) => (m.id === memberId || m.user_id === memberId ? { ...m, role: newRole } : m))
        );
        toast.success('Rol de acceso actualizado correctamente');
      } catch (err) {
        console.error('Error al actualizar rol:', err);
        toast.error('Error al actualizar rol en el servidor');
      }
    }
  };

  const handleRemoveMember = async (member: CompanyMember) => {
    if (!canManageTeam) {
      toast.error('No tienes permisos para remover miembros');
      return;
    }

    if (member.role === 'owner') {
      toast.error('No es posible remover al Propietario principal de la empresa');
      return;
    }

    if (isDemo) {
      removeStoredCompanyMember(companyId, member.id || member.user_id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id && m.user_id !== member.user_id));
      toast.success(`Miembro ${member.full_name || member.email} retirado de la demo`);
      return;
    }

    if (isSupabaseConfigured() && member.id) {
      try {
        const { error } = await supabase.from('company_members').delete().eq('id', member.id);
        if (error) {
          toast.error('Error al eliminar miembro en Supabase: ' + error.message);
          return;
        }

        setMembers((prev) => prev.filter((m) => m.id !== member.id && m.user_id !== member.user_id));
        toast.success(`Miembro ${member.full_name || member.email} retirado del equipo`);
      } catch (err) {
        console.error('Error al eliminar miembro:', err);
        toast.error('Error al remover miembro');
      }
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-xs text-muted-foreground">Cargando detalles de la empresa y equipo...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Empresa no encontrada</h2>
        <p className="text-xs text-muted-foreground">
          La empresa solicitada no existe o no tienes permisos de acceso en su equipo.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/empresas">Volver a Empresas Clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header con Migas de Pan y Acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard/empresas" className="hover:text-foreground">
              Empresas
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">{company.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{company.name}</h1>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-mono border-emerald-500/40 text-emerald-700 bg-emerald-500/5">
                  NIIF Pymes
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Configuración multiusuario, roles de acceso y parámetros de homologación bancaria
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href="/dashboard/empresas">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver</span>
            </Link>
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 shadow-sm"
            onClick={() => router.push(`/dashboard/nueva?companyId=${company.id}`)}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Nueva Conciliación</span>
          </Button>
        </div>
      </div>

      {/* 2. Tarjeta Resumen de Parámetros de la Empresa */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Ficha Técnica y Datos Tributarios
            </span>
            {company.nit && (
              <button
                onClick={() => handleCopyNit(company.nit)}
                className="inline-flex items-center gap-1.5 text-xs font-mono bg-muted/60 px-2.5 py-1 rounded-md border hover:bg-muted transition"
                title="Copiar NIT"
              >
                <span>NIT: {company.nit}</span>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-0">
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5 text-blue-600" />
              Banco Principal
            </span>
            <p className="font-semibold text-foreground">
              {company.notes?.includes('Banco:')
                ? company.notes.split('Banco:')[1]?.split('|')[0]?.trim()
                : 'Bancolombia S.A.'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              Cuenta PUC Auxiliar
            </span>
            <p className="font-mono font-semibold text-foreground">
              {company.notes?.includes('PUC:')
                ? company.notes.split('PUC:')[1]?.split('|')[0]?.trim()
                : '11100501 Bancolombia Cta Cte'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-amber-600" />
              Ciudad / Domicilio
            </span>
            <p className="font-semibold text-foreground">{company.city || 'Galapa, Atlántico'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              Contacto Contable
            </span>
            <p className="font-medium text-foreground truncate">
              {company.contact_email || 'PROVEEDORES@CAMAGUEY.COM.CO'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Sección "Equipo" (Modelo Multiusuario RBAC) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Equipo y Roles de Acceso
            </h2>
            <p className="text-xs text-muted-foreground">
              Control de acceso granular por empresa. Los permisos se combinan con las políticas de seguridad MFA AAL2.
            </p>
          </div>

          {canManageTeam && (
            <Button
              onClick={() => setInviteModalOpen(true)}
              size="sm"
              className="gap-1.5 text-xs shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invitar Miembro al Equipo</span>
            </Button>
          )}
        </div>

        {/* Guía breve de roles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(Object.keys(ROLE_DEFINITIONS) as CompanyRole[]).map((r) => {
            const def = ROLE_DEFINITIONS[r];
            return (
              <div
                key={r}
                className="rounded-lg border border-border/70 bg-card p-3 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] uppercase font-mono ${def.badgeClass}`}>
                    {r}
                  </Badge>
                  {currentUserRole === r && (
                    <span className="text-[10px] text-primary font-medium">Tu rol</span>
                  )}
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed pt-1">
                  {def.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Lista de Miembros Actuales */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Miembros Vinculados ({members.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Aislamiento RLS activo: función <code className="font-mono text-primary font-bold">public.user_role_in_company()</code>
              </span>
            </div>
          </CardHeader>
          <div className="divide-y divide-border/60">
            {members.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No hay miembros registrados en esta empresa todavía.
              </div>
            ) : (
              members.map((member) => {
                const initials = (member.full_name || member.email || 'U')
                  .split(' ')
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isCurrentUser =
                  member.user_id === user?.id ||
                  (member.email && user?.email && member.email.toLowerCase() === user?.email.toLowerCase());

                const roleDef = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.viewer;

                return (
                  <div
                    key={member.id || member.user_id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-xs">
                        {initials}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground">
                            {member.full_name || member.email}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">
                              Tú
                            </Badge>
                          )}
                          {member.status === 'pending' && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-amber-600 border-amber-500/30">
                              <Clock className="h-2.5 w-2.5 mr-0.5 inline" />
                              Pendiente
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Mail className="h-3 w-3 opacity-70" />
                          <span>{member.email}</span>
                          <span className="text-border">·</span>
                          <span>
                            {member.created_at
                              ? new Date(member.created_at).toLocaleDateString('es-CO', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Activo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Selector de rol o Badge fijo */}
                      {canManageTeam && member.role !== 'owner' ? (
                        <Select
                          value={member.role}
                          onValueChange={(val) => handleRoleChange(member.id || member.user_id, val as CompanyRole)}
                        >
                          <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Lector (Viewer)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize font-medium py-1 px-2.5 border ${roleDef.badgeClass}`}
                        >
                          <Shield className="h-3 w-3 mr-1 inline" />
                          {roleDef.label.split(' ')[0]}
                        </Badge>
                      )}

                      {/* Botón de eliminar miembro (solo si no es el owner) */}
                      {canManageTeam && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Remover miembro del equipo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* 4. Modal para Invitar Miembro */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              Invitar Miembro a {company.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Asigna permisos de acceso a este colaborador. Podrá colaborar de inmediato según el rol asignado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail" className="text-xs font-semibold">
                Correo Electrónico *
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="ejemplo@contadores.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Si el usuario ya tiene cuenta en Financo se vinculará de inmediato; de lo contrario, recibirá estado de invitación pendiente.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inviteName" className="text-xs">
                Nombre Completo (Opcional)
              </Label>
              <Input
                id="inviteName"
                placeholder="Ej: Laura Mendoza"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inviteRole" className="text-xs font-semibold">
                Rol de Acceso en la Empresa
              </Label>
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as CompanyRole)}
              >
                <SelectTrigger id="inviteRole" className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="py-0.5">
                      <span className="font-medium text-foreground block">Administrador</span>
                      <span className="text-[10px] text-muted-foreground">Invitar miembros y conciliar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="py-0.5">
                      <span className="font-medium text-foreground block">Editor Contable</span>
                      <span className="text-[10px] text-muted-foreground">Subir extractos y ejecutar conciliaciones</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="py-0.5">
                      <span className="font-medium text-foreground block">Lector (Viewer)</span>
                      <span className="text-[10px] text-muted-foreground">Solo lectura de reportes y cédulas</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Seguridad y Protección RLS
              </span>
              <p className="text-muted-foreground text-[11px]">
                Los roles asignados se validan directamente en PostgreSQL mediante políticas RLS y la función <code className="font-mono text-primary font-bold">public.user_role_in_company()</code>.
              </p>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="text-xs">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={submittingInvite} className="text-xs font-medium">
                {submittingInvite ? 'Guardando...' : 'Asignar al Equipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
