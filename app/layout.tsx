import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../lib/supabase/auth-context';
import { Toaster } from '../components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Financo — Conciliación automatizada de pagos',
  description: 'Concilia extractos bancarios con tu agenda de clientes en minutos. Diseñado para contadores en Colombia.',
  icons: {
    icon: '/image copy.png',
  },
  openGraph: {
    title: 'Financo — Conciliación automatizada de pagos',
    description: 'Concilia extractos bancarios con tu agenda de clientes en minutos. Diseñado para contadores en Colombia.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
