'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactions,
  getMonthlyTotals,
  getCategoryTotals,
  getCategories,
  initializeDefaultCategories,
  initializeDefaultAccounts,
} from '@/lib/firestore';
import BalanceCard from '@/components/BalanceCard';
import TransactionList from '@/components/TransactionList';
import { MonthlyBarChart, EvolutionAreaChart, CategoryPieChart } from '@/components/Charts';
import styles from './dashboard.module.css';
import type { Transaction, MonthlyData, CategorySpending, Category } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        initializeDefaultCategories(user.uid),
        initializeDefaultAccounts(user.uid),
      ]);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Load current month transactions
      const currentTxs = await getTransactions(user.uid, {
        month: currentMonth,
        year: currentYear,
      });
      setTransactions(currentTxs);

      // Load categories
      const cats = await getCategories(user.uid);
      setCategories(cats);

      // Load last 6 months data for charts
      const monthsData: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const txs = await getTransactions(user.uid, {
          month: d.getMonth(),
          year: d.getFullYear(),
        });
        const totals = getMonthlyTotals(txs);
        monthsData.push({
          month: format(d, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + format(d, 'MMM', { locale: ptBR }).slice(1),
          income: totals.income,
          expenses: totals.expenses,
        });
      }
      setMonthlyData(monthsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = getMonthlyTotals(transactions);
  const categoryTotals = getCategoryTotals(transactions);

  // Calculate monthly change
  const currentBalance = totals.income - totals.expenses;
  const prevMonthData = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2] : null;
  const prevBalance = prevMonthData ? prevMonthData.income - prevMonthData.expenses : 0;
  const monthlyChange = prevBalance !== 0 ? ((currentBalance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

  // Build category spending for pie chart
  const categorySpending: CategorySpending[] = Object.entries(categoryTotals)
    .map(([catName, amount]) => {
      const cat = categories.find((c) => c.name === catName);
      const total = totals.expenses || 1;
      return {
        category: catName,
        amount,
        color: cat?.color || '#64748b',
        icon: cat?.icon || 'circle',
        percentage: Math.round((amount / total) * 100),
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Build recent transactions for list
  const recentTransactions = transactions.slice(0, 7).map((tx) => ({
    id: tx.id,
    description: tx.description,
    category: tx.category,
    amount: tx.amount,
    type: tx.type,
    date: format(new Date(tx.date), 'dd MMM', { locale: ptBR }),
  }));

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={`${styles.balanceSection} animate-pulse`}>
          <div style={{ height: 180, borderRadius: 'var(--radius-xl)', background: 'var(--color-bg-tertiary)' }} />
        </div>
        <div className={styles.chartsGrid}>
          <div style={{ height: 300, borderRadius: 'var(--radius-xl)', background: 'var(--color-bg-card)' }} />
          <div style={{ height: 300, borderRadius: 'var(--radius-xl)', background: 'var(--color-bg-card)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Balance Card */}
      <section className={styles.balanceSection}>
        <BalanceCard
          balance={currentBalance}
          income={totals.income}
          expenses={totals.expenses}
          monthlyChange={monthlyChange}
        />
      </section>

      {/* Charts Grid */}
      {monthlyData.some((d) => d.income > 0 || d.expenses > 0) && (
        <section className={styles.chartsGrid}>
          <div className={styles.chartItem}>
            <MonthlyBarChart data={monthlyData} />
          </div>
          {categorySpending.length > 0 && (
            <div className={styles.chartItem}>
              <CategoryPieChart data={categorySpending} />
            </div>
          )}
        </section>
      )}

      {/* Evolution Chart */}
      {monthlyData.some((d) => d.income > 0 || d.expenses > 0) && (
        <section className={styles.fullWidthSection}>
          <EvolutionAreaChart data={monthlyData} />
        </section>
      )}

      {/* Recent Transactions */}
      <section className={styles.transactionsSection}>
        {recentTransactions.length > 0 ? (
          <TransactionList transactions={recentTransactions} />
        ) : (
          <div className={styles.emptyDashboard}>
            <h3>🚀 Comece agora!</h3>
            <p>Adicione suas primeiras transações na aba Transações para visualizar seus gráficos e relatórios aqui.</p>
          </div>
        )}
      </section>
    </div>
  );
}
