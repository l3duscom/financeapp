'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBudgets, setBudget, deleteBudget, type MonthlyBudget } from '@/lib/planner';
import { getCategories, getTransactions, getCategoryTotals } from '@/lib/firestore';
import type { Category, Transaction } from '@/types';
import {
  PieChart,
  Calendar,
  Edit3,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CurrencyInput, { parseCurrency } from '@/components/CurrencyInput';
import styles from './budget.module.css';

export default function BudgetPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cats, buds, txs] = await Promise.all([
        getCategories(user.uid),
        getBudgets(user.uid, currentMonth, currentYear),
        getTransactions(user.uid, { month: currentMonth, year: currentYear, type: 'expense' }),
      ]);
      setCategories(cats.filter((c) => c.type === 'expense'));
      setBudgets(buds);
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading budget data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryTotals = getCategoryTotals(transactions);

  const handleSetBudget = async (category: string) => {
    if (!user) return;
    const value = parseCurrency(editValue);
    if (value < 0) return;

    await setBudget(user.uid, category, value, currentMonth, currentYear);
    setEditingId(null);
    setEditValue('');
    await loadData();
  };

  const handleDeleteBudget = async (budgetId: string) => {
    await deleteBudget(budgetId);
    await loadData();
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const monthLabel = format(
    new Date(currentYear, currentMonth),
    'MMMM yyyy',
    { locale: ptBR }
  );

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build budget rows
  const budgetRows = categories.map((cat) => {
    const budget = budgets.find((b) => b.category === cat.name);
    const spent = categoryTotals[cat.name] || 0;
    const limit = budget?.limit || 0;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const isOver = percentage > 100;
    const isWarning = percentage > 80 && percentage <= 100;

    return {
      category: cat,
      budget,
      spent,
      limit,
      percentage: Math.min(percentage, 100),
      isOver,
      isWarning,
      remaining: limit - spent,
    };
  });

  const totalBudget = budgetRows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = budgetRows.reduce((s, r) => s + r.spent, 0);
  const overBudgetCount = budgetRows.filter((r) => r.isOver).length;

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        <PieChart size={22} />
        Orçamento Mensal
      </h2>

      {/* Month Nav */}
      <div className={styles.monthNav}>
        <button onClick={prevMonth} className={styles.monthBtn}>←</button>
        <div className={styles.monthLabel}>
          <Calendar size={16} />
          <span>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
        </div>
        <button onClick={nextMonth} className={styles.monthBtn}>→</button>
      </div>

      {/* Summary */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Orçamento total</span>
          <span className={styles.summaryValue}>{formatCurrency(totalBudget)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total gasto</span>
          <span className={`${styles.summaryValue} ${totalSpent > totalBudget ? styles.overValue : ''}`}>
            {formatCurrency(totalSpent)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Estouros</span>
          <span className={`${styles.summaryValue} ${overBudgetCount > 0 ? styles.overValue : ''}`}>
            {overBudgetCount}
          </span>
        </div>
      </div>

      {/* Budget List */}
      {loading ? (
        <div className={styles.loadingState}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <div className={styles.budgetList}>
          {budgetRows.map((row) => (
            <div
              key={row.category.id}
              className={`${styles.budgetItem} ${row.isOver ? styles.itemOver : ''} ${row.isWarning ? styles.itemWarning : ''}`}
            >
              <div className={styles.itemHeader}>
                <div
                  className={styles.itemDot}
                  style={{ backgroundColor: row.category.color }}
                />
                <span className={styles.itemName}>{row.category.name}</span>
                {row.isOver && (
                  <span className={styles.overBadge}>
                    <AlertTriangle size={12} />
                    Estourado
                  </span>
                )}
                <div className={styles.itemActions}>
                  {editingId === row.category.id ? (
                    <div className={styles.editForm}>
                      <CurrencyInput
                        placeholder="R$ 0,00"
                        value={editValue}
                        onChange={(masked) => setEditValue(masked)}
                        className={styles.editInput}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSetBudget(row.category.name)}
                        className={styles.editConfirm}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={styles.editCancel}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(row.category.id);
                        setEditValue(row.limit > 0 ? String(row.limit) : '');
                      }}
                      className={styles.editBtn}
                    >
                      <Edit3 size={14} />
                      <span>{row.limit > 0 ? 'Editar limite' : 'Definir limite'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${row.isOver ? styles.fillOver : row.isWarning ? styles.fillWarning : ''}`}
                  style={{
                    width: `${row.percentage}%`,
                    backgroundColor: row.isOver ? undefined : row.category.color,
                  }}
                />
              </div>

              <div className={styles.itemFooter}>
                <span className={styles.itemSpent}>
                  {formatCurrency(row.spent)}
                  {row.limit > 0 && <span className={styles.itemLimit}> / {formatCurrency(row.limit)}</span>}
                </span>
                {row.limit > 0 && (
                  <span className={`${styles.itemRemaining} ${row.isOver ? styles.negativeRemaining : ''}`}>
                    {row.remaining >= 0
                      ? `Resta ${formatCurrency(row.remaining)}`
                      : `Excedido ${formatCurrency(Math.abs(row.remaining))}`
                    }
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
