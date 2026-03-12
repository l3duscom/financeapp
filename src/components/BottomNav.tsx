'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  BarChart3,
  Grid3X3,
  Tag,
  Target,
  Calculator,
  Wallet,
  Layers,
  Users,
  Upload,
  Bell,
  User,
  LogOut,
  Sun,
  Moon,
  X,
  CreditCard,
} from 'lucide-react';
import styles from './BottomNav.module.css';

const quickNavItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/budget', label: 'Orçamento', icon: PieChart },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
];

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight, color: '#8b5cf6' },
  { href: '/categories', label: 'Categorias', icon: Tag, color: '#a78bfa' },
  { href: '/budget', label: 'Orçamento', icon: PieChart, color: '#7c3aed' },
  { href: '/goals', label: 'Metas', icon: Target, color: '#2dd4bf' },
  { href: '/projections', label: 'Simulador', icon: Calculator, color: '#22d3ee' },
  { href: '/cards', label: 'Cartões', icon: CreditCard, color: '#f59e0b' },
  { href: '/installments', label: 'Parcelas', icon: Layers, color: '#f97316' },
  { href: '/people', label: 'Pessoas', icon: Users, color: '#ec4899' },
  { href: '/import', label: 'Extrato Bancário', icon: Upload, color: '#10b981' },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, color: '#3b82f6' },
  { href: '/alerts', label: 'Alertas', icon: Bell, color: '#ef4444' },
];

const accountItems = [
  { href: '/profile', label: 'Meu Perfil', icon: User, color: '#6366f1' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { profile, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const closeSheet = useCallback(() => setShowAll(false), []);

  useEffect(() => {
    if (showAll) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showAll]);

  useEffect(() => {
    closeSheet();
  }, [pathname, closeSheet]);

  const isMoreActive = showAll || allNavItems
    .filter((i) => !quickNavItems.some((q) => q.href === i.href))
    .some((i) => pathname === i.href || pathname?.startsWith(i.href + '/'));

  return (
    <>
      <nav className={styles.nav} id="bottom-navigation">
        <div className={styles.inner}>
          {quickNavItems.map((item) => {
            const isActive = !showAll && (pathname === item.href || pathname?.startsWith(item.href + '/'));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.item} ${isActive ? styles.active : ''}`}
                aria-label={item.label}
              >
                <div className={styles.iconWrapper}>
                  <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                  {isActive && <div className={styles.activeIndicator} />}
                </div>
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}

          <button
            className={`${styles.item} ${isMoreActive ? styles.active : ''}`}
            onClick={() => setShowAll(!showAll)}
            aria-label="Ver todos"
          >
            <div className={styles.iconWrapper}>
              <Grid3X3 size={22} strokeWidth={isMoreActive ? 2 : 1.5} />
              {isMoreActive && !showAll && <div className={styles.activeIndicator} />}
            </div>
            <span className={styles.label}>Ver todos</span>
          </button>
        </div>
      </nav>

      {/* Full-screen sheet */}
      <div className={`${styles.overlay} ${showAll ? styles.overlayVisible : ''}`} onClick={closeSheet} />
      <div className={`${styles.sheet} ${showAll ? styles.sheetVisible : ''}`}>
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>Menu</h2>
          <button className={styles.sheetClose} onClick={closeSheet} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>

        {/* User card */}
        <div className={styles.sheetUser}>
          <div className={styles.sheetAvatar}>
            {(profile?.name && profile.name !== 'Usuário' ? profile.name : user?.displayName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className={styles.sheetUserInfo}>
            <span className={styles.sheetUserName}>{profile?.name && profile.name !== 'Usuário' ? profile.name : user?.displayName || 'Usuário'}</span>
            <span className={styles.sheetUserPlan}>
              {(() => {
                const plan = profile?.subscription?.plan;
                const active = profile?.subscription?.active;
                if (plan === 'trial') return 'Trial';
                if (plan === 'annual' || plan === 'anual') return 'Anual';
                if (plan === 'monthly' || plan === 'mensal') return 'Mensal';
                if (plan === 'premium') return 'Premium';
                if (plan === 'expired') return 'Expirado';
                if (active === false) return 'Inativo';
                return 'Ativo';
              })()}
            </span>
          </div>
        </div>

        {/* Navigation grid */}
        <div className={styles.sheetSection}>
          <span className={styles.sheetSectionLabel}>Navegação</span>
          <div className={styles.sheetGrid}>
            {allNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.gridItem} ${isActive ? styles.gridItemActive : ''}`}
                >
                  <div className={styles.gridIcon} style={{ background: `${item.color}18`, color: item.color }}>
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                  <span className={styles.gridLabel}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Account section */}
        <div className={styles.sheetSection}>
          <span className={styles.sheetSectionLabel}>Conta</span>
          <div className={styles.sheetList}>
            {accountItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.listItem} ${isActive ? styles.listItemActive : ''}`}
                >
                  <div className={styles.listIcon} style={{ background: `${item.color}18`, color: item.color }}>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button className={styles.listItem} onClick={toggleTheme}>
              <div className={styles.listIcon} style={{ background: '#f59e0b18', color: '#f59e0b' }}>
                {theme === 'dark' ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
              </div>
              <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
            </button>
            <button className={`${styles.listItem} ${styles.listItemDanger}`} onClick={signOut}>
              <div className={styles.listIcon} style={{ background: '#ef444418', color: '#ef4444' }}>
                <LogOut size={20} strokeWidth={1.5} />
              </div>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
