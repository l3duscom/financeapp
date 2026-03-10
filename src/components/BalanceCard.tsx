'use client';

import { TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import styles from './BalanceCard.module.css';

interface BalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  monthlyChange: number;
}

export default function BalanceCard({
  balance,
  income,
  expenses,
  monthlyChange,
}: BalanceCardProps) {
  const [visible, setVisible] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardBg} />
      
      <div className={styles.header}>
        <span className={styles.label}>Saldo total</span>
        <button
          onClick={() => setVisible(!visible)}
          className={styles.visibilityBtn}
          aria-label={visible ? 'Ocultar saldo' : 'Mostrar saldo'}
        >
          {visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <div className={styles.balanceRow}>
        <h2 className={styles.balance}>
          {visible ? formatCurrency(balance) : '•••••••'}
        </h2>
        {monthlyChange !== 0 && (
          <div
            className={`${styles.changeBadge} ${
              monthlyChange > 0 ? styles.positive : styles.negative
            }`}
          >
            {monthlyChange > 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            <span>{Math.abs(monthlyChange).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className={styles.breakdown}>
        <div className={styles.breakdownItem}>
          <div className={`${styles.dot} ${styles.dotIncome}`} />
          <span className={styles.breakdownLabel}>Receitas</span>
          <span className={styles.breakdownValue}>
            {visible ? formatCurrency(income) : '•••'}
          </span>
        </div>
        <div className={styles.breakdownDivider} />
        <div className={styles.breakdownItem}>
          <div className={`${styles.dot} ${styles.dotExpense}`} />
          <span className={styles.breakdownLabel}>Despesas</span>
          <span className={styles.breakdownValue}>
            {visible ? formatCurrency(expenses) : '•••'}
          </span>
        </div>
      </div>
    </div>
  );
}
