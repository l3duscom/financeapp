'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  BarChart3,
  User,
} from 'lucide-react';
import styles from './BottomNav.module.css';

const navItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/budget', label: 'Orçamento', icon: PieChart },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/profile', label: 'Perfil', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} id="bottom-navigation">
      <div className={styles.inner}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
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
      </div>
    </nav>
  );
}
