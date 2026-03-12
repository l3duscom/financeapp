'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  initializeDefaultCategories,
  initializeDefaultAccounts,
  getMonthlyTotals,
  getPeople,
} from '@/lib/firestore';
import type { Transaction, Person } from '@/types';
import TransactionIcon from '@/components/TransactionIcon';
import TransactionModal from '@/components/TransactionModal';
import Link from 'next/link';
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Filter,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Upload,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './transactions.module.css';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        initializeDefaultCategories(user.uid),
        initializeDefaultAccounts(user.uid),
      ]);

      const [txs, ppl] = await Promise.all([
        getTransactions(user.uid, {
          month: currentMonth,
          year: currentYear,
          type: filterType === 'all' ? undefined : filterType,
        }),
        getPeople(user.uid),
      ]);
      setTransactions(txs);
      setPeople(ppl);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, currentYear, filterType]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleAddTransaction = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
    account: string;
    person?: string;
  }) => {
    if (!user) return;
    await addTransaction(user.uid, {
      ...data,
      date: new Date(data.date),
    });
    await loadTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAssignPerson = async (txId: string, personName: string) => {
    try {
      await updateTransaction(txId, { person: personName || undefined });
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === txId ? { ...tx, person: personName || undefined } : tx))
      );
    } catch (err) {
      console.error('Error assigning person:', err);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totals = getMonthlyTotals(transactions);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

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

  return (
    <div className={styles.page}>
      {/* Month Navigator */}
      <div className={styles.monthNav}>
        <button onClick={prevMonth} className={styles.monthBtn}>←</button>
        <div className={styles.monthLabel}>
          <Calendar size={16} />
          <span className={styles.monthText}>
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </span>
        </div>
        <button onClick={nextMonth} className={styles.monthBtn}>→</button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
          <div className={styles.summaryIcon}>
            <TrendingUp size={18} />
          </div>
          <div>
            <span className={styles.summaryLabel}>Receitas</span>
            <span className={styles.summaryValue}>{formatCurrency(totals.income)}</span>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
          <div className={styles.summaryIcon}>
            <TrendingDown size={18} />
          </div>
          <div>
            <span className={styles.summaryLabel}>Despesas</span>
            <span className={styles.summaryValue}>{formatCurrency(totals.expenses)}</span>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.balanceCard}`}>
          <div className={styles.summaryIcon}>
            <Wallet size={18} />
          </div>
          <div>
            <span className={styles.summaryLabel}>Saldo</span>
            <span className={styles.summaryValue}>{formatCurrency(totals.balance)}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar transação..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              className={`${styles.filterBtn} ${filterType === type ? styles.filterActive : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'Todas' : type === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        <div className={styles.quickLinks}>
          <Link href="/import" className={styles.quickLink}>
            <Upload size={14} /> Importar Extrato
          </Link>
          <Link href="/cards" className={styles.quickLink}>
            <CreditCard size={14} /> Cartões
          </Link>
        </div>
      </div>

      {/* Transaction List */}
      <div className={styles.listContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h3>Nenhuma transação</h3>
            <p>Adicione sua primeira transação clicando no botão abaixo</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredTransactions.map((tx, index) => {
              return (
                <div
                  key={tx.id}
                  className={styles.item}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={styles.itemEmoji}>
                    <TransactionIcon description={tx.description} category={tx.category} size={20} />
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemDesc}>{tx.description}</span>
                    <span className={styles.itemMeta}>
                      {tx.category}
                      {tx.account ? ` · ${tx.account}` : ''}
                      {' · '}
                      {format(new Date(tx.date), 'dd MMM', { locale: ptBR })}
                    </span>
                  </div>
                  <div className={styles.itemRight}>
                    <span
                      className={`${styles.itemAmount} ${
                        tx.type === 'income' ? styles.income : styles.expense
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className={styles.deleteBtn}
                      aria-label="Excluir transação"
                    >
                      <Trash2 size={14} />
                    </button>
                    {people.length > 0 && (
                      <select
                        className={styles.personSelect}
                        value={tx.person || ''}
                        onChange={(e) => handleAssignPerson(tx.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Pessoa</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className={styles.fab}
        onClick={() => setIsModalOpen(true)}
        aria-label="Adicionar transação"
      >
        <Plus size={24} />
      </button>

      {/* Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        mode="add"
      />
    </div>
  );
}
