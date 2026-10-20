'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Company, PLAN_LIMITS } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { DEMO_COMPANIES } from '@/lib/demo-data';

export default function CompaniesPage() {
  const { profile, isDemo } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', nit: '', contact_email: '', contact_phone: '', city: '', notes: '' });

  const loadCompanies = useCallback(async () => {
    if (isDemo) {
      setCompanies(DEMO_COMPANIES);
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

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
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
          notes: form.notes || null,
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
        notes: form.notes || null,
      });
      if (error) {
        toast.error('Error al crear empresa');
        return;
      }
      toast.success('Empresa creada');
    }

    setOpen(false);
    setEditing(null);
    setForm({ name: '', nit: '', contact_email: '', contact_phone: '', city: '', notes: '' });
    loadCompanies();
  };

  const handleDelete = async (id: string) => {
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
      city: company.city || '',
      notes: company.notes || '',
    });
    setOpen(true);
  };

  const handleAdd = () => {
    if (!canAdd) {
      toast.error(`Tu plan permite hasta ${planLimit} empresas. Actualiza tu plan para agregar más.`);
      return;
    }
    setEditing(null);
    setForm({ name: '', nit: '', contact_email: '', contact_phone: '', city: '', notes: '' });
    setOpen(true);
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nit?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            {companies.length} de {planLimit} empresas en tu plan
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} disabled={!canAdd || isDemo} title={isDemo ? 'No disponible en modo demostración' : undefined}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar empresa' : 'Nueva empresa cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Empresa ABC Ltda." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nit">NIT</Label>
                <Input id="nit" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="900.123.456-7" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email contacto</Label>
                  <Input id="email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="contacto@abc.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="300 123 4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bogotá" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Información adicional" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!canAdd && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-warning-foreground">
              Has alcanzado el límite de {planLimit} empresas de tu plan. Actualiza para agregar más.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o NIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando empresas...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {search ? 'Sin resultados' : 'Aún no tienes empresas'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search ? 'Intenta con otro término' : 'Agrega tu primera empresa cliente para comenzar'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <Card key={company.id} className="border-border/60 transition-shadow hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      {company.nit && <p className="text-sm text-muted-foreground">NIT: {company.nit}</p>}
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {company.contact_email && <p>{company.contact_email}</p>}
                  {company.contact_phone && <p>{company.contact_phone}</p>}
                  {company.city && <p>{company.city}</p>}
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-xs text-muted-foreground">{formatDateTime(company.created_at)}</span>
                  {!isDemo && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(company)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(company.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
