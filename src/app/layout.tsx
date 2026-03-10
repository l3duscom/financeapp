import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6366f1',
};

export const metadata: Metadata = {
  title: {
    default: 'FinanceApp - Gerenciador Financeiro Pessoal',
    template: '%s | FinanceApp',
  },
  description:
    'Gerencie suas finanças pessoais de forma inteligente. Controle gastos, crie metas, acompanhe orçamentos, simule investimentos e receba alertas automáticos.',
  keywords: [
    'finanças pessoais',
    'gerenciador financeiro',
    'orçamento',
    'controle de gastos',
    'metas financeiras',
    'simulador de investimentos',
    'planejador financeiro',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinanceApp',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'FinanceApp',
    title: 'FinanceApp - Gerenciador Financeiro Pessoal',
    description:
      'Controle gastos, crie metas financeiras, acompanhe seu orçamento e simule investimentos. Tudo em um único app.',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'FinanceApp Icon',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'FinanceApp - Gerenciador Financeiro Pessoal',
    description:
      'Controle gastos, crie metas e simule investimentos. Tudo em um único app.',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <ServiceWorkerRegistrar />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
