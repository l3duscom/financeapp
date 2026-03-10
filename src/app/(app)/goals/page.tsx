'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getGoals,
  addGoal,
  deleteGoal,
  addToGoal,
  getGoalProgress,
  getDaysRemaining,
  getMonthlyNeeded,
  GOAL_CATEGORIES,
  type FinancialGoal,
} from '@/lib/planner';
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  DollarSign,
  X,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './goals.module.css';

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    category: 'other' as FinancialGoal['category'],
    deadline: '',
  });

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getGoals(user.uid);
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleAddGoal = async () => {
    if (!user || !newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;

    const cat = GOAL_CATEGORIES.find((c) => c.value === newGoal.category);
    await addGoal(user.uid, {
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount,
      deadline: new Date(newGoal.deadline),
      icon: cat?.icon || 'target',
      color: cat?.color || '#64748b',
      category: newGoal.category,
    });
    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, category: 'other', deadline: '' });
    setShowAdd(false);
    await loadGoals();
  };

  const handleDeposit = async (goal: FinancialGoal) => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    await addToGoal(goal.id, amount, goal.currentAmount);
    setDepositGoalId(null);
    setDepositAmount('');
    await loadGoals();
  };

  const handleDelete = async (goalId: string) => {
    await deleteGoal(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Summary
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>
          <Target size={22} />
          Metas Financeiras
        </h2>
        <button className={styles.addBtn} onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} />
          Nova meta
        </button>
      </div>

      {/* Summary */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Objetivo total</span>
          <span className={styles.summaryValue}>{formatCurrency(totalTarget)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Guardado</span>
          <span className={`${styles.summaryValue} ${styles.positiveValue}`}>{formatCurrency(totalSaved)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Concluídas</span>
          <span className={styles.summaryValue}>{completedGoals}/{goals.length}</span>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className={styles.addForm}>
          <h3 className={styles.formTitle}>Criar nova meta</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Nome da meta</label>
              <input
                type="text"
                placeholder="Ex: Viagem para Europa"
                value={newGoal.name}
                onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label>Categoria</label>
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal((p) => ({ ...p, category: e.target.value as FinancialGoal['category'] }))}
              >
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Valor objetivo (R$)</label>
              <input
                type="number"
                placeholder="10000"
                value={newGoal.targetAmount || ''}
                onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: Number(e.target.value) }))}
              />
            </div>
            <div className={styles.field}>
              <label>Já guardado (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={newGoal.currentAmount || ''}
                onChange={(e) => setNewGoal((p) => ({ ...p, currentAmount: Number(e.target.value) }))}
              />
            </div>
            <div className={styles.field}>
              <label>Prazo</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button onClick={() => setShowAdd(false)} className={styles.cancelBtn}>Cancelar</button>
            <button onClick={handleAddGoal} className={styles.confirmBtn}>Criar meta</button>
          </div>
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <div className={styles.loadingState}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className={styles.emptyState}>
          <Target size={48} />
          <h3>Sem metas ainda</h3>
          <p>Crie sua primeira meta financeira e comece a poupar!</p>
        </div>
      ) : (
        <div className={styles.goalsList}>
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            const daysLeft = getDaysRemaining(goal.deadline);
            const monthlyNeeded = getMonthlyNeeded(goal);
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const cat = GOAL_CATEGORIES.find((c) => c.value === goal.category);

            return (
              <div key={goal.id} className={`${styles.goalCard} ${isCompleted ? styles.goalCompleted : ''}`}>
                <div className={styles.goalHeader}>
                  <div className={styles.goalIcon} style={{ backgroundColor: `${goal.color}20`, color: goal.color }}>
                    {isCompleted ? <CheckCircle size={20} /> : <Target size={20} />}
                  </div>
                  <div className={styles.goalInfo}>
                    <span className={styles.goalName}>{goal.name}</span>
                    <span className={styles.goalCategory}>{cat?.label || goal.category}</span>
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className={styles.deleteBtn}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className={styles.progressInfo}>
                    <span>{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</span>
                    <span className={styles.progressPercent}>{progress.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className={styles.goalDetails}>
                  <div className={styles.detailItem}>
                    <Calendar size={14} />
                    <span>{daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'}</span>
                  </div>
                  {!isCompleted && (
                    <div className={styles.detailItem}>
                      <TrendingUp size={14} />
                      <span>{formatCurrency(monthlyNeeded)}/mês necessário</span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <Calendar size={14} />
                    <span>Prazo: {format(new Date(goal.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                </div>

                {/* Deposit */}
                {!isCompleted && (
                  <>
                    {depositGoalId === goal.id ? (
                      <div className={styles.depositForm}>
                        <div className={styles.depositInput}>
                          <DollarSign size={16} />
                          <input
                            type="number"
                            placeholder="Valor a depositar"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className={styles.depositActions}>
                          <button onClick={() => setDepositGoalId(null)} className={styles.cancelBtn}>
                            <X size={14} />
                          </button>
                          <button onClick={() => handleDeposit(goal)} className={styles.depositBtn}>
                            Depositar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={styles.addDepositBtn}
                        onClick={() => setDepositGoalId(goal.id)}
                      >
                        <Plus size={16} />
                        Adicionar depósito
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
