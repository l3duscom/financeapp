'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getTransactions,
} from '@/lib/firestore';
import { getBudgets, setBudget, type MonthlyBudget } from '@/lib/planner';
import { getTransactionEmoji } from '@/lib/emoji';
import TransactionIcon from '@/components/TransactionIcon';
import type { Category, Transaction, TransactionType } from '@/types';
import {
  Tag,
  Plus,
  ArrowLeft,
  X,
  AlertCircle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './categories.module.css';

const ICON_OPTIONS = [
  '🍔', '🛒', '🏠', '🚗', '❤️', '🎓', '🎮', '⚡',
  '👕', '📌', '💰', '💼', '📈', '🎬', '✈️', '🐾',
  '💊', '🏋️', '☕', '📱', '💡', '🎵', '📦', '🛡️',
  '💇', '🧹', '👟', '💍', '🍺', '🥐', '🛋️', '🎁',
  '💸', '🏧', '📋', '🔄', '🧸', '👶', '+',
];

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#78716c', '#1e293b',
];

type DetailTab = 'transactions' | 'limits' | 'edit';

export default function CategoriesPage() {
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('📌');
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [customEmoji, setCustomEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail view
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('transactions');
  const [catTransactions, setCatTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Limit editing in detail
  const [budgets, setBudgetsState] = useState<MonthlyBudget[]>([]);
  const [limitValue, setLimitValue] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  // Edit in detail
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const now = new Date();

  const loadCategories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cats = await getCategories(user.uid);
      setCategories(cats);
    } catch {
      setError('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return categories;
    return categories.filter((c) => c.type === typeFilter);
  }, [categories, typeFilter]);

  // Count transactions per category (from current month for display)
  const [txCounts, setTxCounts] = useState<Record<string, { count: number; total: number }>>({});

  useEffect(() => {
    if (!user || categories.length === 0) return;
    const fetchCounts = async () => {
      try {
        const txs = await getTransactions(user.uid, {
          month: now.getMonth(),
          year: now.getFullYear(),
        });
        const counts: Record<string, { count: number; total: number }> = {};
        for (const tx of txs) {
          if (!counts[tx.category]) counts[tx.category] = { count: 0, total: 0 };
          counts[tx.category].count++;
          counts[tx.category].total += tx.amount;
        }
        setTxCounts(counts);
      } catch { /* ignore */ }
    };
    fetchCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, categories]);

  // Detail: load transactions for selected category
  const loadCatDetail = useCallback(async (cat: Category) => {
    if (!user) return;
    setLoadingTx(true);
    try {
      const [txs, buds] = await Promise.all([
        getTransactions(user.uid, {
          month: now.getMonth(),
          year: now.getFullYear(),
          category: cat.name,
        }),
        getBudgets(user.uid, now.getMonth(), now.getFullYear()),
      ]);
      setCatTransactions(txs);
      setBudgetsState(buds);
      const budgetForCat = buds.find((b) => b.category === cat.name);
      setLimitValue(budgetForCat?.limit ? String(budgetForCat.limit) : '');
    } catch {
      setError('Erro ao carregar detalhes');
    } finally {
      setLoadingTx(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectCategory = (cat: Category) => {
    setSelectedCat(cat);
    setDetailTab('transactions');
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
    setEditType(cat.type);
    loadCatDetail(cat);
  };

  const goBack = () => {
    setSelectedCat(null);
    setCatTransactions([]);
  };

  // Modal open for new
  const openNewModal = () => {
    setEditingCat(null);
    setFormName('');
    setFormIcon('📌');
    setFormColor(COLOR_OPTIONS[0]);
    setFormType('expense');
    setCustomEmoji('');
    setShowModal(true);
  };

  const handleSaveCategory = async () => {
    if (!user) return;
    if (!formName.trim()) { setError('Informe o nome da categoria'); return; }
    setSaving(true);
    try {
      const icon = customEmoji || formIcon;
      if (editingCat) {
        await updateCategory(editingCat.id, {
          name: formName.trim(),
          icon,
          color: formColor,
          type: formType,
        });
        setSuccess('Categoria atualizada!');
      } else {
        await addCategory(user.uid, {
          name: formName.trim(),
          icon,
          color: formColor,
          type: formType,
          budget: 0,
        });
        setSuccess('Categoria criada!');
      }
      setShowModal(false);
      await loadCategories();
    } catch {
      setError('Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  // Detail: save limit
  const handleSaveLimit = async () => {
    if (!user || !selectedCat) return;
    setSavingLimit(true);
    try {
      const val = parseFloat(limitValue.replace(/\./g, '').replace(',', '.'));
      await setBudget(user.uid, selectedCat.name, isNaN(val) ? 0 : val, now.getMonth(), now.getFullYear());
      setSuccess('Limite atualizado!');
      await loadCatDetail(selectedCat);
    } catch {
      setError('Erro ao salvar limite');
    } finally {
      setSavingLimit(false);
    }
  };

  // Detail: save edit
  const handleSaveEdit = async () => {
    if (!selectedCat || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateCategory(selectedCat.id, {
        name: editName.trim(),
        icon: editIcon,
        color: editColor,
        type: editType,
      });
      setSuccess('Categoria atualizada!');
      const updated = { ...selectedCat, name: editName.trim(), icon: editIcon, color: editColor, type: editType };
      setSelectedCat(updated);
      await loadCategories();
    } catch {
      setError('Erro ao atualizar');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedCat) return;
    try {
      await deleteCategory(selectedCat.id);
      setSuccess('Categoria excluída');
      setShowDeleteConfirm(false);
      goBack();
      await loadCategories();
    } catch {
      setError('Erro ao excluir');
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const catSpent = useMemo(() => {
    return catTransactions.reduce((s, t) => s + t.amount, 0);
  }, [catTransactions]);

  const catBudget = useMemo(() => {
    if (!selectedCat) return 0;
    const b = budgets.find((bd) => bd.category === selectedCat.name);
    return b?.limit || 0;
  }, [budgets, selectedCat]);

  const usagePercent = catBudget > 0 ? Math.min((catSpent / catBudget) * 100, 100) : 0;

  // Resolve icon: if it's an emoji (starts with non-ascii) use as-is, else use a fallback
  const resolveIcon = (icon: string) => {
    if (/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{200D}\u{20E3}\u{FE0F}]/u.test(icon)) {
      return icon;
    }
    return '📌';
  };

  // ===== RENDER =====

  if (selectedCat) {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>
          <Tag size={22} />
          Categorias
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

        <div className={styles.detailView}>
          <div className={styles.detailHeader}>
            <button className={styles.backBtn} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <div className={styles.detailInfo}>
              <div className={styles.detailIcon} style={{ background: `${selectedCat.color}22` }}>
                {resolveIcon(selectedCat.icon)}
              </div>
              <div>
                <div className={styles.detailName}>{selectedCat.name}</div>
                <span
                  className={`${styles.detailBadge} ${selectedCat.type === 'expense' ? styles.cardTypeExpense : styles.cardTypeIncome}`}
                >
                  {selectedCat.type === 'expense' ? 'Despesa' : 'Receita'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {([['transactions', 'Transações'], ['limits', 'Limites'], ['edit', 'Editar']] as [DetailTab, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`${styles.tab} ${detailTab === key ? styles.tabActive : ''}`}
                onClick={() => setDetailTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className={styles.detailSummary}>
            <div className={styles.summaryBox}>
              <span className={styles.summaryBoxLabel}>Total de transações</span>
              <span className={styles.summaryBoxValue}>{catTransactions.length}</span>
              <span className={styles.summaryBoxHint}>somando um valor de {formatCurrency(catSpent)}</span>
            </div>
            {catBudget > 0 && (
              <div className={styles.summaryBox}>
                <span className={styles.summaryBoxLabel}>Limite mensal</span>
                <span className={styles.summaryBoxValue}>{formatCurrency(catBudget)}</span>
                <span className={styles.summaryBoxHint}>
                  {catSpent <= catBudget
                    ? `Resta ${formatCurrency(catBudget - catSpent)}`
                    : `Excedido em ${formatCurrency(catSpent - catBudget)}`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {detailTab === 'transactions' && (
            loadingTx ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} style={{ height: 52 }} />)}
              </div>
            ) : catTransactions.length === 0 ? (
              <div className={styles.emptyState}>
                <Tag size={40} />
                <p>Nenhuma transação nesta categoria este mês</p>
              </div>
            ) : (
              <div className={styles.txList}>
                {catTransactions.map((tx) => (
                  <div key={tx.id} className={styles.txItem}>
                    <span className={styles.txEmoji}>
                      <TransactionIcon description={tx.description} category={tx.category} size={18} />
                    </span>
                    <div className={styles.txInfo}>
                      <span className={styles.txDesc}>{tx.description}</span>
                      <span className={styles.txDate}>{format(tx.date, 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    <span className={styles.txBadge}>
                      {tx.type === 'expense' ? 'Fixa' : 'Receita'}
                    </span>
                    <span className={styles.txAmount}>{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {detailTab === 'limits' && (
            <div className={styles.limitSection}>
              <div>
                <div className={styles.limitLabel}>Limite atual</div>
                <div className={styles.limitValue}>
                  {catBudget > 0 ? formatCurrency(catBudget) : 'Sem limite definido'}
                </div>
              </div>
              {catBudget > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={styles.summaryBoxHint}>
                      {formatCurrency(catSpent)} gasto de {formatCurrency(catBudget)}
                    </span>
                    <span className={styles.summaryBoxHint}>{Math.round(usagePercent)}%</span>
                  </div>
                  <div className={styles.limitProgress}>
                    <div
                      className={styles.limitProgressFill}
                      style={{
                        width: `${usagePercent}%`,
                        background: usagePercent > 80 ? 'var(--color-expense)' : selectedCat.color,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Adicionar / alterar limite</label>
                <div className={styles.limitRow}>
                  <input
                    className={styles.formInput}
                    type="number"
                    placeholder="Ex: 500"
                    value={limitValue}
                    onChange={(e) => setLimitValue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className={styles.saveBtn}
                    style={{ flex: 0, padding: '12px 24px' }}
                    disabled={savingLimit}
                    onClick={handleSaveLimit}
                  >
                    {savingLimit ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'edit' && (
            <div className={styles.editSection}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Nome</label>
                <input
                  className={styles.formInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome da categoria"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Ícone</label>
                <div className={styles.emojiGrid}>
                  {ICON_OPTIONS.filter((e) => e !== '+').map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`${styles.emojiBtn} ${editIcon === emoji ? styles.emojiBtnActive : ''}`}
                      onClick={() => setEditIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Cor</label>
                <div className={styles.colorGrid}>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorBtn} ${editColor === c ? styles.colorBtnActive : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Tipo</label>
                <div className={styles.typeToggle}>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${editType === 'expense' ? styles.typeBtnActive : ''}`}
                    onClick={() => setEditType('expense')}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${editType === 'income' ? styles.typeBtnActive : ''}`}
                    onClick={() => setEditType('income')}
                  >
                    Receita
                  </button>
                </div>
              </div>
              <div className={styles.editActions}>
                <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={14} style={{ marginRight: 4 }} /> Excluir
                </button>
                <button className={styles.saveBtn} disabled={savingEdit} onClick={handleSaveEdit}>
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div className={styles.modalBackdrop} onClick={() => setShowDeleteConfirm(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <Trash2 size={20} />
                  <h3>Excluir Categoria</h3>
                </div>
                <button className={styles.modalClose} onClick={() => setShowDeleteConfirm(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Tem certeza que deseja excluir <strong>&quot;{selectedCat.name}&quot;</strong>?
                  As transações vinculadas a esta categoria não serão excluídas, mas ficarão sem categoria.
                </p>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </button>
                <button className={styles.deleteBtn} onClick={handleDelete}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== GRID VIEW =====
  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        <Tag size={22} />
        Categorias
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

      <div className={styles.headerRow}>
        <div className={styles.typeToggle}>
          {([['all', 'Todas'], ['expense', 'Despesas'], ['income', 'Receitas']] as ['all' | TransactionType, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.typeBtn} ${typeFilter === key ? styles.typeBtnActive : ''}`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className={styles.addBtn} onClick={openNewModal}>
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Tag size={40} />
          <p>Nenhuma categoria encontrada</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((cat) => {
            const stats = txCounts[cat.name] || { count: 0, total: 0 };
            return (
              <div key={cat.id} className={styles.card} onClick={() => selectCategory(cat)}>
                <div className={styles.cardStripe} style={{ background: cat.color }} />
                <div className={styles.cardIcon} style={{ background: `${cat.color}22` }}>
                  {resolveIcon(cat.icon)}
                </div>
                <div>
                  <div className={styles.cardName}>{cat.name}</div>
                  <span
                    className={`${styles.cardType} ${cat.type === 'expense' ? styles.cardTypeExpense : styles.cardTypeIncome}`}
                  >
                    {cat.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>
                <div className={styles.cardStats}>
                  <div>
                    <div className={styles.cardStatValue}>{stats.count}</div>
                    <div className={styles.cardStatLabel}>transações</div>
                  </div>
                  <div className={styles.cardBudget}>
                    <div className={styles.cardStatValue}>{formatCurrency(stats.total)}</div>
                    <div className={styles.cardStatLabel}>este mês</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <Tag size={20} />
                <h3>{editingCat ? 'Editar Categoria' : 'Adicionar Categoria'}</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Nome</label>
                <input
                  className={styles.formInput}
                  placeholder="Ex.: Pets"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.emojiPickerLabel}>Ícone</label>
                <div className={styles.emojiGrid}>
                  {ICON_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`${styles.emojiBtn} ${formIcon === emoji && !customEmoji ? styles.emojiBtnActive : ''}`}
                      onClick={() => {
                        if (emoji === '+') {
                          const input = prompt('Digite o emoji desejado:');
                          if (input) { setCustomEmoji(input); setFormIcon(''); }
                        } else {
                          setFormIcon(emoji);
                          setCustomEmoji('');
                        }
                      }}
                    >
                      {emoji === '+' ? (customEmoji || '+') : emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Cor</label>
                <div className={styles.colorGrid}>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorBtn} ${formColor === c ? styles.colorBtnActive : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFormColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Tipo</label>
                <div className={styles.typeToggle}>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${formType === 'expense' ? styles.typeBtnActive : ''}`}
                    onClick={() => setFormType('expense')}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${formType === 'income' ? styles.typeBtnActive : ''}`}
                    onClick={() => setFormType('income')}
                  >
                    Receita
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 16, borderRadius: 12,
                  background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, background: `${formColor}22`,
                  }}
                >
                  {customEmoji || formIcon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {formName || 'Nome da categoria'}
                  </div>
                  <div style={{ fontSize: 11, color: formColor, fontWeight: 600 }}>
                    {formType === 'expense' ? 'Despesa' : 'Receita'}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className={styles.saveBtn} disabled={saving} onClick={handleSaveCategory}>
                {saving ? 'Salvando...' : editingCat ? 'Salvar' : 'Criar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
