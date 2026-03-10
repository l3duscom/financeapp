'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, getCategories, getCategoryTotals } from '@/lib/firestore';
import { getBudgets } from '@/lib/planner';
import { getGoals, getDaysRemaining, getGoalProgress, type FinancialGoal } from '@/lib/planner';
import type { Category, Transaction } from '@/types';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingDown,
  Target,
  Calendar,
  Shield,
} from 'lucide-react';
import styles from './alerts.module.css';

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  icon: React.ElementType;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const generateAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const [transactions, categories, budgets, goals] = await Promise.all([
        getTransactions(user.uid, { month: currentMonth, year: currentYear }),
        getCategories(user.uid),
        getBudgets(user.uid, currentMonth, currentYear),
        getGoals(user.uid),
      ]);

      const newAlerts: Alert[] = [];
      const categoryTotals = getCategoryTotals(transactions);
      const expenseCategories = categories.filter((c) => c.type === 'expense');

      // 1. Budget over alerts
      budgets.forEach((budget) => {
        const spent = categoryTotals[budget.category] || 0;
        if (budget.limit > 0) {
          const percentage = (spent / budget.limit) * 100;

          if (percentage > 100) {
            newAlerts.push({
              id: `budget-over-${budget.category}`,
              type: 'danger',
              title: `Orçamento estourado: ${budget.category}`,
              message: `Você gastou R$ ${spent.toFixed(2)} de R$ ${budget.limit.toFixed(2)} (${percentage.toFixed(0)}%). Excedido em R$ ${(spent - budget.limit).toFixed(2)}.`,
              icon: AlertTriangle,
            });
          } else if (percentage > 80) {
            newAlerts.push({
              id: `budget-warn-${budget.category}`,
              type: 'warning',
              title: `Orçamento prestes a estourar: ${budget.category}`,
              message: `Você já usou ${percentage.toFixed(0)}% do orçamento (R$ ${spent.toFixed(2)} de R$ ${budget.limit.toFixed(2)}). Restam R$ ${(budget.limit - spent).toFixed(2)}.`,
              icon: AlertCircle,
            });
          }
        }
      });

      // 2. Goal deadline alerts
      goals.forEach((goal) => {
        const daysLeft = getDaysRemaining(goal.deadline);
        const progress = getGoalProgress(goal);

        if (progress >= 100) {
          newAlerts.push({
            id: `goal-complete-${goal.id}`,
            type: 'success',
            title: `Meta alcançada: ${goal.name}! 🎉`,
            message: `Parabéns! Você atingiu sua meta de R$ ${goal.targetAmount.toFixed(2)}.`,
            icon: CheckCircle,
          });
        } else if (daysLeft <= 30 && daysLeft > 0) {
          newAlerts.push({
            id: `goal-deadline-${goal.id}`,
            type: 'warning',
            title: `Meta próxima do prazo: ${goal.name}`,
            message: `Faltam ${daysLeft} dias e você atingiu ${progress.toFixed(0)}% (R$ ${(goal.targetAmount - goal.currentAmount).toFixed(2)} restantes).`,
            icon: Calendar,
          });
        } else if (daysLeft === 0 && progress < 100) {
          newAlerts.push({
            id: `goal-expired-${goal.id}`,
            type: 'danger',
            title: `Prazo vencido: ${goal.name}`,
            message: `O prazo desta meta expirou. Progresso: ${progress.toFixed(0)}% (faltam R$ ${(goal.targetAmount - goal.currentAmount).toFixed(2)}).`,
            icon: Target,
          });
        }
      });

      // 3. Spending pattern alerts
      const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

      if (totalIncome > 0 && totalExpenses > totalIncome) {
        newAlerts.push({
          id: 'spending-over-income',
          type: 'danger',
          title: 'Gastos maiores que receitas',
          message: `Neste mês suas despesas (R$ ${totalExpenses.toFixed(2)}) superaram suas receitas (R$ ${totalIncome.toFixed(2)}) em R$ ${(totalExpenses - totalIncome).toFixed(2)}.`,
          icon: TrendingDown,
        });
      } else if (totalIncome > 0 && totalExpenses / totalIncome > 0.9) {
        newAlerts.push({
          id: 'spending-high',
          type: 'warning',
          title: 'Gastos elevados',
          message: `Você já consumiu ${((totalExpenses / totalIncome) * 100).toFixed(0)}% da sua renda mensal. Considere reduzir despesas.`,
          icon: AlertCircle,
        });
      }

      // 4. No budget set
      const categoriesWithSpending = Object.keys(categoryTotals);
      const categoriesWithBudget = budgets.map((b) => b.category);
      const withoutBudget = categoriesWithSpending.filter(
        (c) => !categoriesWithBudget.includes(c)
      );
      if (withoutBudget.length > 0) {
        newAlerts.push({
          id: 'no-budget-set',
          type: 'info',
          title: 'Categorias sem orçamento',
          message: `${withoutBudget.length} categorias com gastos não têm orçamento definido: ${withoutBudget.slice(0, 3).join(', ')}${withoutBudget.length > 3 ? '...' : ''}. Defina limites na página de Orçamento.`,
          icon: Info,
        });
      }

      // 5. No emergency fund
      const emergencyGoal = goals.find((g) => g.category === 'emergency');
      if (!emergencyGoal && goals.length > 0) {
        newAlerts.push({
          id: 'no-emergency-fund',
          type: 'info',
          title: 'Reserva de emergência',
          message: 'Você ainda não criou uma meta de reserva de emergência. Especialistas recomendam ter de 3 a 6 meses de gastos guardados.',
          icon: Shield,
        });
      }

      // Sort: danger > warning > info > success
      const typeOrder = { danger: 0, warning: 1, info: 2, success: 3 };
      newAlerts.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error generating alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const alertCounts = {
    danger: alerts.filter((a) => a.type === 'danger').length,
    warning: alerts.filter((a) => a.type === 'warning').length,
    info: alerts.filter((a) => a.type === 'info').length,
    success: alerts.filter((a) => a.type === 'success').length,
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        <Bell size={22} />
        Alertas e Notificações
      </h2>

      {/* Summary */}
      <div className={styles.summaryRow}>
        {alertCounts.danger > 0 && (
          <div className={`${styles.summaryBadge} ${styles.dangerBadge}`}>
            <AlertTriangle size={14} />
            {alertCounts.danger} crítico{alertCounts.danger > 1 ? 's' : ''}
          </div>
        )}
        {alertCounts.warning > 0 && (
          <div className={`${styles.summaryBadge} ${styles.warningBadge}`}>
            <AlertCircle size={14} />
            {alertCounts.warning} aviso{alertCounts.warning > 1 ? 's' : ''}
          </div>
        )}
        {alertCounts.success > 0 && (
          <div className={`${styles.summaryBadge} ${styles.successBadge}`}>
            <CheckCircle size={14} />
            {alertCounts.success} conquista{alertCounts.success > 1 ? 's' : ''}
          </div>
        )}
        {alertCounts.info > 0 && (
          <div className={`${styles.summaryBadge} ${styles.infoBadge}`}>
            <Info size={14} />
            {alertCounts.info} dica{alertCounts.info > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className={styles.loadingState}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} />
          <h3>Tudo em ordem! 👍</h3>
          <p>Nenhum alerta no momento. Continue administrando bem suas finanças!</p>
        </div>
      ) : (
        <div className={styles.alertList}>
          {alerts.map((alert, index) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={`${styles.alertItem} ${styles[alert.type]}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={styles.alertIcon}>
                  <Icon size={18} />
                </div>
                <div className={styles.alertContent}>
                  <span className={styles.alertTitle}>{alert.title}</span>
                  <p className={styles.alertMessage}>{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
