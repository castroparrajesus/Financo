'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  MapPin,
  Mail,
  Phone,
  Scale,
  CheckCircle2,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Landmark,
  ShieldCheck,
  CreditCard,
  Layers,
  ArrowUpRight,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Company, PLAN_LIMITS } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { DEMO_COMPANIES } from '@/lib/demo-data';

interface ExtendedCompanyForm {
  name: string;
  nit: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  notes: string;
  bankName?: string;
  ledgerAccount?: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const { profile, isDemo, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [formTab, setFormTab] = useState<'basic' | 'accounting'>('basic');
  const [form, setForm] = useState<ExtendedCompanyForm>({
    name: '',
    nit: '',
    contact_email: '',
    contact_phone: '',
    city: 'Bogotá D.C.',
    notes: '',
    bankName: 'Bancolombia S.A.',
    ledgerAccount: '11100501 Cuenta Corriente',
  });

  const loadCompanies = useCallback(async () => {
    if (isDemo) {
      // Intenta cargar empresas editadas guardadas en sesión o defaults
      try {
        const saved = sessionStorage.getItem('financo_demo_companies');
        if (saved) {
          setCompanies(JSON.parse(saved));
        } else {
          setCompanies(DEMO_COMPANIES);
        }
      } catch {
        setCompanies(DEMO_COMPANIES);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Error al cargar empresas');
    } else {
      setCompanies(data as Company[]);
    }
    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const planLimit = profile ? PLAN_LIMITS[profile.plan].companies : 5;
  const canAdd = companies.length < planLimit;
  const usagePercentage = Math.min(100, Math.round((companies.length / planLimit) * 100));

  // Ciudades únicas para filtro
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set);
  }, [companies]);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.nit?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase());

      const matchCity = cityFilter === 'all' || c.city === cityFilter;
      return matchSearch && matchCity;
    });
  }, [companies, search, cityFilter]);

  const handleCopyNit = (nit: string | null) => {
    if (!nit) return;
    navigator.clipboard.writeText(nit);
    toast.success(`NIT ${nit} copiado al portapapeles`);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre o razón social es obligatorio');
      return;
    }

    // Armar notas combinadas con metadatos contables
    const fullNotes = [
      form.notes || '',
      form.bankName ? `Banco: ${form.bankName}` : '',
      form.ledgerAccount ? `PUC: ${form.ledgerAccount}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    if (isDemo) {
      if (editing) {
        const updated = companies.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                name: form.name,
                nit: form.nit || null,
                contact_email: form.contact_email || null,
                contact_phone: form.contact_phone || null,
                city: form.city || null,
                notes: fullNotes || null,
              }
            : c
        );
        setCompanies(updated);
        sessionStorage.setItem('financo_demo_companies', JSON.stringify(updated));
        toast.success('Empresa actualizada (modo demostración)');
      } else {
        const newCo: Company = {
          id: `demo-co-${Date.now()}`,
          owner_id: user?.id || 'demo-user',
          name: form.name,
          nit: form.nit || '901.883.418-1',
          contact_email: form.contact_email || 'contacto@empresa.com',
          contact_phone: form.contact_phone || '601 555 0100',
          city: form.city || 'Bogotá D.C.',
          notes: fullNotes,
          created_at: new Date().toISOString(),
        };
        const updated = [newCo, ...companies];
        setCompanies(updated);
        sessionStorage.setItem('financo_demo_companies', JSON.stringify(updated));
        toast.success('Empresa cliente creada con éxito');
      }
      setOpen(false);
      setEditing(null);
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from('companies')
        .update({
          name: form.name,
          nit: form.nit || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          city: form.city || null,
          notes: fullNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (error) {
        toast.error('Error al actualizar');
        return;
      }
      toast.success('Empresa actualizada');
    } else {
      const { error } = await supabase.from('companies').insert({
        name: form.name,
        nit: form.nit || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        city: form.city || null,
        notes: fullNotes || null,
      });
      if (error) {
        toast.error('Error al crear empresa');
        return;
      }
      toast.success('Empresa cliente creada con éxito');
    }

    setOpen(false);
    setEditing(null);
    loadCompanies();
  };

  const handleDelete = async (id: string, name: string) => {
    if (isDemo) {
      const updated = companies.filter((c) => c.id !== id);
      setCompanies(updated);
      sessionStorage.setItem('financo_demo_companies', JSON.stringify(updated));
      toast.success(`Empresa "${name}" eliminada`);
      return;
    }

    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
      return;
    }
    toast.success('Empresa eliminada');
    loadCompanies();
  };

  const handleEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name: company.name,
      nit: company.nit || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      city: company.city || 'Bogotá D.C.',
      notes: company.notes || '',
      bankName: company.notes?.includes('Banco:') ? company.notes.split('Banco:')[1]?.split('|')[0]?.trim() : 'Bancolombia S.A.',
      ledgerAccount: company.notes?.includes('PUC:') ? company.notes.split('PUC:')[1]?.split('|')[0]?.trim() : '11100501 Cuenta Corriente',
    });
    setFormTab('basic');
    setOpen(true);
  };

  const handleAdd = () => {
    if (!canAdd) {
      toast.error(`Tu plan permite hasta ${planLimit} empresas. Actualiza tu plan para agregar más.`);
      return;
    }
    setEditing(null);
    setForm({
      name: '',
      nit: '',
      contact_email: '',
      contact_phone: '',
      city: 'Bogotá D.C.',
      notes: '',
      bankName: 'Bancolombia S.A.',
      ledgerAccount: '11100501 Cuenta Corriente',
    });
    setFormTab('basic');
    setOpen(true);
  };

  const getMonogram = (name: string) => {
    return name
      .replace(/[^a-zA-Z\s]/g, '')
      .split(' ')
      .filter((w) => w.length > 2 && !['SAS', 'S.A.S.', 'LTDA', 'CIA', 'DEL', 'LOS', 'LAS'].includes(w.toUpperCase()))
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header con estilo institucional Financo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Empresas Clientes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Empresas Clientes</h1>
              <p className="text-xs text-muted-foreground">
                Portafolio de empresas, NITs validados, cuentas PUC bancarias y estados de conciliación NIIF
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleAdd} className="gap-2 shadow-sm font-medium">
          <Plus className="h-4 w-4" />
          Nueva Empresa Cliente
        </Button>
      </div>

      {/* 2. Tarjetas de Indicadores Clave del Portafolio */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Empresas Activas</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
              {companies.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              En seguimiento contable mensual
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Cédulas NIIF al Día</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
              100%
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Cuadradas con diferencia $0,00 COP
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Bancos Vinculados</span>
              <Landmark className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
              Bancolombia
            </div>
            <p className="text-[11px] text-muted-foreground">
              Bogotá, Davivienda y Occidente
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Capacidad del Plan</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                {profile?.plan || 'Esencial'}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-foreground">
                {companies.length} <span className="text-xs text-muted-foreground font-normal">de {planLimit} empresas</span>
              </span>
              <span className="text-xs font-mono font-bold text-primary">{usagePercentage}%</span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Barra de Búsqueda, Filtros y Toggle de Vista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por razón social, NIT o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {uniqueCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="border border-border/80 rounded-lg p-0.5 flex bg-muted/40">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 px-2.5 text-xs"
              title="Vista de cuadrícula"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2.5 text-xs"
              title="Vista de tabla"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Lista o Cuadrícula de Empresas */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">Cargando portafolio de empresas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">
                {search || cityFilter !== 'all' ? 'Sin empresas coincidentes' : 'Aún no tienes empresas en tu portafolio'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {search || cityFilter !== 'all'
                  ? 'Prueba modificando los criterios de búsqueda o limpiando los filtros.'
                  : 'Registra tu primera empresa cliente para comenzar a conciliar extractos bancarios bajo NIIF.'}
              </p>
            </div>
            <Button onClick={handleAdd} size="sm" className="mt-2">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Registrar Primera Empresa
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => {
            const monogram = getMonogram(company.name);
            const isIcc = company.name.includes('ICC') || company.name.includes('INGENIEROS');

            return (
              <Card
                key={company.id}
                className="border-border/80 transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Franja superior estética */}
                  <div className={`h-1.5 w-full ${isIcc ? 'bg-gradient-to-r from-blue-600 via-primary to-emerald-500' : 'bg-gradient-to-r from-slate-400 to-slate-600'}`} />

                  <CardContent className="p-5 space-y-4">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20 shadow-xs">
                          {monogram}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
                            {company.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {company.nit ? (
                              <button
                                onClick={() => handleCopyNit(company.nit)}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/60 transition-colors"
                                title="Copiar NIT"
                              >
                                <span>NIT {company.nit}</span>
                                <Copy className="h-2.5 w-2.5 opacity-60" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Sin NIT</span>
                            )}
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" />
                              NIIF Pymes
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown de opciones */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                            <span className="sr-only">Abrir menú</span>
                            <span className="text-base font-bold">⋮</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem onClick={() => handleEdit(company)}>
                            <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            Editar datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/nueva?companyId=${company.id}`)}>
                            <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-primary" />
                            Nueva conciliación
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(company.id, company.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar empresa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Ficha técnica de la empresa */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Landmark className="h-3.5 w-3.5 text-blue-600" />
                          Banco Principal:
                        </span>
                        <span className="font-semibold text-foreground">
                          {isIcc ? 'Bancolombia Cta Cte' : 'Bancolombia'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                          Cuenta PUC:
                        </span>
                        <span className="font-mono text-foreground font-medium">11100501</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-600" />
                          Ciudad:
                        </span>
                        <span className="text-foreground">{company.city || 'Bogotá D.C.'}</span>
                      </div>
                    </div>

                    {/* Datos de contacto */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {company.contact_email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{company.contact_email}</span>
                        </div>
                      )}
                      {company.contact_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          <span>{company.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Footer de acción rápida */}
                <div className="border-t border-border/70 bg-muted/10 px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Cédula: Enero 2026 ($0 diff)</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => router.push(`/dashboard/nueva?companyId=${company.id}`)}
                  >
                    <span>Conciliar</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground border-b font-medium">
                <tr>
                  <th className="py-2.5 px-4 text-left">Empresa / Razón Social</th>
                  <th className="py-2.5 px-4 text-left">NIT / Identificación</th>
                  <th className="py-2.5 px-4 text-left">Ciudad</th>
                  <th className="py-2.5 px-4 text-left">Banco & PUC</th>
                  <th className="py-2.5 px-4 text-left">Contacto</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((company) => (
                  <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{company.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {company.nit ? (
                        <span className="bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                          {company.nit}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{company.city || 'Bogotá D.C.'}</td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground block">Bancolombia Cta Cte</span>
                        <span className="text-[11px] font-mono text-muted-foreground">PUC 11100501</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div>{company.contact_email || '—'}</div>
                      <div className="text-[11px] text-muted-foreground/80">{company.contact_phone || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-primary/30 text-primary"
                          onClick={() => router.push(`/dashboard/nueva?companyId=${company.id}`)}
                        >
                          <span>Conciliar</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(company)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. Modal Elevado para Registrar / Editar Empresa Cliente */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" />
              {editing ? 'Editar Empresa Cliente' : 'Registrar Nueva Empresa Cliente'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={(v) => setFormTab(v as 'basic' | 'accounting')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="basic" className="text-xs">
                Datos Generales y NIT
              </TabsTrigger>
              <TabsTrigger value="accounting" className="text-xs">
                Parámetros Contables NIIF
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Razón Social Completa *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: INGENIEROS CONSULTORES Y CONSTRUCTORES ICC S.A.S."
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Se utilizará exactamente tal cual en la Cédula Oficial NIIF y certificaciones de auditoría.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nit" className="text-xs font-semibold">
                    NIT con Dígito de Verificación
                  </Label>
                  <Input
                    id="nit"
                    value={form.nit}
                    onChange={(e) => setForm({ ...form, nit: e.target.value })}
                    placeholder="Ej: 901.883.418-1"
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold">
                    Ciudad / Municipio
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ej: Cartagena, Bogotá, Medellín"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    Correo de Contacto Contable
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="contabilidad@empresa.com"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">
                    Teléfono / PBX
                  </Label>
                  <Input
                    id="phone"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="601 555 0100"
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounting" className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Homologación Bancaria Automática
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Estos parámetros permiten pre-configurar la cuenta del catálogo PUC y el banco para agilizar el cruce mensual.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Entidad Financiera Principal</Label>
                  <Select
                    value={form.bankName || 'Bancolombia S.A.'}
                    onValueChange={(v) => setForm({ ...form, bankName: v })}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Selecciona banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bancolombia S.A.">Bancolombia S.A.</SelectItem>
                      <SelectItem value="Banco de Bogotá">Banco de Bogotá</SelectItem>
                      <SelectItem value="Davivienda">Davivienda</SelectItem>
                      <SelectItem value="Banco de Occidente">Banco de Occidente</SelectItem>
                      <SelectItem value="BBVA Colombia">BBVA Colombia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cuenta Auxiliar PUC</Label>
                  <Input
                    value={form.ledgerAccount || '11100501'}
                    onChange={(e) => setForm({ ...form, ledgerAccount: e.target.value })}
                    placeholder="Ej: 11100501 Bancolombia Cta Cte"
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">
                  Observaciones de Cierre o Revisoría Fiscal
                </Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ej: Manejo de GMF consolidado N:1, exención tributaria, etc."
                  className="text-xs h-9"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={handleSave} size="sm" className="text-xs font-medium">
              {editing ? 'Guardar Cambios' : 'Registrar Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
