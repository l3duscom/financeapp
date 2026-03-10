'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './projections.module.css';

interface ProjectionData {
  month: number;
  label: string;
  total: number;
  invested: number;
  interest: number;
}

export default function ProjectionsPage() {
  const [initialAmount, setInitialAmount] = useState(1000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualRate, setAnnualRate] = useState(12);
  const [periodMonths, setPeriodMonths] = useState(60);

  const projection = useMemo(() => {
    const monthlyRate = annualRate / 100 / 12;
    const data: ProjectionData[] = [];
    let balance = initialAmount;
    let totalInvested = initialAmount;

    data.push({
      month: 0,
      label: 'Início',
      total: balance,
      invested: totalInvested,
      interest: 0,
    });

    for (let i = 1; i <= periodMonths; i++) {
      balance = (balance + monthlyContribution) * (1 + monthlyRate);
      totalInvested += monthlyContribution;

      if (i % Math.max(1, Math.floor(periodMonths / 24)) === 0 || i === periodMonths) {
        const yearLabel = Math.floor(i / 12);
        const monthLabel = i % 12;
        data.push({
          month: i,
          label: yearLabel > 0
            ? `${yearLabel}a${monthLabel > 0 ? ` ${monthLabel}m` : ''}`
            : `${i}m`,
          total: balance,
          invested: totalInvested,
          interest: balance - totalInvested,
        });
      }
    }

    return data;
  }, [initialAmount, monthlyContribution, annualRate, periodMonths]);

  const finalData = projection[projection.length - 1];
  const totalInterest = finalData?.interest || 0;
  const totalInvested = finalData?.invested || 0;
  const finalBalance = finalData?.total || 0;
  const interestPercentage = totalInvested > 0 ? (totalInterest / totalInvested) * 100 : 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const periodOptions = [
    { value: 12, label: '1 ano' },
    { value: 24, label: '2 anos' },
    { value: 36, label: '3 anos' },
    { value: 60, label: '5 anos' },
    { value: 120, label: '10 anos' },
    { value: 240, label: '20 anos' },
    { value: 360, label: '30 anos' },
  ];

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        <Calculator size={22} />
        Simulador Financeiro
      </h2>

      {/* Input Section */}
      <div className={styles.inputSection}>
        <div className={styles.inputGrid}>
          <div className={styles.field}>
            <label>
              <DollarSign size={14} />
              Aporte inicial
            </label>
            <input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              min={0}
            />
          </div>
          <div className={styles.field}>
            <label>
              <TrendingUp size={14} />
              Aporte mensal
            </label>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              min={0}
            />
          </div>
          <div className={styles.field}>
            <label>
              <Percent size={14} />
              Taxa anual (%)
            </label>
            <input
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              step={0.5}
              min={0}
            />
          </div>
          <div className={styles.field}>
            <label>
              <Calendar size={14} />
              Período
            </label>
            <select
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={styles.resultsGrid}>
        <div className={`${styles.resultCard} ${styles.totalCard}`}>
          <span className={styles.resultLabel}>Patrimônio final</span>
          <span className={styles.resultValue}>{formatCurrency(finalBalance)}</span>
        </div>
        <div className={styles.resultCard}>
          <span className={styles.resultLabel}>Total investido</span>
          <span className={styles.resultValue}>{formatCurrency(totalInvested)}</span>
        </div>
        <div className={`${styles.resultCard} ${styles.interestCard}`}>
          <span className={styles.resultLabel}>Juros ganhos</span>
          <span className={styles.resultValue}>{formatCurrency(totalInterest)}</span>
          <span className={styles.resultMeta}>+{interestPercentage.toFixed(1)}% sobre investido</span>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>
          <TrendingUp size={18} />
          Projeção do patrimônio
        </h3>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                fontSize={11}
                tick={{ fill: '#64748b' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              />
              <YAxis
                fontSize={11}
                tick={{ fill: '#64748b' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a2236',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  fontSize: 13,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: any) => [
                  formatCurrency(Number(value) || 0),
                  name === 'total' ? 'Patrimônio' : 'Investido',
                ]) as any}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#totalGrad)"
              />
              <Area
                type="monotone"
                dataKey="invested"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#investedGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legendRow}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#6366f1' }} />
            <span>Patrimônio total</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }} />
            <span>Total investido</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={styles.infoCard}>
        <Info size={16} />
        <p>Simulação com juros compostos mensais. Os valores são projeções e não garantem retornos futuros. A taxa utilizada é nominal anual.</p>
      </div>
    </div>
  );
}
