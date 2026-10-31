'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Sliders } from 'lucide-react';
import { EnrollMFA } from '@/components/mfa/enroll-mfa';
import { Button } from '@/components/ui/button';

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/ajustes" className="hover:text-foreground">Ajustes</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Seguridad MFA</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Seguridad y Doble Factor (MFA / TOTP)
              </h1>
              <p className="text-xs text-muted-foreground">
                Protección criptográfica para conciliaciones y exportaciones financieras (Nivel AAL2)
              </p>
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 self-start sm:self-auto">
          <Link href="/dashboard/ajustes">
            <Sliders className="h-3.5 w-3.5" />
            <span>Volver a Ajustes Generales</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <EnrollMFA />
      </div>
    </div>
  );
}
