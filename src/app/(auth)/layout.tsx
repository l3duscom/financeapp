import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finly Pro+ - Acesso',
  description: 'Faça login na sua conta Finly Pro+',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      {children}
    </div>
  );
}
