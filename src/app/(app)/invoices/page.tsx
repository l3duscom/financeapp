'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadInvoiceFile,
  saveInvoice,
  getInvoices,
  deleteInvoice,
  formatFileSize,
  isValidInvoiceFile,
  type Invoice,
} from '@/lib/storage';
import { addTransaction, getCreditCards } from '@/lib/firestore';
import { parseCSV, readCSVFile, type ParsedTransaction } from '@/lib/csv-parser';
import type { CreditCard as CreditCardType } from '@/types';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  FileSpreadsheet,
  Check,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './invoices.module.css';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import state
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCategory, setImportCategory] = useState('Fatura');

  // Credit cards for selection
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);

  const loadInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getInvoices(user.uid);
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCreditCards = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getCreditCards(user.uid);
      setCreditCards(data);
    } catch (err) {
      console.error('Error loading credit cards:', err);
    }
  }, [user]);

  useEffect(() => {
    loadInvoices();
    loadCreditCards();
  }, [loadInvoices, loadCreditCards]);

  const handleUpload = async (file: File) => {
    if (!user) return;

    const validation = isValidInvoiceFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido');
      return;
    }

    if (!cardName.trim()) {
      setError('Informe o nome do cartão');
      return;
    }

    // If CSV, parse and show import modal
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      try {
        const content = await readCSVFile(file);
        const result = parseCSV(content);

        if (result.transactions.length === 0) {
          setError(result.errors.length > 0
            ? result.errors[0]
            : 'Nenhuma transação encontrada no arquivo');
          return;
        }

        setParsedTransactions(result.transactions);
        setParseErrors(result.errors);
        setImportCategory(cardName.trim());
        setShowImportModal(true);
      } catch (err) {
        console.error('CSV parse error:', err);
        setError('Erro ao ler o arquivo CSV');
      }
      return;
    }

    // For PDF, just upload normally
    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const { url, storagePath } = await uploadInvoiceFile(
        user.uid,
        file,
        (progress) => setUploadProgress(progress)
      );

      await saveInvoice(user.uid, {
        fileName: file.name,
        fileUrl: url,
        storagePath,
        fileSize: file.size,
        fileType: file.type,
        cardName: cardName.trim(),
        month: selectedMonth,
        year: selectedYear,
      });

      setSuccess('Fatura enviada com sucesso!');
      setCardName('');
      await loadInvoices();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erro ao enviar fatura. Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImportTransactions = async () => {
    if (!user) return;
    const selected = parsedTransactions.filter((t) => t.selected);
    if (selected.length === 0) return;

    setImporting(true);
    let imported = 0;

    try {
      for (const tx of selected) {
        await addTransaction(user.uid, {
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          category: importCategory,
          date: new Date(tx.date),
          account: cardName.trim() || 'Cartão',
        });
        imported++;
      }

      setSuccess(`${imported} transações importadas com sucesso!`);
      setShowImportModal(false);
      setParsedTransactions([]);
      setParseErrors([]);
      setCardName('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Import error:', err);
      setError('Erro ao importar transações');
    } finally {
      setImporting(false);
    }
  };

  const toggleTransaction = (id: string) => {
    setParsedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleAll = () => {
    const allSelected = parsedTransactions.every((t) => t.selected);
    setParsedTransactions((prev) =>
      prev.map((t) => ({ ...t, selected: !allSelected }))
    );
  };

  const handleDelete = async (invoice: Invoice) => {
    try {
      await deleteInvoice(invoice.id, invoice.storagePath);
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') return '📄';
    if (fileType === 'text/csv') return '📊';
    return '📁';
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const selectedCount = parsedTransactions.filter((t) => t.selected).length;
  const selectedTotal = parsedTransactions
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0);

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        <CreditCard size={22} />
        Faturas de Cartão
      </h2>

      {/* Messages */}
      {error && (
        <div className={styles.errorMsg}>
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')} className={styles.msgClose}>
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className={styles.successMsg}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Upload Section */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadFields}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cartão</label>
              {creditCards.length > 0 ? (
                <select
                  className={styles.fieldSelect}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                >
                  <option value="">Selecione o cartão...</option>
                  {creditCards.map((cc) => (
                    <option key={cc.id} value={cc.name}>
                      {cc.name} (final {cc.lastDigits})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ex: Nubank, Itaú..."
                  className={styles.fieldInput}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Mês</label>
              <select
                className={styles.fieldSelect}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Ano</label>
              <select
                className={styles.fieldSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''} ${uploading ? styles.dropZoneUploading : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv"
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />

          {uploading ? (
            <div className={styles.progressWrapper}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className={styles.progressText}>
                {Math.round(uploadProgress)}%
              </span>
            </div>
          ) : (
            <>
              <Upload size={32} className={styles.uploadIcon} />
              <p className={styles.dropText}>
                Arraste a fatura aqui ou <span>clique para selecionar</span>
              </p>
              <p className={styles.dropHint}>PDF ou CSV · Máx 10MB · CSV importa transações automaticamente</p>
            </>
          )}
        </div>
      </div>

      {/* Invoice List */}
      <div className={styles.listSection}>
        <h3 className={styles.listTitle}>Faturas enviadas</h3>

        {loading ? (
          <div className={styles.loadingState}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={40} />
            <p>Nenhuma fatura enviada ainda</p>
          </div>
        ) : (
          <div className={styles.invoiceList}>
            {invoices.map((inv) => (
              <div key={inv.id} className={styles.invoiceItem}>
                <div className={styles.invoiceIcon}>
                  {getFileIcon(inv.fileType)}
                </div>
                <div className={styles.invoiceInfo}>
                  <span className={styles.invoiceName}>{inv.cardName}</span>
                  <span className={styles.invoiceMeta}>
                    {MONTHS[inv.month]} {inv.year} · {formatFileSize(inv.fileSize)}
                    {inv.uploadedAt && (
                      <> · {format(new Date(inv.uploadedAt), 'dd/MM/yy', { locale: ptBR })}</>
                    )}
                  </span>
                </div>
                <div className={styles.invoiceActions}>
                  <a
                    href={inv.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionBtn}
                    aria-label="Abrir fatura"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(inv)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    aria-label="Excluir fatura"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowImportModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <FileSpreadsheet size={20} />
                <h3>Importar Transações do CSV</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className={styles.modalClose}>
                <X size={18} />
              </button>
            </div>

            {parseErrors.length > 0 && (
              <div className={styles.parseWarnings}>
                <AlertCircle size={14} />
                <span>{parseErrors.length} linha(s) ignorada(s) por formato inválido</span>
              </div>
            )}

            <div className={styles.modalSummary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Transações encontradas</span>
                <span className={styles.summaryValue}>{parsedTransactions.length}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Selecionadas</span>
                <span className={styles.summaryValue}>{selectedCount}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total selecionado</span>
                <span className={`${styles.summaryValue} ${styles.summaryExpense}`}>
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
            </div>

            <div className={styles.modalField}>
              <label>Categoria para importação:</label>
              <input
                type="text"
                value={importCategory}
                onChange={(e) => setImportCategory(e.target.value)}
                className={styles.fieldInput}
                placeholder="Ex: Fatura Nubank"
              />
            </div>

            <div className={styles.selectAllRow}>
              <button onClick={toggleAll} className={styles.selectAllBtn}>
                {parsedTransactions.every((t) => t.selected) ? (
                  <><Ban size={14} /> Desmarcar todas</>
                ) : (
                  <><Check size={14} /> Selecionar todas</>
                )}
              </button>
            </div>

            <div className={styles.transactionsList}>
              {parsedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`${styles.txRow} ${tx.selected ? styles.txSelected : ''}`}
                  onClick={() => toggleTransaction(tx.id)}
                >
                  <div className={styles.txCheck}>
                    {tx.selected && <Check size={14} />}
                  </div>
                  <div className={styles.txInfo}>
                    <span className={styles.txDesc}>{tx.description}</span>
                    <span className={styles.txDate}>
                      {format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <span className={`${styles.txAmount} ${tx.type === 'expense' ? styles.txExpense : styles.txIncome}`}>
                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowImportModal(false)}
                className={styles.cancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={handleImportTransactions}
                disabled={importing || selectedCount === 0}
                className={styles.importBtn}
              >
                {importing
                  ? 'Importando...'
                  : `Importar ${selectedCount} transações`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
