'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCreditCards,
  addCreditCard,
  deleteCreditCard,
  getTransactions,
  addTransaction,
  getCategories,
} from '@/lib/firestore';
import { parseCSV, readCSVFile, type ParsedTransaction } from '@/lib/csv-parser';
import type { CreditCard, CardBrand, Transaction, Category } from '@/types';
import {
  CreditCard as CreditCardIcon,
  Plus,
  Trash2,
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Upload,
  DollarSign,
  FileSpreadsheet,
  Check,
  Ban,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './cards.module.css';

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'MasterCard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  other: 'Outro',
};

const CARD_COLORS = [
  '#e63946', '#7b2cbf', '#f97316', '#2563eb', '#059669',
  '#1a1a2e', '#e11d48', '#0891b2', '#ca8a04', '#6d28d9',
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function BrandDisplay({ brand }: { brand: CardBrand }) {
  switch (brand) {
    case 'visa':
      return <span className={styles.cardBrandText}>VISA</span>;
    case 'mastercard':
      return (
        <svg viewBox="0 0 131.39 86.9" width="60" height="40">
          <circle cx="44.45" cy="43.45" r="43.45" fill="#eb001b" />
          <circle cx="86.94" cy="43.45" r="43.45" fill="#f79e1b" />
          <path d="M65.7 10.05a43.3 43.3 0 0 0-16.05 33.4 43.3 43.3 0 0 0 16.05 33.4 43.3 43.3 0 0 0 16.05-33.4 43.3 43.3 0 0 0-16.05-33.4z" fill="#ff5f00" />
        </svg>
      );
    case 'elo':
      return <span className={styles.cardBrandText}>elo</span>;
    case 'amex':
      return <span className={styles.cardBrandText}>AMEX</span>;
    case 'hipercard':
      return <span className={styles.cardBrandText}>HIPER</span>;
    default:
      return <CreditCardIcon size={36} />;
  }
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const EMOJI_MAP: [RegExp, string][] = [
  // Streaming & entretenimento
  [/netflix/i, '🍿'],
  [/spotify/i, '🎵'],
  [/disney/i, '🏰'],
  [/hbo|max/i, '🎬'],
  [/youtube|yt/i, '📺'],
  [/prime\s*video|amazon\s*prime/i, '📦'],
  [/twitch/i, '🎮'],
  [/apple\s*(tv|music)/i, '🍎'],
  [/deezer|tidal/i, '🎧'],
  [/steam|playstation|xbox|game/i, '🕹️'],
  [/cinema/i, '🎞️'],
  // Alimentação
  [/ifood|rappi|uber\s*eats|delivery|99\s*food/i, '🛵'],
  [/mercado|supermercado|carrefour|pão\s*de\s*açúcar|extra|atacadão|assaí|bigbox/i, '🛒'],
  [/restaurante|almoço|jantar|lanchonete|burger|pizza|sushi|churrasco/i, '🍽️'],
  [/padaria|pão|bakery|confeitaria/i, '🥐'],
  [/café|cafeteria|starbucks|coffee/i, '☕'],
  [/bar\b|cerveja|chopp|happy\s*hour/i, '🍺'],
  [/açougue|carne|frigorífico/i, '🥩'],
  [/hortifruti|verdura|feira|sacolão/i, '🥬'],
  [/doce|chocolate|sorvet/i, '🍫'],
  [/mcdonald|mc\s*donald|burger\s*king|bk|subway|kfc/i, '🍔'],
  // Transporte
  [/uber(?!\s*eats)|99\s*(?!food)|cabify|lyft|táxi|taxi/i, '🚗'],
  [/gasolina|combustível|posto|shell|ipiranga|br\b|abastec/i, '⛽'],
  [/estacionamento|parking|zona\s*azul/i, '🅿️'],
  [/pedágio|pedagio/i, '🛣️'],
  [/oficina|mecânico|borracharia|pneu/i, '🔧'],
  [/ônibus|bus|metro|metrô|trem|cptm|brt/i, '🚌'],
  [/avião|voo|gol\b|latam|azul\b|passagem\s*aér/i, '✈️'],
  // Saúde
  [/farmácia|drogaria|droga\s*raia|pague\s*menos|drogasil|remédio/i, '💊'],
  [/médico|consulta|hospital|clínica|exame|lab/i, '🏥'],
  [/dentista|odonto/i, '🦷'],
  [/academia|gym|smart\s*fit|crossfit|musculação/i, '🏋️'],
  [/psicólogo|terapia|psiquiatra/i, '🧠'],
  [/ótica|óculos|lentes/i, '👓'],
  // Casa & utilidades
  [/luz|enel|cpfl|cemig|eletricidade|energia/i, '💡'],
  [/água|sabesp|saneamento|copasa/i, '💧'],
  [/gás|comgás|ultragaz/i, '🔥'],
  [/internet|fibra|claro|vivo|tim|oi\b|wifi/i, '📡'],
  [/celular|telefone|recarga/i, '📱'],
  [/aluguel|condomínio|iptu|condominio/i, '🏠'],
  [/seguro/i, '🛡️'],
  [/limpeza|faxina|diarista/i, '🧹'],
  // Compras & varejo
  [/amazon|shopee|mercado\s*livre|magalu|magazine/i, '📦'],
  [/shein|zara|renner|c&a|riachuelo|roupa/i, '👗'],
  [/sapato|tênis|calçado/i, '👟'],
  [/pet\s*shop|vet|veterinário|ração/i, '🐾'],
  [/livraria|livro|kindle/i, '📚'],
  [/presente|gift/i, '🎁'],
  [/joia|relógio|acessório/i, '💍'],
  [/eletrônico|kabum|pichau|terabyte/i, '💻'],
  [/móveis|decoração|tok\s*stok|etna/i, '🛋️'],
  // Educação
  [/escola|faculdade|universidade|curso|aula|mensalidade/i, '🎓'],
  [/inglês|idioma|duolingo/i, '🌎'],
  [/udemy|alura|coursera/i, '💡'],
  // Lazer & viagem
  [/hotel|airbnb|booking|hosped/i, '🏨'],
  [/viagem|trip|passeio/i, '🌴'],
  [/praia/i, '🏖️'],
  [/parque|ingresso|show|teatro|evento/i, '🎪'],
  [/salão|cabelo|barbearia|barber/i, '💇'],
  [/manicure|unha|estética|skin/i, '💅'],
  // Financeiro
  [/pix|transferência|transfer/i, '💸'],
  [/saque|caixa/i, '🏧'],
  [/imposto|taxa|tarifa|anuidade|iof/i, '📋'],
  [/investimento|ação|fundo|tesouro|cripto|bitcoin/i, '📈'],
  [/assinatura|subscri/i, '🔄'],
  // Crianças
  [/brinquedo|toy/i, '🧸'],
  [/fralda|bebê|baby/i, '👶'],
];

function getTransactionEmoji(description: string, category: string): string {
  const text = `${description} ${category}`.toLowerCase();
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(text)) return emoji;
  }
  const catMap: Record<string, string> = {
    'alimentação': '🍴', 'mercado': '🛒', 'moradia': '🏠',
    'transporte': '🚗', 'saúde': '❤️', 'educação': '📖',
    'lazer': '🎯', 'utilidades': '⚡', 'vestuário': '👕',
    'outros': '📌', 'fatura': '💳',
  };
  const catLower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(catMap)) {
    if (catLower.includes(key)) return emoji;
  }
  return '💳';
}

export default function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detail view
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [cardTransactions, setCardTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);

  // Add expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingExpense, setSavingExpense] = useState(false);

  // CSV import
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCategory, setImportCategory] = useState('Fatura');
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Add card form
  const [formName, setFormName] = useState('');
  const [formDigits, setFormDigits] = useState('');
  const [formBrand, setFormBrand] = useState<CardBrand>('visa');
  const [formColor, setFormColor] = useState(CARD_COLORS[0]);
  const [formLimit, setFormLimit] = useState('');
  const [formClosing, setFormClosing] = useState('27');
  const [formDue, setFormDue] = useState('15');

  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCreditCards(user.uid);
      setCards(data);
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const loadCardTransactions = useCallback(async (card: CreditCard) => {
    if (!user) return;
    setLoadingTx(true);
    try {
      const txs = await getTransactions(user.uid, {
        month: filterMonth,
        year: filterYear,
      });
      const filtered = txs.filter(
        (t) => t.account === card.name && t.type === 'expense'
      );
      setCardTransactions(filtered);
    } catch (err) {
      console.error('Error loading card transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  }, [user, filterMonth, filterYear]);

  useEffect(() => {
    if (selectedCard) loadCardTransactions(selectedCard);
  }, [selectedCard, loadCardTransactions]);

  const monthlyTotal = useMemo(
    () => cardTransactions.reduce((sum, t) => sum + t.amount, 0),
    [cardTransactions]
  );

  const remainingLimit = selectedCard ? selectedCard.limit - monthlyTotal : 0;
  const usagePercent = selectedCard ? Math.min((monthlyTotal / selectedCard.limit) * 100, 100) : 0;

  // ===== Card CRUD =====
  const resetForm = () => {
    setFormName(''); setFormDigits(''); setFormBrand('visa');
    setFormColor(CARD_COLORS[0]); setFormLimit('');
    setFormClosing('27'); setFormDue('15'); setError('');
  };

  const handleAddCard = async () => {
    if (!user) return;
    if (!formName.trim()) { setError('Informe o nome do cartão'); return; }
    if (!formDigits.trim() || formDigits.length !== 4) { setError('Informe os 4 últimos dígitos'); return; }
    if (!formLimit.trim()) { setError('Informe o limite'); return; }
    const limitNum = parseFloat(formLimit.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(limitNum) || limitNum <= 0) { setError('Limite inválido'); return; }

    setSaving(true); setError('');
    try {
      await addCreditCard(user.uid, {
        name: formName.trim(), lastDigits: formDigits.trim(),
        brand: formBrand, color: formColor, limit: limitNum,
        closingDay: parseInt(formClosing) || 27, dueDay: parseInt(formDue) || 15,
      });
      setShowAddModal(false); resetForm(); await loadCards();
    } catch { setError('Erro ao salvar cartão'); } finally { setSaving(false); }
  };

  const handleDeleteCard = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCreditCard(deleteTarget.id);
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selectedCard?.id === deleteTarget.id) setSelectedCard(null);
      setDeleteTarget(null);
    } catch (err) { console.error('Error deleting card:', err); }
  };

  // ===== Card detail: add expense =====
  const openExpenseModal = async () => {
    if (!user) return;
    if (categories.length === 0) {
      const cats = await getCategories(user.uid);
      setCategories(cats);
    }
    setExpDesc(''); setExpAmount(''); setExpCategory(''); setExpDate(new Date().toISOString().split('T')[0]);
    setShowExpenseModal(true);
  };

  const handleAddExpense = async () => {
    if (!user || !selectedCard) return;
    if (!expDesc.trim()) { setError('Informe a descrição'); return; }
    if (!expAmount.trim()) { setError('Informe o valor'); return; }
    const amount = parseFloat(expAmount.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { setError('Valor inválido'); return; }

    setSavingExpense(true); setError('');
    try {
      await addTransaction(user.uid, {
        description: expDesc.trim(), amount, type: 'expense',
        category: expCategory || 'Outros', date: new Date(expDate),
        account: selectedCard.name,
      });
      setShowExpenseModal(false);
      setSuccess('Despesa adicionada!');
      setTimeout(() => setSuccess(''), 3000);
      loadCardTransactions(selectedCard);
    } catch { setError('Erro ao salvar despesa'); } finally { setSavingExpense(false); }
  };

  // ===== CSV import into card =====
  const handleCSVFile = async (file: File) => {
    if (!selectedCard) return;
    try {
      const content = await readCSVFile(file);
      const result = parseCSV(content);
      if (result.transactions.length === 0) {
        setError(result.errors[0] || 'Nenhuma transação encontrada no CSV');
        return;
      }
      setParsedTransactions(result.transactions);
      setParseErrors(result.errors);
      setImportCategory(selectedCard.name);
      setShowImportModal(true);
    } catch {
      setError('Erro ao ler o arquivo CSV');
    }
  };

  const handleImportTransactions = async () => {
    if (!user || !selectedCard) return;
    const selected = parsedTransactions.filter((t) => t.selected);
    if (selected.length === 0) return;
    setImporting(true);
    let imported = 0;
    try {
      for (const tx of selected) {
        await addTransaction(user.uid, {
          description: tx.description, amount: tx.amount, type: tx.type,
          category: importCategory, date: new Date(tx.date),
          account: selectedCard.name,
        });
        imported++;
      }
      setSuccess(`${imported} transações importadas para ${selectedCard.name}!`);
      setShowImportModal(false); setParsedTransactions([]); setParseErrors([]);
      setTimeout(() => setSuccess(''), 5000);
      loadCardTransactions(selectedCard);
    } catch { setError('Erro ao importar transações'); } finally { setImporting(false); }
  };

  const toggleTx = (id: string) => setParsedTransactions((p) => p.map((t) => t.id === id ? { ...t, selected: !t.selected } : t));
  const toggleAllTx = () => {
    const all = parsedTransactions.every((t) => t.selected);
    setParsedTransactions((p) => p.map((t) => ({ ...t, selected: !all })));
  };

  const selectedCount = parsedTransactions.filter((t) => t.selected).length;
  const selectedTotal = parsedTransactions.filter((t) => t.selected).reduce((s, t) => s + (t.type === 'expense' ? t.amount : -t.amount), 0);
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // ===== DETAIL VIEW =====
  if (selectedCard) {
    return (
      <div className={styles.page}>
        {/* Messages */}
        {error && <div className={styles.errorMsg}><AlertCircle size={16} />{error}<button onClick={() => setError('')} className={styles.msgClose}><X size={14} /></button></div>}
        {success && <div className={styles.successMsg}><CheckCircle size={16} />{success}</div>}

        {/* Back + Card mini header */}
        <div className={styles.detailHeader}>
          <button className={styles.backBtn} onClick={() => setSelectedCard(null)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className={styles.detailCardMini} style={{ background: selectedCard.color }}>
            <div className={styles.detailCardBrand}><BrandDisplay brand={selectedCard.brand} /></div>
            <div className={styles.detailCardInfo}>
              <span className={styles.detailCardName}>{selectedCard.name}</span>
              <span className={styles.detailCardDigits}>Final {selectedCard.lastDigits} — {BRAND_LABELS[selectedCard.brand]}</span>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>Resumo</h3>
          <div className={styles.summaryCards}>
            <div className={styles.summaryBox}>
              <span className={styles.summaryBoxLabel}>Valor Mensal</span>
              <span className={styles.summaryBoxValue}>{formatCurrency(monthlyTotal)}</span>
              <span className={styles.summaryBoxHint}>Somatório das despesas lançadas</span>
            </div>
            <div className={styles.summaryBox}>
              <span className={styles.summaryBoxLabel}>Limite Restante</span>
              <span className={`${styles.summaryBoxValue} ${remainingLimit < 0 ? styles.valueNegative : styles.valuePositive}`}>
                {formatCurrency(remainingLimit)}
              </span>
              <span className={styles.summaryBoxHint}>Subtração das despesas lançadas</span>
            </div>
          </div>
          <div className={styles.usageBar}>
            <div className={styles.usageBarFill} style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? 'var(--color-expense)' : 'var(--gradient-primary)' }} />
          </div>
          <div className={styles.usageLabel}>
            <span>{usagePercent.toFixed(0)}% utilizado</span>
            <span>Limite: {formatCurrency(selectedCard.limit)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.detailActions}>
          <button className={styles.actionBtnPrimary} onClick={openExpenseModal}>
            <Plus size={16} /> Nova Despesa
          </button>
          <button className={styles.actionBtnSecondary} onClick={() => csvInputRef.current?.click()}>
            <Upload size={16} /> Importar CSV
          </button>
          <input
            ref={csvInputRef} type="file" accept=".csv"
            className={styles.hiddenInput}
            onChange={(e) => { if (e.target.files?.[0]) handleCSVFile(e.target.files[0]); e.target.value = ''; }}
          />
        </div>

        {/* Extrato */}
        <div className={styles.extratoSection}>
          <div className={styles.extratoHeader}>
            <h3 className={styles.sectionTitle}>Extrato</h3>
            <div className={styles.periodFilter}>
              <button className={styles.periodBtn} onClick={() => setShowPeriodFilter(!showPeriodFilter)}>
                {MONTHS[filterMonth]} {filterYear} <ChevronDown size={14} />
              </button>
              {showPeriodFilter && (
                <div className={styles.periodDropdown}>
                  <div className={styles.periodRow}>
                    <select className={styles.periodSelect} value={filterMonth} onChange={(e) => { setFilterMonth(Number(e.target.value)); setShowPeriodFilter(false); }}>
                      {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className={styles.periodSelect} value={filterYear} onChange={(e) => { setFilterYear(Number(e.target.value)); setShowPeriodFilter(false); }}>
                      {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loadingTx ? (
            <div className={styles.loadingState}>{[1,2,3].map((i) => <div key={i} className={styles.skeletonRow} />)}</div>
          ) : cardTransactions.length === 0 ? (
            <div className={styles.emptyExtrato}>
              <DollarSign size={32} />
              <p>Nenhuma despesa em {MONTHS[filterMonth]} {filterYear}</p>
            </div>
          ) : (
            <div className={styles.extratoList}>
              {cardTransactions.map((tx) => (
                <div key={tx.id} className={styles.extratoItem}>
                  <div className={styles.extratoEmoji}>{getTransactionEmoji(tx.description, tx.category)}</div>
                  <div className={styles.extratoInfo}>
                    <span className={styles.extratoDesc}>{tx.description}</span>
                    <span className={styles.extratoAmount}>{formatCurrency(tx.amount)}</span>
                  </div>
                  <span className={styles.extratoDate}>
                    {tx.date ? format(new Date(tx.date), 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Expense Modal */}
        {showExpenseModal && (
          <div className={styles.modalBackdrop} onClick={() => setShowExpenseModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}><DollarSign size={20} /><h3>Nova Despesa — {selectedCard.name}</h3></div>
                <button onClick={() => setShowExpenseModal(false)} className={styles.modalClose}><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                {error && <div className={styles.inlineError}><AlertCircle size={14} /> {error}</div>}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Descrição</label>
                  <input type="text" className={styles.formInput} placeholder="Ex: Netflix, Mercado..." value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Valor</label>
                    <input type="text" className={styles.formInput} placeholder="R$ 0,00" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Data</label>
                    <input type="date" className={styles.formInput} value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Categoria</label>
                  <select className={styles.formSelect} value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {expenseCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowExpenseModal(false)} className={styles.cancelBtn}>Cancelar</button>
                <button onClick={handleAddExpense} disabled={savingExpense} className={styles.saveBtn}>
                  {savingExpense ? 'Salvando...' : 'Adicionar Despesa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {showImportModal && (
          <div className={styles.modalBackdrop} onClick={() => setShowImportModal(false)}>
            <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}><FileSpreadsheet size={20} /><h3>Importar Fatura — {selectedCard.name}</h3></div>
                <button onClick={() => setShowImportModal(false)} className={styles.modalClose}><X size={18} /></button>
              </div>
              {parseErrors.length > 0 && (
                <div className={styles.parseWarnings}><AlertCircle size={14} /><span>{parseErrors.length} linha(s) ignorada(s)</span></div>
              )}
              <div className={styles.importSummary}>
                <div className={styles.importSummaryItem}><span className={styles.importSummaryLabel}>Encontradas</span><span className={styles.importSummaryValue}>{parsedTransactions.length}</span></div>
                <div className={styles.importSummaryItem}><span className={styles.importSummaryLabel}>Selecionadas</span><span className={styles.importSummaryValue}>{selectedCount}</span></div>
                <div className={styles.importSummaryItem}><span className={styles.importSummaryLabel}>Total</span><span className={`${styles.importSummaryValue} ${styles.valueNegative}`}>{formatCurrency(selectedTotal)}</span></div>
              </div>
              <div className={styles.importCategoryField}>
                <label>Categoria:</label>
                <input type="text" value={importCategory} onChange={(e) => setImportCategory(e.target.value)} className={styles.formInput} placeholder="Ex: Fatura Nubank" />
              </div>
              <div className={styles.selectAllRow}>
                <button onClick={toggleAllTx} className={styles.selectAllBtn}>
                  {parsedTransactions.every((t) => t.selected) ? <><Ban size={14} /> Desmarcar todas</> : <><Check size={14} /> Selecionar todas</>}
                </button>
              </div>
              <div className={styles.importTxList}>
                {parsedTransactions.map((tx) => (
                  <div key={tx.id} className={`${styles.importTxRow} ${tx.selected ? styles.importTxSelected : ''}`} onClick={() => toggleTx(tx.id)}>
                    <div className={styles.importTxCheck}>{tx.selected && <Check size={14} />}</div>
                    <div className={styles.importTxInfo}>
                      <span className={styles.importTxDesc}>{tx.description}</span>
                      <span className={styles.importTxDate}>{format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                    </div>
                    <span className={`${styles.importTxAmount} ${tx.type === 'expense' ? styles.valueNegative : styles.valuePositive}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowImportModal(false)} className={styles.cancelBtn}>Cancelar</button>
                <button onClick={handleImportTransactions} disabled={importing || selectedCount === 0} className={styles.saveBtn}>
                  {importing ? 'Importando...' : `Importar ${selectedCount} transações`}
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
      {error && <div className={styles.errorMsg}><AlertCircle size={16} />{error}<button onClick={() => setError('')} className={styles.msgClose}><X size={14} /></button></div>}
      {success && <div className={styles.successMsg}><CheckCircle size={16} />{success}</div>}

      <h2 className={styles.pageTitle}>
        <CreditCardIcon size={22} />
        Cartões de Crédito
      </h2>

      {loading ? (
        <div className={styles.loadingGrid}>{[1,2,3].map((i) => <div key={i} className={styles.skeleton} />)}</div>
      ) : cards.length === 0 && !showAddModal ? (
        <div className={styles.emptyState}>
          <CreditCardIcon size={48} />
          <p>Nenhum cartão cadastrado ainda. Adicione seu primeiro cartão de crédito.</p>
          <button className={styles.emptyBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Adicionar Cartão
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div key={card.id} className={styles.cardItem} onClick={() => setSelectedCard(card)}>
              <div className={styles.cardVisual} style={{ background: card.color }}>
                <button className={styles.cardDeleteBtn} onClick={(e) => { e.stopPropagation(); setDeleteTarget(card); }} aria-label="Excluir cartão">
                  <Trash2 size={14} />
                </button>
                <div className={styles.cardBrandLogo}><BrandDisplay brand={card.brand} /></div>
                <span className={styles.cardVisualName}>{card.name}</span>
              </div>
              <div className={styles.cardDetails}>
                <div className={styles.cardNameRow}>
                  <span className={styles.cardName}>{card.name}</span>
                  <span className={styles.cardDigits}>Final {card.lastDigits} — {BRAND_LABELS[card.brand]}</span>
                </div>
                <div className={styles.cardLimit}>
                  <span className={styles.cardLimitLabel}>Limite:</span>
                  <span className={styles.cardLimitValue}>{formatCurrency(card.limit)}</span>
                </div>
                <div className={styles.cardDates}>
                  <div className={styles.cardDateRow}><Calendar size={13} /><span>Fechamento: {card.closingDay}</span></div>
                  <div className={styles.cardDateRow}><Calendar size={13} /><span>Vencimento: {card.dueDay}</span></div>
                </div>
              </div>
            </div>
          ))}
          <button className={styles.addCardBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={32} /><span>Adicionar Cartão</span>
          </button>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddModal && (
        <div className={styles.modalBackdrop} onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}><CreditCardIcon size={20} /><h3>Novo Cartão</h3></div>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className={styles.modalClose}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.inlineError}><AlertCircle size={14} /> {error}</div>}
              <div className={styles.formField}><label className={styles.formLabel}>Nome do Cartão</label><input type="text" className={styles.formInput} placeholder="Ex: Nubank, Itaú Azul..." value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
              <div className={styles.formRow}>
                <div className={styles.formField}><label className={styles.formLabel}>Últimos 4 dígitos</label><input type="text" className={styles.formInput} placeholder="0000" maxLength={4} value={formDigits} onChange={(e) => setFormDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>
                <div className={styles.formField}><label className={styles.formLabel}>Bandeira</label><select className={styles.formSelect} value={formBrand} onChange={(e) => setFormBrand(e.target.value as CardBrand)}>{Object.entries(BRAND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              </div>
              <div className={styles.formField}><label className={styles.formLabel}>Limite</label><input type="text" className={styles.formInput} placeholder="R$ 5.000,00" value={formLimit} onChange={(e) => setFormLimit(e.target.value)} /></div>
              <div className={styles.formRow}>
                <div className={styles.formField}><label className={styles.formLabel}>Dia do Fechamento</label><select className={styles.formSelect} value={formClosing} onChange={(e) => setFormClosing(e.target.value)}>{dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                <div className={styles.formField}><label className={styles.formLabel}>Dia do Vencimento</label><select className={styles.formSelect} value={formDue} onChange={(e) => setFormDue(e.target.value)}>{dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Cor do Cartão</label>
                <div className={styles.colorOptions}>{CARD_COLORS.map((c) => <button key={c} type="button" className={`${styles.colorOption} ${formColor === c ? styles.colorOptionActive : ''}`} style={{ background: c }} onClick={() => setFormColor(c)} />)}</div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className={styles.cancelBtn}>Cancelar</button>
              <button onClick={handleAddCard} disabled={saving} className={styles.saveBtn}>{saving ? 'Salvando...' : 'Adicionar Cartão'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className={styles.modalBackdrop} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalHeaderLeft}><Trash2 size={20} /><h3>Excluir Cartão</h3></div><button onClick={() => setDeleteTarget(null)} className={styles.modalClose}><X size={18} /></button></div>
            <p className={styles.confirmText}>Tem certeza que deseja excluir o cartão <strong>{deleteTarget.name}</strong> (final {deleteTarget.lastDigits})? Esta ação não pode ser desfeita.</p>
            <div className={styles.modalActions}><button onClick={() => setDeleteTarget(null)} className={styles.cancelBtn}>Cancelar</button><button onClick={handleDeleteCard} className={styles.deleteConfirmBtn}>Excluir Cartão</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
