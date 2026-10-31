'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MFAChallenge } from '@/components/mfa/mfa-challenge';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginMFAPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>

        <MFAChallenge redirectTo="/dashboard" />
      </div>
    </div>
  );
}
