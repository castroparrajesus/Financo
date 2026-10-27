import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../lib/supabase/auth-context';
import { Toaster } from '../components/ui/toaster';
import { PWAProvider } from '../components/pwa/pwa-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://financo.co'),
  title: 'Financo — Conciliación automatizada de pagos',
  description: 'Concilia extractos bancarios con tu agenda de clientes en minutos. Diseñado para contadores en Colombia.',
  themeColor: '#0F2C59',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Financo',
  },
  icons: {
    icon: [
      { url: '/brand-logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: ['/brand-logo.png'],
    apple: [
      { url: '/brand-logo.png', sizes: '180x180', type: 'image/png' },
    ],
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
          <PWAProvider>
            {children}
            <Toaster />
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

