'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';
import styles from './appLayout.module.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <Header />
        <div className={styles.content}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
