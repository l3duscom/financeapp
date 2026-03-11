'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getInstallments,
  addInstallment,
  deleteInstallment,
  getCategories,
  getCreditCards,
  getTransactions,
} from '@/lib/firestore';
import { getTransactionEmoji } from '@/lib/emoji';
import TransactionIcon from '@/components/TransactionIcon';
import CurrencyInput, { parseCurrency } from '@/components/CurrencyInput';
import type { Installment, Category, CreditCard, Transaction } from '@/types';
import {
  Layers,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Calendar,
  Zap,
} from 'lucide-react';
import { format, differenceInMonths, addMonths, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './installments.module.css';

type TabFilter = 'all' | 'active' | 'finished';

const MONTH_LABELS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Patterns to detect installment info in transaction descriptions
// Matches: "Parcela 4/5", "Parcela 04/12", "4/5", "04/12", "Parc 2/6", "PARC. 01 DE 03"
const INSTALLMENT_PATTERNS = [
  /parcela?\s*\.?\s*(\d{1,2})\s*[/\\de ]+\s*(\d{1,2})/i,
  /parc\.?\s*(\d{1,2})\s*[/\\de ]+\s*(\d{1,2})/i,
  /(\d{1,2})\s*\/\s*(\d{1,2})(?!\s*\/\s*\d)/,  // X/Y but not dates like DD/MM/YYYY
];

interface DetectedInstallment {
  id: string;
  description: string;
  baseName: string;
  category: string;
  installmentAmount: number;
  totalAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  startDate: Date;
  latestDate: Date;
  cardName: string;
  source: 'detected' | 'manual';
  transactions: Transaction[];
}

function parseInstallmentFromDesc(desc: string): { current: number; total: number; baseName: string } | null {
  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = desc.match(pattern);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      if (current > 0 && total > 1 && current <= total && total <= 72) {
        let baseName = desc.replace(pattern, '').trim();
        baseName = baseName.replace(/[-–—\s]+$/, '').replace(/^\s*[-–—]\s*/, '').trim();
        if (!baseName) baseName = desc;
        return { current, total, baseName };
      }
    }
  }
  return null;
}

function normalizeBaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-záàãâéêíóôõúç0-9]/gi, '')
    .trim();
}

function getCurrentInstallmentCalc(startDate: Date, totalInstallments: number): number {
  const now = new Date();
  const elapsed = differenceInMonths(startOfMonth(now), startOfMonth(startDate)) + 1;
  return Math.min(Math.max(elapsed, 0), totalInstallments);
}

function isFinished(item: DetectedInstallment): boolean {
  if (item.source === 'manual') {
    return getCurrentInstallmentCalc(item.startDate, item.totalInstallments) >= item.totalInstallments;
  }
  return item.currentInstallment >= item.totalInstallments;
}

function remainingMonths(item: DetectedInstallment): number {
  if (item.source === 'manual') {
    const c = getCurrentInstallmentCalc(item.startDate, item.totalInstallments);
    return Math.max(item.totalInstallments - c, 0);
  }
  return Math.max(item.totalInstallments - item.currentInstallment, 0);
}

export default function InstallmentsPage() {
  const { user } = useAuth();

  const [manualInstallments, setManualInstallments] = useState<Installment[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [tab, setTab] = useState<TabFilter>('all');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formInstallments, setFormInstallments] = useState('');
  const [formDate, setFormDate] = useState(format(now, 'yyyy-MM-dd'));
  const [formCard, setFormCard] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DetectedInstallment | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [inst, cats, cards, txs] = await Promise.all([
        getInstallments(user.uid),
        getCategories(user.uid),
        getCreditCards(user.uid),
        getTransactions(user.uid),
      ]);
      setManualInstallments(inst);
      setCategories(cats);
      setCreditCards(cards);
      setAllTransactions(txs);
    } catch {
      setError('Erro ao carregar parcelas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Detect installments from transactions + merge manual ones
  const installments = useMemo<DetectedInstallment[]>(() => {
    // 1. Detect from transactions
    const groups = new Map<string, {
      baseName: string;
      totalInstallments: number;
      maxCurrent: number;
      transactions: Transaction[];
    }>();

    for (const tx of allTransactions) {
      const parsed = parseInstallmentFromDesc(tx.description);
      if (!parsed) continue;

      const key = normalizeBaseName(parsed.baseName) + '_' + parsed.total;
      const existing = groups.get(key);
      if (existing) {
        existing.transactions.push(tx);
        if (parsed.current > existing.maxCurrent) {
          existing.maxCurrent = parsed.current;
        }
      } else {
        groups.set(key, {
          baseName: parsed.baseName,
          totalInstallments: parsed.total,
          maxCurrent: parsed.current,
          transactions: [tx],
        });
      }
    }

    const detected: DetectedInstallment[] = [];
    for (const [key, group] of groups) {
      const txsSorted = group.transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstTx = txsSorted[0];
      const latestTx = txsSorted[txsSorted.length - 1];
      const avgAmount = group.transactions.reduce((s, t) => s + t.amount, 0) / group.transactions.length;

      detected.push({
        id: `detected_${key}`,
        description: group.baseName,
        baseName: group.baseName,
        category: firstTx.category,
        installmentAmount: Math.round(avgAmount * 100) / 100,
        totalAmount: Math.round(avgAmount * group.totalInstallments * 100) / 100,
        currentInstallment: group.maxCurrent,
        totalInstallments: group.totalInstallments,
        startDate: firstTx.date,
        latestDate: latestTx.date,
        cardName: '',
        source: 'detected',
        transactions: txsSorted,
      });
    }

    // 2. Manual installments
    const manual: DetectedInstallment[] = manualInstallments.map((inst) => ({
      id: inst.id,
      description: inst.description,
      baseName: inst.description,
      category: inst.category,
      installmentAmount: inst.installmentAmount,
      totalAmount: inst.totalAmount,
      currentInstallment: getCurrentInstallmentCalc(inst.startDate, inst.totalInstallments),
      totalInstallments: inst.totalInstallments,
      startDate: inst.startDate,
      latestDate: inst.startDate,
      cardName: inst.cardName,
      source: 'manual',
      transactions: [],
    }));

    return [...detected, ...manual].sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
  }, [allTransactions, manualInstallments]);

  const filtered = useMemo(() => {
    return installments.filter((inst) => {
      if (tab === 'active') return !isFinished(inst);
      if (tab === 'finished') return isFinished(inst);
      return true;
    });
  }, [installments, tab]);

  // Projection: for each month in 12-month window, sum installmentAmounts active in that month
  const projection = useMemo(() => {
    const data: { label: string; value: number; month: number; year: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = addMonths(new Date(selectedYear, selectedMonth, 1), i);
      const m = d.getMonth();
      const y = d.getFullYear();
      let total = 0;

      for (const inst of installments) {
        let start: Date;
        let endMonth: Date;

        if (inst.source === 'manual') {
          start = startOfMonth(inst.startDate);
          endMonth = addMonths(start, inst.totalInstallments - 1);
        } else {
          // For detected: estimate start based on current installment
          const monthsBack = inst.currentInstallment - 1;
          start = addMonths(startOfMonth(inst.latestDate), -monthsBack);
          endMonth = addMonths(start, inst.totalInstallments - 1);
        }

        const current = startOfMonth(d);
        if (!isBefore(current, start) && !isBefore(endMonth, current)) {
          total += inst.installmentAmount;
        }
      }
      data.push({ label: MONTH_LABELS[m], value: total, month: m, year: y });
    }
    return data;
  }, [installments, selectedMonth, selectedYear]);

  const maxProjection = useMemo(() => Math.max(...projection.map((p) => p.value), 1), [projection]);

  const monthlyTotal = useMemo(() => projection[0]?.value ?? 0, [projection]);

  const yearlyTotal = useMemo(() => {
    return projection.filter((p) => p.year === selectedYear).reduce((s, p) => s + p.value, 0);
  }, [projection, selectedYear]);

  const monthsToZero = useMemo(() => {
    let max = 0;
    for (const inst of installments) {
      if (!isFinished(inst)) {
        const rem = remainingMonths(inst);
        if (rem > max) max = rem;
      }
    }
    return max;
  }, [installments]);

  const handleSave = async () => {
    if (!user) return;
    if (!formDesc.trim() || !formTotal || !formInstallments || !formDate) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const totalAmount = parseCurrency(formTotal);
      const totalInst = parseInt(formInstallments);
      if (isNaN(totalAmount) || isNaN(totalInst) || totalInst < 1) {
        setError('Valores inválidos');
        setSaving(false);
        return;
      }
      const installmentAmount = Math.round((totalAmount / totalInst) * 100) / 100;
      await addInstallment(user.uid, {
        description: formDesc.trim(),
        category: formCategory || 'Outros',
        totalAmount,
        installmentAmount,
        totalInstallments: totalInst,
        paidInstallments: 0,
        startDate: new Date(formDate + 'T12:00:00'),
        cardName: formCard || '',
      });
      setSuccess('Parcela adicionada!');
      setShowModal(false);
      resetForm();
      await loadData();
    } catch {
      setError('Erro ao salvar parcela');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.source === 'detected') {
      setError('Parcelas detectadas automaticamente não podem ser excluídas aqui. Exclua as transações originais.');
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteInstallment(deleteTarget.id);
      setSuccess('Parcela removida');
      setDeleteTarget(null);
      await loadData();
    } catch {
      setError('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormDesc('');
    setFormCategory('');
    setFormTotal('');
    setFormInstallments('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormCard('');
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        <Layers size={22} />
        Parcelas
      </h2>

      {error && (
        <div className={styles.errorMsg}>
          <AlertCircle size={16} /> {error}
          <button className={styles.msgClose} onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className={styles.successMsg}>
          <CheckCircle size={16} /> {success}
          <button className={styles.msgClose} onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filtersRow}>
        <div className={styles.tabGroup}>
          {([['all', 'Ambos'], ['active', 'Parcelas'], ['finished', 'Finalizadas']] as [TabFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.monthSelector}>
          <Calendar size={14} />
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {MONTH_LABELS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          /
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <>
          {/* Chart + Summary */}
          <div className={styles.contentGrid}>
            <div className={styles.chartSection}>
              <div className={styles.chartTitle}>Projeção de Parcelas</div>
              <div className={styles.chartContainer}>
                {projection.map((p, i) => (
                  <div key={i} className={styles.chartBar}>
                    <span className={styles.chartBarValue}>
                      {p.value > 0 ? formatCurrency(p.value) : ''}
                    </span>
                    <div
                      className={`${styles.chartBarFill} ${i === 0 ? styles.chartBarFillHighlight : ''}`}
                      style={{ height: `${Math.max((p.value / maxProjection) * 200, 4)}px` }}
                    />
                    <span className={styles.chartBarLabel}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.summarySection}>
              <div className={styles.summaryBox}>
                <span className={styles.summaryBoxLabel}>Parcelas do mês</span>
                <span className={styles.summaryBoxValue}>{formatCurrency(monthlyTotal)}</span>
                <span className={styles.summaryBoxHint}>Somatório das parcelas do mês</span>
              </div>
              <div className={styles.summaryBox}>
                <span className={styles.summaryBoxLabel}>Parcelas do ano</span>
                <span className={styles.summaryBoxValue}>{formatCurrency(yearlyTotal)}</span>
                <span className={styles.summaryBoxHint}>Somatório das parcelas do ano</span>
              </div>
              <div className={styles.summaryBox}>
                <span className={styles.summaryBoxLabel}>Meses até zerar</span>
                <span className={styles.summaryBoxValue}>
                  {monthsToZero > 0 ? `${monthsToZero} ${monthsToZero === 1 ? 'mês' : 'meses'}` : 'Nenhuma parcela ativa'}
                </span>
                <span className={styles.summaryBoxHint}>Tempo restante para zerar os parcelamentos</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <span className={styles.tableTitle}>Gastos Parcelados</span>
              <button className={styles.addBtn} onClick={openModal}>
                <Plus size={16} /> Nova Parcela
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <Layers size={40} />
                <p>Nenhuma compra parcelada encontrada</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Valor Total</th>
                      <th>Valor da Parcela</th>
                      <th>Parcelas</th>
                      <th>Comprou em</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inst) => {
                      const catEmoji = getTransactionEmoji('', inst.category);
                      const fin = isFinished(inst);
                      return (
                        <tr key={inst.id}>
                          <td>
                            <div className={styles.cellDesc}>
                              <span className={styles.cellEmoji}>
                                <TransactionIcon description={inst.description} category={inst.category} size={18} />
                              </span>
                              <div>
                                {inst.description}
                                {inst.source === 'detected' && (
                                  <span className={styles.autoTag} title="Detectada automaticamente das transações">
                                    <Zap size={10} /> auto
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.cellCat}>
                              <span className={styles.cellCatEmoji}>{catEmoji}</span>
                              {inst.category}
                            </span>
                          </td>
                          <td className={styles.cellMoney}>{formatCurrency(inst.totalAmount)}</td>
                          <td className={styles.cellMoney}>{formatCurrency(inst.installmentAmount)}</td>
                          <td>
                            <span className={styles.cellInstallment}>
                              {String(inst.currentInstallment).padStart(2, '0')} de {String(inst.totalInstallments).padStart(2, '0')}
                            </span>
                            <div className={styles.cellProgress}>
                              <div
                                className={styles.cellProgressFill}
                                style={{ width: `${(inst.currentInstallment / inst.totalInstallments) * 100}%` }}
                              />
                            </div>
                          </td>
                          <td className={styles.cellDate}>
                            {format(inst.startDate, 'dd/MM/yyyy')}
                          </td>
                          <td>
                            {inst.source === 'manual' && (
                              <button
                                className={styles.deleteRowBtn}
                                onClick={() => setDeleteTarget(inst)}
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <Layers size={20} />
                <h3>Nova Compra Parcelada</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Descrição</label>
                <input
                  className={styles.formInput}
                  placeholder="Ex: iPhone 16"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Valor Total</label>
                  <CurrencyInput
                    className={styles.formInput}
                    value={formTotal}
                    onChange={(masked) => setFormTotal(masked)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Nº de Parcelas</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="1"
                    placeholder="Ex: 12"
                    value={formInstallments}
                    onChange={(e) => setFormInstallments(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Categoria</label>
                  <select
                    className={styles.formSelect}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Data da Compra</label>
                  <input
                    className={styles.formInput}
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Cartão (opcional)</label>
                <select
                  className={styles.formSelect}
                  value={formCard}
                  onChange={(e) => setFormCard(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} •••• {c.lastDigits}
                    </option>
                  ))}
                </select>
              </div>

              {formTotal && formInstallments && parseInt(formInstallments) > 0 && parseCurrency(formTotal) > 0 && (
                <div className={styles.summaryBox} style={{ marginTop: 0 }}>
                  <span className={styles.summaryBoxLabel}>Valor por parcela</span>
                  <span className={styles.summaryBoxValue}>
                    {formatCurrency(
                      Math.round((parseCurrency(formTotal) / parseInt(formInstallments)) * 100) / 100
                    )}
                  </span>
                  <span className={styles.summaryBoxHint}>
                    {formInstallments}x de{' '}
                    {formatCurrency(
                      Math.round((parseCurrency(formTotal) / parseInt(formInstallments)) * 100) / 100
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className={styles.saveBtn} disabled={saving} onClick={handleSave}>
                {saving ? 'Salvando...' : 'Adicionar Parcela'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className={styles.modalBackdrop} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <Trash2 size={20} />
                <h3>Excluir Parcela</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                Tem certeza que deseja excluir <strong>&quot;{deleteTarget.description}&quot;</strong>?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button className={styles.saveBtn} style={{ background: 'var(--color-expense)' }} onClick={handleDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
