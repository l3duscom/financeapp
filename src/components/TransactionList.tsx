'use client';

import {
  ShoppingCart,
  Coffee,
  Home,
  Car,
  Briefcase,
  Heart,
  Zap,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
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

const categoryIcons: Record<string, React.ElementType> = {
  'Alimentação': Coffee,
  'Mercado': ShoppingCart,
  'Moradia': Home,
  'Transporte': Car,
  'Trabalho': Briefcase,
  'Saúde': Heart,
  'Utilidades': Zap,
  'Salário': DollarSign,
  'Freelance': Briefcase,
  'Investimentos': ArrowUpRight,
};

const categoryColors: Record<string, string> = {
  'Alimentação': '#f59e0b',
  'Mercado': '#10b981',
  'Moradia': '#6366f1',
  'Transporte': '#3b82f6',
  'Trabalho': '#8b5cf6',
  'Saúde': '#ef4444',
  'Utilidades': '#06b6d4',
  'Salário': '#10b981',
  'Freelance': '#8b5cf6',
  'Investimentos': '#6366f1',
};

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
        {transactions.map((tx, index) => {
          const Icon = categoryIcons[tx.category] || DollarSign;
          const color = categoryColors[tx.category] || '#6366f1';

          return (
            <div
              key={tx.id}
              className={styles.item}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={styles.iconWrapper}
                style={{ backgroundColor: `${color}20`, color }}
              >
                <Icon size={18} />
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
          );
        })}
      </div>
    </div>
  );
}
