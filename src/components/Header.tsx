'use client';

import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Header() {
  const { profile } = useAuth();
  const firstName = profile?.name?.split(' ')[0] || 'Usuário';

  return (
    <header className={styles.header} id="app-header">
      <div className={styles.greetingSection}>
        <h1 className={styles.greeting}>
          {getGreeting()}, <span className={styles.name}>{firstName}</span> 👋
        </h1>
        <p className={styles.subtitle}>
          Veja como estão suas finanças hoje
        </p>
      </div>

      <div className={styles.actions}>
        <div className={styles.avatar}>
          {firstName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
