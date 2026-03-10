'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactions,
  getCategories,
  getMonthlyTotals,
  getCategoryTotals,
} from '@/lib/firestore';
import {
  MonthlyBarChart,
  EvolutionAreaChart,
  CategoryPieChart,
} from '@/components/Charts';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction, Category, MonthlyData, CategorySpending } from '@/types';
import styles from './reports.module.css';

export default function ReportsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentMonth] = useState(new Date().getMonth());
  const [currentYear] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cats = await getCategories(user.uid);
      setCategories(cats);

      // Load all 12 months of selected year
      const allMonthsData: MonthlyData[] = [];
      let allTransactions: Transaction[] = [];

      const maxMonth = selectedYear === currentYear ? currentMonth : 11;

      for (let m = 0; m <= maxMonth; m++) {
        const txs = await getTransactions(user.uid, {
          month: m,
          year: selectedYear,
        });
        allTransactions = [...allTransactions, ...txs];
        const totals = getMonthlyTotals(txs);
        allMonthsData.push({
          month: format(new Date(selectedYear, m, 1), 'MMM', { locale: ptBR })
            .charAt(0).toUpperCase() +
            format(new Date(selectedYear, m, 1), 'MMM', { locale: ptBR }).slice(1),
          income: totals.income,
          expenses: totals.expenses,
        });
      }

      setTransactions(allTransactions);
      setMonthlyData(allMonthsData);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, currentMonth, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const yearTotals = getMonthlyTotals(transactions);
  const categoryTotals = getCategoryTotals(transactions);
  const avgMonthlyIncome = monthlyData.length > 0
    ? yearTotals.income / monthlyData.filter(m => m.income > 0 || m.expenses > 0).length || 0
    : 0;
  const avgMonthlyExpense = monthlyData.length > 0
    ? yearTotals.expenses / monthlyData.filter(m => m.income > 0 || m.expenses > 0).length || 0
    : 0;

  // Category spending for pie chart
  const categorySpending: CategorySpending[] = Object.entries(categoryTotals)
    .map(([catName, amount]) => {
      const cat = categories.find((c) => c.name === catName);
      const total = yearTotals.expenses || 1;
      return {
        category: catName,
        amount,
        color: cat?.color || '#64748b',
        icon: cat?.icon || 'circle',
        percentage: Math.round((amount / total) * 100),
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Top expense categories
  const topExpenses = [...categorySpending].slice(0, 5);

  // Best and worst months
  const bestMonth = [...monthlyData].sort((a, b) => (b.income - b.expenses) - (a.income - a.expenses))[0];
  const worstMonth = [...monthlyData].filter(m => m.income > 0 || m.expenses > 0).sort((a, b) =>
    (a.income - a.expenses) - (b.income - b.expenses)
  )[0];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <h2 className={styles.pageTitle}><BarChart3 size={22} /> Relatórios</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeleton} style={{ height: 200 }} />
        ))}
      </div>
    );
  }

  const hasData = transactions.length > 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>
          <BarChart3 size={22} />
          Relatórios
        </h2>
        <div className={styles.yearSelector}>
          <Calendar size={16} />
          <select
            className={styles.yearSelect}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>
          <BarChart3 size={48} />
          <h3>Sem dados para exibir</h3>
          <p>Adicione transações para visualizar seus relatórios financeiros.</p>
        </div>
      ) : (
        <>
          {/* Annual Summary */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={`${styles.summaryIcon} ${styles.incomeIcon}`}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Receitas ({selectedYear})</span>
                <span className={styles.summaryValue}>{formatCurrency(yearTotals.income)}</span>
                <span className={styles.summaryMeta}>
                  Média: {formatCurrency(avgMonthlyIncome)}/mês
                </span>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={`${styles.summaryIcon} ${styles.expenseIcon}`}>
                <TrendingDown size={20} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Despesas ({selectedYear})</span>
                <span className={styles.summaryValue}>{formatCurrency(yearTotals.expenses)}</span>
                <span className={styles.summaryMeta}>
                  Média: {formatCurrency(avgMonthlyExpense)}/mês
                </span>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={`${styles.summaryIcon} ${styles.balanceIcon}`}>
                <Wallet size={20} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Saldo ({selectedYear})</span>
                <span className={`${styles.summaryValue} ${yearTotals.balance >= 0 ? styles.positiveValue : styles.negativeValue}`}>
                  {formatCurrency(yearTotals.balance)}
                </span>
                <span className={styles.summaryMeta}>
                  {yearTotals.balance >= 0 ? 'Superávit' : 'Déficit'} anual
                </span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className={styles.chartsGrid}>
            <MonthlyBarChart data={monthlyData} title={`Receitas vs Despesas — ${selectedYear}`} />
            {categorySpending.length > 0 && (
              <CategoryPieChart data={categorySpending} title="Gastos por categoria" />
            )}
          </div>

          <EvolutionAreaChart data={monthlyData} title={`Evolução do saldo — ${selectedYear}`} />

          {/* Insights */}
          <div className={styles.insightsGrid}>
            {/* Top Categories */}
            <div className={styles.insightCard}>
              <h3 className={styles.insightTitle}>🏆 Top gastos</h3>
              <div className={styles.rankList}>
                {topExpenses.map((cat, index) => (
                  <div key={cat.category} className={styles.rankItem}>
                    <span className={styles.rankNumber}>{index + 1}</span>
                    <div
                      className={styles.rankDot}
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className={styles.rankName}>{cat.category}</span>
                    <span className={styles.rankValue}>{formatCurrency(cat.amount)}</span>
                    <span className={styles.rankPercent}>{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best / Worst Month */}
            <div className={styles.insightCard}>
              <h3 className={styles.insightTitle}>📊 Meses destaque</h3>
              <div className={styles.highlightList}>
                {bestMonth && (bestMonth.income > 0 || bestMonth.expenses > 0) && (
                  <div className={styles.highlightItem}>
                    <div className={`${styles.highlightBadge} ${styles.positiveBadge}`}>
                      <ArrowUpRight size={16} />
                    </div>
                    <div>
                      <span className={styles.highlightLabel}>Melhor mês</span>
                      <span className={styles.highlightValue}>
                        {bestMonth.month} — {formatCurrency(bestMonth.income - bestMonth.expenses)}
                      </span>
                    </div>
                  </div>
                )}
                {worstMonth && (worstMonth.income > 0 || worstMonth.expenses > 0) && (
                  <div className={styles.highlightItem}>
                    <div className={`${styles.highlightBadge} ${styles.negativeBadge}`}>
                      <ArrowDownRight size={16} />
                    </div>
                    <div>
                      <span className={styles.highlightLabel}>Pior mês</span>
                      <span className={styles.highlightValue}>
                        {worstMonth.month} — {formatCurrency(worstMonth.income - worstMonth.expenses)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
