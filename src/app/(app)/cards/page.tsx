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
  getPeople,
} from '@/lib/firestore';
import { parseCSV, readCSVFile, type ParsedTransaction } from '@/lib/csv-parser';
import {
  uploadInvoiceFile,
  saveInvoice,
  getInvoices,
  deleteInvoice,
  formatFileSize,
  isValidInvoiceFile,
  type Invoice,
} from '@/lib/storage';
import TransactionIcon from '@/components/TransactionIcon';
import CurrencyInput, { parseCurrency } from '@/components/CurrencyInput';
import Toast from '@/components/Toast';
import type { CreditCard, CardBrand, Transaction, Category } from '@/types';
import {
  CreditCard as CreditCardIcon,
  Plus,
  Trash2,
  X,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Upload,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Download,
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

interface CardTemplate {
  name: string;
  brand: CardBrand;
  color: string;
}

const BRAZILIAN_CARDS: CardTemplate[] = [
  // Nubank
  { name: 'Nubank', brand: 'mastercard', color: '#7b2cbf' },
  { name: 'Nubank Ultravioleta', brand: 'mastercard', color: '#1a1a2e' },
  // Itaú
  { name: 'Itaú Personnalité', brand: 'visa', color: '#f97316' },
  { name: 'Itaú Uniclass', brand: 'visa', color: '#1a1a2e' },
  { name: 'Itaú Click', brand: 'visa', color: '#f97316' },
  { name: 'Itaú Azul', brand: 'visa', color: '#2563eb' },
  { name: 'Itaú Platinum', brand: 'visa', color: '#64748b' },
  { name: 'Itaú Black', brand: 'visa', color: '#1a1a2e' },
  { name: 'Itaú Pão de Açúcar', brand: 'visa', color: '#e63946' },
  // Bradesco
  { name: 'Bradesco Aeternum', brand: 'visa', color: '#e11d48' },
  { name: 'Bradesco Elo', brand: 'elo', color: '#e11d48' },
  { name: 'Bradesco Platinum', brand: 'visa', color: '#64748b' },
  { name: 'Bradesco Gold', brand: 'visa', color: '#ca8a04' },
  { name: 'Bradesco Prime', brand: 'visa', color: '#e11d48' },
  { name: 'Bradesco Neo', brand: 'visa', color: '#2563eb' },
  // Santander
  { name: 'Santander Free', brand: 'mastercard', color: '#e63946' },
  { name: 'Santander Elite', brand: 'mastercard', color: '#e63946' },
  { name: 'Santander Unlimited', brand: 'visa', color: '#1a1a2e' },
  { name: 'Santander SX', brand: 'mastercard', color: '#e63946' },
  { name: 'Santander Unique', brand: 'visa', color: '#e63946' },
  // Banco do Brasil
  { name: 'BB Ourocard', brand: 'visa', color: '#ca8a04' },
  { name: 'BB Ourocard Platinum', brand: 'visa', color: '#64748b' },
  { name: 'BB Estilo', brand: 'visa', color: '#ca8a04' },
  { name: 'BB Altus', brand: 'visa', color: '#1a1a2e' },
  { name: 'BB Elo', brand: 'elo', color: '#ca8a04' },
  // Caixa
  { name: 'Caixa Elo', brand: 'elo', color: '#0891b2' },
  { name: 'Caixa Visa', brand: 'visa', color: '#0891b2' },
  { name: 'Caixa Mastercard', brand: 'mastercard', color: '#0891b2' },
  // Inter
  { name: 'Inter Black', brand: 'mastercard', color: '#1a1a2e' },
  { name: 'Inter Gold', brand: 'mastercard', color: '#ca8a04' },
  { name: 'Inter Platinum', brand: 'mastercard', color: '#64748b' },
  { name: 'Inter', brand: 'mastercard', color: '#f97316' },
  // C6 Bank
  { name: 'C6 Bank Carbon', brand: 'mastercard', color: '#1a1a2e' },
  { name: 'C6 Bank', brand: 'mastercard', color: '#1a1a2e' },
  // XP
  { name: 'XP Visa Infinite', brand: 'visa', color: '#1a1a2e' },
  { name: 'XP Visa', brand: 'visa', color: '#1a1a2e' },
  // BTG
  { name: 'BTG Pactual', brand: 'mastercard', color: '#1a1a2e' },
  // PicPay
  { name: 'PicPay', brand: 'mastercard', color: '#059669' },
  // PagBank
  { name: 'PagBank', brand: 'visa', color: '#059669' },
  // Mercado Pago
  { name: 'Mercado Pago', brand: 'visa', color: '#2563eb' },
  // Original
  { name: 'Banco Original', brand: 'mastercard', color: '#059669' },
  // Pan
  { name: 'Banco Pan', brand: 'mastercard', color: '#2563eb' },
  // Neon
  { name: 'Neon', brand: 'visa', color: '#0891b2' },
  // Next
  { name: 'Next', brand: 'visa', color: '#059669' },
  // Digio
  { name: 'Digio', brand: 'visa', color: '#2563eb' },
  // Will Bank
  { name: 'Will Bank', brand: 'mastercard', color: '#ca8a04' },
  // Credicard
  { name: 'Credicard ON', brand: 'mastercard', color: '#059669' },
  { name: 'Credicard Zero', brand: 'mastercard', color: '#059669' },
  { name: 'Credicard Platinum', brand: 'mastercard', color: '#64748b' },
  // Porto Seguro
  { name: 'Porto Seguro Visa', brand: 'visa', color: '#2563eb' },
  // Sicredi
  { name: 'Sicredi', brand: 'visa', color: '#059669' },
  // Sicoob
  { name: 'Sicoob', brand: 'visa', color: '#059669' },
  // Banrisul
  { name: 'Banrisul', brand: 'mastercard', color: '#2563eb' },
  // BMG
  { name: 'BMG', brand: 'mastercard', color: '#f97316' },
  // Riachuelo
  { name: 'Riachuelo', brand: 'mastercard', color: '#1a1a2e' },
  // Renner
  { name: 'Renner', brand: 'mastercard', color: '#e63946' },
  // Casas Bahia
  { name: 'Casas Bahia', brand: 'mastercard', color: '#2563eb' },
  // Magazine Luiza
  { name: 'Magalu', brand: 'mastercard', color: '#2563eb' },
  // Pernambucanas
  { name: 'Pernambucanas', brand: 'visa', color: '#e63946' },
  // Samsung
  { name: 'Samsung Itaucard', brand: 'visa', color: '#1a1a2e' },
  // Latam
  { name: 'Latam Pass Itaucard', brand: 'visa', color: '#2563eb' },
  // Smiles
  { name: 'Smiles GOL', brand: 'visa', color: '#f97316' },
  // Azul
  { name: 'Azul Itaucard', brand: 'visa', color: '#2563eb' },
  // Amazon
  { name: 'Amazon Bradesco', brand: 'visa', color: '#1a1a2e' },
  // Rappi
  { name: 'RappiCard', brand: 'visa', color: '#f97316' },
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
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expPerson, setExpPerson] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // CSV import
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCategory, setImportCategory] = useState('Fatura');
  const [importPerson, setImportPerson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF upload & invoices
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cardInvoices, setCardInvoices] = useState<Invoice[]>([]);

  // Add card form
  const [formName, setFormName] = useState('');
  const [formDigits, setFormDigits] = useState('');
  const [formBrand, setFormBrand] = useState<CardBrand>('visa');
  const [formColor, setFormColor] = useState(CARD_COLORS[0]);
  const [formLimit, setFormLimit] = useState('');
  const [formClosing, setFormClosing] = useState('27');
  const [formDue, setFormDue] = useState('15');
  const [cardSearch, setCardSearch] = useState('');
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const cardSearchRef = useRef<HTMLDivElement>(null);

  const filteredCardTemplates = useMemo(() => {
    if (!cardSearch.trim()) return BRAZILIAN_CARDS;
    const q = cardSearch.toLowerCase();
    return BRAZILIAN_CARDS.filter((c) => c.name.toLowerCase().includes(q));
  }, [cardSearch]);

  const selectCardTemplate = (tpl: CardTemplate) => {
    setFormName(tpl.name);
    setFormBrand(tpl.brand);
    setFormColor(tpl.color);
    setCardSearch(tpl.name);
    setShowCardDropdown(false);
  };

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardSearchRef.current && !cardSearchRef.current.contains(e.target as Node)) {
        setShowCardDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setCardSearch(''); setShowCardDropdown(false);
  };

  const handleAddCard = async () => {
    if (!user) return;
    if (!formName.trim()) { setError('Informe o nome do cartão'); return; }
    if (!formDigits.trim() || formDigits.length !== 4) { setError('Informe os 4 últimos dígitos'); return; }
    if (!formLimit.trim()) { setError('Informe o limite'); return; }
    const limitNum = parseCurrency(formLimit);
    if (limitNum <= 0) { setError('Limite inválido'); return; }

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
    if (people.length === 0) {
      const ppl = await getPeople(user.uid);
      setPeople(ppl);
    }
    setExpDesc(''); setExpAmount(''); setExpCategory(''); setExpDate(new Date().toISOString().split('T')[0]); setExpPerson('');
    setShowExpenseModal(true);
  };

  const handleAddExpense = async () => {
    if (!user || !selectedCard) return;
    if (!expDesc.trim()) { setError('Informe a descrição'); return; }
    if (!expAmount.trim()) { setError('Informe o valor'); return; }
    const amount = parseCurrency(expAmount);
    if (amount <= 0) { setError('Valor inválido'); return; }

    setSavingExpense(true); setError('');
    try {
      await addTransaction(user.uid, {
        description: expDesc.trim(), amount, type: 'expense',
        category: expCategory || 'Outros', date: new Date(expDate),
        account: selectedCard.name,
        ...(expPerson ? { person: expPerson } : {}),
      });
      setShowExpenseModal(false);
      setSuccess('Despesa adicionada!');
      setTimeout(() => setSuccess(''), 3000);
      loadCardTransactions(selectedCard);
    } catch { setError('Erro ao salvar despesa'); } finally { setSavingExpense(false); }
  };

  // ===== Load invoices for selected card =====
  const loadCardInvoices = useCallback(async () => {
    if (!user || !selectedCard) return;
    try {
      const all = await getInvoices(user.uid);
      setCardInvoices(all.filter((inv) => inv.cardName === selectedCard.name));
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  }, [user, selectedCard]);

  useEffect(() => {
    if (selectedCard) loadCardInvoices();
  }, [selectedCard, loadCardInvoices]);

  // ===== Unified file upload (PDF or CSV) =====
  const handleFileUpload = async (file: File) => {
    if (!user || !selectedCard) return;

    const validation = isValidInvoiceFile(file);
    if (!validation.valid) { setError(validation.error || 'Arquivo inválido'); return; }

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
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
        setImportPerson('');
        if (people.length === 0) {
          const ppl = await getPeople(user.uid);
          setPeople(ppl);
        }
        setShowImportModal(true);
      } catch { setError('Erro ao ler o arquivo CSV'); }
      return;
    }

    setError(''); setUploading(true); setUploadProgress(0);
    try {
      const now = new Date();
      const { url, storagePath } = await uploadInvoiceFile(
        user.uid, file, (p) => setUploadProgress(p)
      );
      await saveInvoice(user.uid, {
        fileName: file.name, fileUrl: url, storagePath,
        fileSize: file.size, fileType: file.type,
        cardName: selectedCard.name,
        month: filterMonth, year: filterYear,
      });
      setSuccess('Fatura enviada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
      loadCardInvoices();
    } catch { setError('Erro ao enviar fatura.'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    try {
      await deleteInvoice(inv.id, inv.storagePath);
      setCardInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err) { console.error('Error deleting invoice:', err); }
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
          ...(importPerson ? { person: importPerson } : {}),
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
        <Toast type="error" message={error} onClose={() => setError('')} duration={0} />
        <Toast type="success" message={success} onClose={() => setSuccess('')} />

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
          <button className={styles.actionBtnSecondary} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={16} /> {uploading ? `${Math.round(uploadProgress)}%` : 'Importar Fatura'}
          </button>
          <input
            ref={fileInputRef} type="file" accept=".pdf,.csv"
            className={styles.hiddenInput}
            onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }}
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
                  <div className={styles.extratoEmoji}><TransactionIcon description={tx.description} category={tx.category} size={18} /></div>
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

        {/* Faturas Enviadas */}
        {cardInvoices.length > 0 && (
          <div className={styles.invoicesSection}>
            <h3 className={styles.sectionTitle}>Faturas Enviadas</h3>
            <div className={styles.invoicesList}>
              {cardInvoices.map((inv) => (
                <div key={inv.id} className={styles.invoiceRow}>
                  <div className={styles.invoiceFileIcon}>{inv.fileType === 'application/pdf' ? '📄' : '📊'}</div>
                  <div className={styles.invoiceFileInfo}>
                    <span className={styles.invoiceFileName}>{inv.fileName}</span>
                    <span className={styles.invoiceFileMeta}>
                      {MONTHS[inv.month]} {inv.year} · {formatFileSize(inv.fileSize)}
                    </span>
                  </div>
                  <div className={styles.invoiceFileActions}>
                    <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.invoiceActionBtn} aria-label="Abrir fatura">
                      <Download size={15} />
                    </a>
                    <button onClick={() => handleDeleteInvoice(inv)} className={`${styles.invoiceActionBtn} ${styles.invoiceDeleteBtn}`} aria-label="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <CurrencyInput className={styles.formInput} value={expAmount} onChange={(masked) => setExpAmount(masked)} />
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
                {people.length > 0 && (
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Pessoa (opcional)</label>
                    <select className={styles.formSelect} value={expPerson} onChange={(e) => setExpPerson(e.target.value)}>
                      <option value="">Sem pessoa</option>
                      {people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                )}
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
              {people.length > 0 && (
                <div className={styles.importCategoryField}>
                  <label>Pessoa:</label>
                  <select className={styles.formSelect} value={importPerson} onChange={(e) => setImportPerson(e.target.value)}>
                    <option value="">Sem pessoa</option>
                    {people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              )}
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
      <Toast type="error" message={error} onClose={() => setError('')} duration={0} />
      <Toast type="success" message={success} onClose={() => setSuccess('')} />

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
              <div className={styles.formField} ref={cardSearchRef}>
                <label className={styles.formLabel}>Nome do Cartão</label>
                <div className={styles.comboboxWrapper}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Pesquisar cartão... Ex: Nubank, Itaú..."
                    value={cardSearch}
                    onChange={(e) => {
                      setCardSearch(e.target.value);
                      setFormName(e.target.value);
                      setShowCardDropdown(true);
                    }}
                    onFocus={() => setShowCardDropdown(true)}
                  />
                  {showCardDropdown && (
                    <div className={styles.comboboxDropdown}>
                      {cardSearch.trim() && (
                        <button
                          type="button"
                          className={`${styles.comboboxItem} ${styles.comboboxCustom}`}
                          onClick={() => {
                            setFormName(cardSearch.trim());
                            setShowCardDropdown(false);
                          }}
                        >
                          <Plus size={14} />
                          <span className={styles.comboboxName}>
                            Adicionar &quot;{cardSearch.trim()}&quot; manualmente
                          </span>
                        </button>
                      )}
                      {filteredCardTemplates.map((tpl, i) => (
                        <button
                          key={`${tpl.name}-${i}`}
                          type="button"
                          className={styles.comboboxItem}
                          onClick={() => selectCardTemplate(tpl)}
                        >
                          <span className={styles.comboboxDot} style={{ background: tpl.color }} />
                          <span className={styles.comboboxName}>{tpl.name}</span>
                          <span className={styles.comboboxBrand}>{BRAND_LABELS[tpl.brand]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}><label className={styles.formLabel}>Últimos 4 dígitos</label><input type="text" className={styles.formInput} placeholder="0000" maxLength={4} value={formDigits} onChange={(e) => setFormDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>
                <div className={styles.formField}><label className={styles.formLabel}>Bandeira</label><select className={styles.formSelect} value={formBrand} onChange={(e) => setFormBrand(e.target.value as CardBrand)}>{Object.entries(BRAND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              </div>
              <div className={styles.formField}><label className={styles.formLabel}>Limite</label><CurrencyInput className={styles.formInput} value={formLimit} onChange={(masked) => setFormLimit(masked)} /></div>
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
