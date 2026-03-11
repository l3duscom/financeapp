'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';
import { Clock, AlertTriangle, Lock, LogOut, CreditCard } from 'lucide-react';
import styles from './appLayout.module.css';

const CHECKOUT_URL = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL || '/#pricing';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const trialInfo = useMemo(() => {
    if (!profile?.subscription) return null;
    const sub = profile.subscription;

    if (sub.plan !== 'trial') return null;

    const trialEnd = sub.trialEndsAt;
    if (!trialEnd) return null;

    const endDate = trialEnd instanceof Date ? trialEnd : (trialEnd as any).toDate?.() || new Date(trialEnd);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      daysLeft: Math.max(0, daysLeft),
      expired: daysLeft <= 0,
    };
  }, [profile]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  // Trial expired - block access
  if (trialInfo?.expired) {
    return (
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <Header />
          <div className={styles.blockedOverlay}>
            <div className={styles.blockedCard}>
              <div className={styles.blockedIcon}>
                <Lock size={32} />
              </div>
              <h2 className={styles.blockedTitle}>Período de teste encerrado</h2>
              <p className={styles.blockedDesc}>
                Seu teste gratuito de 3 dias terminou. Para continuar usando 
                todas as funcionalidades do FinanceApp, assine um dos nossos planos.
              </p>
              <div className={styles.blockedActions}>
                <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className={styles.blockedCtaPrimary}>
                  <CreditCard size={18} />
                  Ver planos e assinar
                </a>
                <button 
                  onClick={async () => { await signOut(); router.push('/'); }}
                  className={styles.blockedCtaSecondary}
                >
                  <LogOut size={18} />
                  Sair da conta
                </button>
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <Header />
        {trialInfo && !trialInfo.expired && (
          <div className={styles.trialBanner}>
            <Clock size={16} />
            <span>
              Período de teste: <strong>{trialInfo.daysLeft} dia{trialInfo.daysLeft !== 1 ? 's' : ''}</strong> restante{trialInfo.daysLeft !== 1 ? 's' : ''}. 
              {' '}<a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className={styles.trialLink}>Assinar agora →</a>
            </span>
          </div>
        )}
        <div className={styles.content}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
