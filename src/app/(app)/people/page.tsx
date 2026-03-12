'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPeople,
  addPerson,
  updatePerson,
  deletePerson,
  getTransactions,
  updateTransaction,
} from '@/lib/firestore';
import TransactionIcon from '@/components/TransactionIcon';
import Toast from '@/components/Toast';
import type { Person, Transaction } from '@/types';
import {
  Users,
  Plus,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './people.module.css';

const AVATAR_COLORS = [
  '#e63946', '#f97316', '#ca8a04', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PeoplePage() {
  const { user } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected person filter (null = all)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ppl, txs] = await Promise.all([
        getPeople(user.uid),
        getTransactions(user.uid, { month: currentMonth, year: currentYear }),
      ]);
      setPeople(ppl);
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Person totals
  const personTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of people) {
      totals[p.name] = 0;
    }
    for (const tx of transactions) {
      if (tx.person && tx.type === 'expense') {
        totals[tx.person] = (totals[tx.person] || 0) + tx.amount;
      }
    }
    return totals;
  }, [people, transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!selectedPersonId) return transactions;
    const person = people.find((p) => p.id === selectedPersonId);
    if (!person) return transactions;
    return transactions.filter((tx) => tx.person === person.name);
  }, [transactions, selectedPersonId, people]);

  // Summary
  const totalExpenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [filteredTransactions]
  );
  const totalIncome = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [filteredTransactions]
  );
  const txCount = filteredTransactions.length;

  // Assign person to transaction
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

  // Modal handlers
  const openAddModal = () => {
    setEditingPerson(null);
    setFormName('');
    setFormColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setShowModal(true);
  };

  const openEditModal = (person: Person) => {
    setEditingPerson(person);
    setFormName(person.name);
    setFormColor(person.color);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) return;
    setSaving(true);
    setError('');

    try {
      if (editingPerson) {
        const oldName = editingPerson.name;
        const newName = formName.trim();
        await updatePerson(editingPerson.id, { name: newName, color: formColor });

        // Rename person references in transactions
        if (oldName !== newName) {
          const txsToUpdate = transactions.filter((tx) => tx.person === oldName);
          for (const tx of txsToUpdate) {
            await updateTransaction(tx.id, { person: newName });
          }
        }

        setSuccess('Pessoa atualizada!');
      } else {
        await addPerson(user.uid, { name: formName.trim(), color: formColor });
        setSuccess('Pessoa adicionada!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving person:', err);
      setError('Erro ao salvar pessoa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPerson) return;
    setSaving(true);
    try {
      await deletePerson(editingPerson.id);
      if (selectedPersonId === editingPerson.id) setSelectedPersonId(null);
      setShowModal(false);
      setSuccess('Pessoa removida.');
      loadData();
    } catch (err) {
      console.error('Error deleting person:', err);
      setError('Erro ao remover pessoa.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getPersonColor = (name: string): string => {
    const person = people.find((p) => p.name === name);
    return person?.color || '#64748b';
  };

  return (
    <div className={styles.page}>
      <Toast type="error" message={error} onClose={() => setError('')} duration={0} />
      <Toast type="success" message={success} onClose={() => setSuccess('')} />

      <h2 className={styles.pageTitle}>
        <Users size={22} /> Gastos por Pessoa
      </h2>

      {/* People Avatars */}
      {loading ? (
        <div className={styles.loadingGrid}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <div className={styles.peopleRow}>
          {/* "Todos" option */}
          <div
            className={`${styles.personCard} ${selectedPersonId === null ? styles.personCardActive : ''}`}
            onClick={() => setSelectedPersonId(null)}
          >
            <div
              className={styles.personAvatar}
              style={{ background: 'var(--color-accent-primary)' }}
            >
              <Users size={24} />
            </div>
            <span className={styles.personName}>Todos</span>
            <span className={styles.personAmount}>
              {formatCurrency(
                transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              )}
            </span>
          </div>

          {people.map((person) => (
            <div
              key={person.id}
              className={`${styles.personCard} ${selectedPersonId === person.id ? styles.personCardActive : ''}`}
              onClick={() => setSelectedPersonId(selectedPersonId === person.id ? null : person.id)}
              onDoubleClick={() => openEditModal(person)}
            >
              <div className={styles.personAvatar} style={{ background: person.color }}>
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt={person.name} />
                ) : (
                  getInitials(person.name)
                )}
              </div>
              <span className={styles.personName}>{person.name}</span>
              <span className={styles.personAmount}>
                {formatCurrency(personTotals[person.name] || 0)}
              </span>
            </div>
          ))}

          {/* Add button */}
          <div className={styles.addPersonCard} onClick={openAddModal}>
            <div className={styles.addPersonBtn}>
              <Plus size={24} />
            </div>
            <span className={styles.addPersonLabel}>Adicionar</span>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div className={styles.filtersRow}>
        <div className={styles.monthNav}>
          <button className={styles.monthBtn} onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft size={16} />
          </button>
          <span className={styles.monthText}>
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button className={styles.monthBtn} onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Despesas</span>
          <span className={`${styles.summaryValue} ${styles.summaryExpense}`}>
            {formatCurrency(totalExpenses)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Receitas</span>
          <span className={`${styles.summaryValue} ${styles.summaryIncome}`}>
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Transações</span>
          <span className={styles.summaryValue}>{txCount}</span>
        </div>
      </div>

      {/* Transaction Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>
            {selectedPersonId
              ? `Transações de ${people.find((p) => p.id === selectedPersonId)?.name}`
              : 'Todas as transações'}
          </span>
          <span className={styles.tableCount}>{filteredTransactions.length} itens</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={40} />
            <p>Nenhuma transação encontrada neste período.</p>
          </div>
        ) : (
          <div className={styles.txList}>
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className={styles.txItem}>
                <div className={styles.txIcon}>
                  <TransactionIcon description={tx.description} category={tx.category} size={18} />
                </div>
                <div className={styles.txInfo}>
                  <span className={styles.txDesc}>{tx.description}</span>
                  <span className={styles.txMeta}>
                    {tx.date ? format(new Date(tx.date), 'dd/MM/yyyy') : '—'} · {tx.category || 'Sem categoria'}
                  </span>
                </div>

                <span className={styles.txCategory}>{tx.category}</span>

                <span className={`${styles.txAmount} ${tx.type === 'expense' ? styles.txExpense : styles.txIncome}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                </span>

                {/* Person assignment */}
                <select
                  className={styles.personSelect}
                  value={tx.person || ''}
                  onChange={(e) => handleAssignPerson(tx.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Pessoa...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Person Modal */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <Users size={20} />
                <h3>{editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className={styles.modalClose}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.avatarPreview}>
                <div className={styles.avatarCircle} style={{ background: formColor }}>
                  {formName.trim() ? getInitials(formName) : '?'}
                </div>
                <span className={styles.avatarHint}>
                  O avatar usa as iniciais do nome
                </span>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Nome</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ex: Carol, Pedro, Família..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Cor</label>
                <div className={styles.colorOptions}>
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorOption} ${formColor === c ? styles.colorOptionActive : ''}`}
                      style={{ background: c }}
                      onClick={() => setFormColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              {editingPerson && (
                <button className={styles.deleteBtn} onClick={handleDelete} disabled={saving}>
                  <Trash2 size={14} /> Excluir
                </button>
              )}
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? 'Salvando...' : editingPerson ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
