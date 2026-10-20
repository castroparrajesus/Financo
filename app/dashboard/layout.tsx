'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  LayoutDashboard,
  FolderUp,
  FileSpreadsheet,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PLAN_LIMITS } from '@/lib/types';
import { BrandLogo } from '@/components/brand-logo';
import { FeedbackModal } from '@/components/feedback-modal';

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/conciliaciones', label: 'Conciliaciones', icon: FileSpreadsheet },
  { href: '/dashboard/empresas', label: 'Empresas', icon: Building2 },
  { href: '/dashboard/nueva', label: 'Nueva conciliación', icon: FolderUp },
  { href: '/dashboard/ajustes', label: 'Ajustes', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isDemo, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const planLabel = profile ? PLAN_LIMITS[profile.plan]?.label : 'Esencial';
  const initials = (profile?.full_name || user.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
          <BrandLogo size="sm" />
          <span className="text-lg font-bold">Financo</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">Plan {planLabel}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <BrandLogo size="sm" />
            <span className="text-lg font-bold">Financo</span>
          </div>
          {/* Mobile nav */}
          <nav className="flex gap-1 lg:hidden">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg p-2 ${pathname === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <FeedbackModal />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">
                    {profile?.full_name || user.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile?.full_name || 'Usuario'}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/ajustes">
                    <Settings className="mr-2 h-4 w-4" />
                    Ajustes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    router.push('/');
                  }}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {isDemo && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                <span className="font-semibold">Modo demostración:</span> explora datos de ejemplo o procesa
                archivos. Los resultados se guardan solo en esta pestaña; no se envían a una cuenta.
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
