'use client';

import {
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import TransactionIcon from './TransactionIcon';
import styles from './TransactionList.module.css';
import type { TransactionType } from '@/types';

interface TransactionItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: string;
}

interface TransactionListProps {
  transactions: TransactionItem[];
  title?: string;
}

export default function TransactionList({
  transactions,
  title = 'Últimas transações',
}: TransactionListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <button className={styles.viewAllBtn}>Ver todas</button>
      </div>

      <div className={styles.list}>
        {transactions.map((tx, index) => (
          <div
            key={tx.id}
            className={styles.item}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={styles.iconWrapper}>
              <TransactionIcon description={tx.description} category={tx.category} size={22} />
            </div>

            <div className={styles.info}>
              <span className={styles.description}>{tx.description}</span>
              <span className={styles.category}>{tx.category} · {tx.date}</span>
            </div>

            <div className={`${styles.amount} ${tx.type === 'income' ? styles.income : styles.expense}`}>
              <span>
                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
              </span>
              {tx.type === 'income' ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
