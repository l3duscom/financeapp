'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import styles from './Charts.module.css';
import type { MonthlyData, CategorySpending } from '@/types';

interface BarChartCardProps {
  data: MonthlyData[];
  title?: string;
}

interface AreaChartCardProps {
  data: MonthlyData[];
  title?: string;
}

interface PieChartCardProps {
  data: CategorySpending[];
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className={styles.tooltipValue}>
            {entry.name}: {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlyBarChart({ data, title = 'Receitas vs Despesas' }: BarChartCardProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="income"
              name="Receitas"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="expenses"
              name="Despesas"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function EvolutionAreaChart({ data, title = 'Evolução do saldo' }: AreaChartCardProps) {
  // Compute cumulative balance
  const balanceData = data.map((item, index) => {
    const previousBalance = data
      .slice(0, index)
      .reduce((sum, d) => sum + d.income - d.expenses, 0);
    return {
      ...item,
      balance: previousBalance + item.income - item.expenses,
    };
  });

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={balanceData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryPieChart({ data, title = 'Gastos por categoria' }: PieChartCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.pieLayout}>
        <div className={styles.pieWrapper}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="amount"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.pieLegend}>
          {data.map((entry, index) => (
            <div key={index} className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ backgroundColor: entry.color }}
              />
              <span className={styles.legendLabel}>{entry.category}</span>
              <span className={styles.legendValue}>
                {formatCurrency(entry.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
