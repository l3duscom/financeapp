'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Target,
  PieChart,
  User,
  LogOut,
  Wallet,
  CreditCard,
  Calculator,
  Bell,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/budget', label: 'Orçamento', icon: PieChart },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/projections', label: 'Simulador', icon: Calculator },
  { href: '/invoices', label: 'Faturas', icon: CreditCard },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/alerts', label: 'Alertas', icon: Bell },
];

const bottomNavItems = [
  { href: '/profile', label: 'Meu Perfil', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className={styles.sidebar} id="sidebar-navigation">
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <Wallet size={24} strokeWidth={1.5} />
        </div>
        <span className={styles.logoText}>
          Finance<span className={styles.logoAccent}>App</span>
        </span>
      </div>

      {/* Main Nav */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navLabel}>Menu</span>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
                {isActive && <div className={styles.activeDot} />}
              </Link>
            );
          })}
        </div>

        <div className={styles.navSection}>
          <span className={styles.navLabel}>Conta</span>
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={signOut} className={styles.navItem}>
            <LogOut size={20} strokeWidth={1.5} />
            <span>Sair</span>
          </button>
        </div>
      </nav>

      {/* User Section */}
      <div className={styles.userSection}>
        <div className={styles.userAvatar}>
          {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{profile?.name || 'Usuário'}</span>
          <span className={styles.userPlan}>
            {(() => {
              const plan = profile?.subscription?.plan;
              const active = profile?.subscription?.active;
              if (!active) return 'Inativo';
              if (plan === 'trial') return 'Trial';
              if (plan === 'annual' || plan === 'anual') return 'Anual';
              if (plan === 'monthly' || plan === 'mensal') return 'Mensal';
              if (plan === 'expired') return 'Expirado';
              return plan || 'Inativo';
            })()}
          </span>
        </div>
      </div>
    </aside>
  );
}
