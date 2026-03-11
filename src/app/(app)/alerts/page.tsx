'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions } from '@/lib/firestore';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Bell,
  CheckCircle,
  Info,
  XCircle,
} from 'lucide-react';
import styles from './alerts.module.css';

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'success' | 'info';
  title: string;
  message: string;
  icon: React.ElementType;
  date: Date;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const generateAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const transactions = await getTransactions(user.uid);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const generatedAlerts: Alert[] = [];

      // Filter current month transactions
      const monthTxs = transactions.filter((t) => {
        const d = t.date instanceof Date ? t.date : (t.date as any).toDate?.() || new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const totalIncome = monthTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // Alert: Expenses > 80% of income
      if (totalIncome > 0 && totalExpenses > totalIncome * 0.8) {
        generatedAlerts.push({
          id: 'high-spending',
          type: totalExpenses > totalIncome ? 'danger' : 'warning',
          title: totalExpenses > totalIncome ? 'Gastos excedem a receita!' : 'Gastos elevados',
          message: `Você já gastou ${((totalExpenses / totalIncome) * 100).toFixed(0)}% da sua receita este mês. ${
            totalExpenses > totalIncome
              ? 'Seus gastos ultrapassaram seus ganhos!'
              : 'Considere reduzir os gastos.'
          }`,
          icon: AlertTriangle,
          date: now,
        });
      }

      // Alert: No income this month
      if (totalIncome === 0 && monthTxs.length > 0) {
        generatedAlerts.push({
          id: 'no-income',
          type: 'warning',
          title: 'Nenhuma receita registrada',
          message:
            'Você ainda não registrou nenhuma receita este mês. Não esqueça de adicionar seu salário e outras entradas.',
          icon: Info,
          date: now,
        });
      }

      // Alert: Spending trend by category
      const categorySpending: Record<string, number> = {};
      monthTxs
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

      const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
      if (topCategory && topCategory[1] > totalExpenses * 0.3) {
        generatedAlerts.push({
          id: 'top-category',
          type: 'info',
          title: `${topCategory[0]} é sua maior despesa`,
          message: `A categoria "${topCategory[0]}" representa ${((topCategory[1] / totalExpenses) * 100).toFixed(0)}% dos seus gastos este mês (R$ ${topCategory[1].toFixed(2)}).`,
          icon: TrendingUp,
          date: now,
        });
      }

      // Alert: Good savings
      if (totalIncome > 0 && totalExpenses < totalIncome * 0.5) {
        generatedAlerts.push({
          id: 'good-savings',
          type: 'success',
          title: 'Ótima economia!',
          message: `Você está gastando apenas ${((totalExpenses / totalIncome) * 100).toFixed(0)}% da sua receita. Continue assim para alcançar suas metas mais rápido!`,
          icon: CheckCircle,
          date: now,
        });
      }

      // Alert: High single transaction
      const highTx = monthTxs
        .filter((t) => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)[0];
      if (highTx && totalExpenses > 0 && highTx.amount > totalExpenses * 0.25) {
        generatedAlerts.push({
          id: 'high-tx',
          type: 'warning',
          title: 'Transação de alto valor',
          message: `"${highTx.description}" de R$ ${highTx.amount.toFixed(2)} representou ${((highTx.amount / totalExpenses) * 100).toFixed(0)}% dos seus gastos do mês.`,
          icon: TrendingDown,
          date: now,
        });
      }

      // Alert: Few transactions
      if (monthTxs.length > 0 && monthTxs.length < 5) {
        generatedAlerts.push({
          id: 'few-txs',
          type: 'info',
          title: 'Poucas transações registradas',
          message:
            'Você tem poucas transações este mês. Registrar todas as suas movimentações ajuda a ter uma visão mais precisa das suas finanças.',
          icon: Info,
          date: now,
        });
      }

      // Default: No alerts
      if (generatedAlerts.length === 0) {
        generatedAlerts.push({
          id: 'all-good',
          type: 'success',
          title: 'Tudo certo!',
          message:
            'Não há alertas no momento. Continue acompanhando suas finanças regularmente.',
          icon: CheckCircle,
          date: now,
        });
      }

      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error generating alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const getAlertStyle = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return styles.alertDanger;
      case 'warning':
        return styles.alertWarning;
      case 'success':
        return styles.alertSuccess;
      case 'info':
      default:
        return styles.alertInfo;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerIcon}>
          <Bell size={22} />
        </div>
        <div>
          <h1 className={styles.title}>Alertas Inteligentes</h1>
          <p className={styles.subtitle}>
            Análise automática das suas finanças
          </p>
        </div>
      </div>

      <div className={styles.alertsList}>
        {loading
          ? [1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))
          : alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`${styles.alertCard} ${getAlertStyle(alert.type)}`}
                >
                  <div className={styles.alertIcon}>
                    <Icon size={20} />
                  </div>
                  <div className={styles.alertContent}>
                    <h3 className={styles.alertTitle}>{alert.title}</h3>
                    <p className={styles.alertMessage}>{alert.message}</p>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
