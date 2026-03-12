'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addTransaction,
  getTransactions,
  getCategories,
  getAccounts,
  addAccount,
  getPeople,
  type Account,
} from '@/lib/firestore';
import { parseCSV, readCSVFile, type ParsedTransaction } from '@/lib/csv-parser';
import { parseOFX, readOFXFile } from '@/lib/ofx-parser';
import TransactionIcon from '@/components/TransactionIcon';
import Toast from '@/components/Toast';
import type { Transaction, Category, Person } from '@/types';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  X,
  Check,
  Ban,
  Info,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './import.module.css';

type FileFormat = 'ofx' | 'csv' | 'unknown';

interface ImportTransaction extends ParsedTransaction {
  isDuplicate: boolean;
}

interface BankGuide {
  name: string;
  domain: string;
  formats: string;
  steps: string;
}

const BANK_GUIDES: BankGuide[] = [
  { name: 'Nubank', domain: 'nubank.com.br', formats: 'CSV, OFX', steps: 'App > Conta > Extrato > Exportar > selecione OFX ou CSV' },
  { name: 'Inter', domain: 'bancointer.com.br', formats: 'OFX, CSV', steps: 'App > Extrato > Exportar > OFX ou CSV' },
  { name: 'Itaú', domain: 'itau.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Salvar como > OFX' },
  { name: 'Bradesco', domain: 'bradesco.com.br', formats: 'OFX, CSV', steps: 'Internet Banking > Extrato > Exportar > OFX' },
  { name: 'Santander', domain: 'santander.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar OFX' },
  { name: 'Banco do Brasil', domain: 'bb.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Salvar > OFX' },
  { name: 'Caixa', domain: 'caixa.gov.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar OFX' },
  { name: 'C6 Bank', domain: 'c6bank.com.br', formats: 'OFX, CSV', steps: 'App > Extrato > Compartilhar > OFX' },
  { name: 'BTG Pactual', domain: 'btgpactual.com', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar > OFX' },
  { name: 'XP', domain: 'xpi.com.br', formats: 'OFX', steps: 'Plataforma > Extrato > Exportar OFX' },
  { name: 'Neon', domain: 'neon.com.br', formats: 'OFX', steps: 'App > Extrato > Exportar > OFX' },
  { name: 'PagBank', domain: 'pagseguro.uol.com.br', formats: 'CSV, OFX', steps: 'App > Extrato > Exportar extrato' },
  { name: 'Mercado Pago', domain: 'mercadopago.com.br', formats: 'CSV', steps: 'App > Atividade > Exportar atividade' },
  { name: 'Sicredi', domain: 'sicredi.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar > OFX' },
  { name: 'Sicoob', domain: 'sicoob.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar > OFX' },
  { name: 'Safra', domain: 'safra.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar' },
  { name: 'Original', domain: 'original.com.br', formats: 'OFX', steps: 'App > Extrato > Exportar > OFX' },
  { name: 'Banrisul', domain: 'banrisul.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar OFX' },
  { name: 'Daycoval', domain: 'daycoval.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar' },
  { name: 'BMG', domain: 'bancobmg.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar' },
  { name: 'Agibank', domain: 'agibank.com.br', formats: 'OFX', steps: 'App > Extrato > Exportar' },
  { name: 'Will Bank', domain: 'willbank.com.br', formats: 'CSV', steps: 'App > Extrato > Exportar CSV' },
  { name: 'Next', domain: 'next.me', formats: 'OFX', steps: 'App > Extrato > Exportar OFX' },
  { name: 'Banco Pan', domain: 'bancopan.com.br', formats: 'OFX', steps: 'Internet Banking > Extrato > Exportar' },
];

function detectFormat(file: File): FileFormat {
  const ext = file.name.toLowerCase();
  if (ext.endsWith('.ofx') || ext.endsWith('.ofc')) return 'ofx';
  if (ext.endsWith('.csv')) return 'csv';
  return 'unknown';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ImportPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<FileFormat>('unknown');
  const [bankInfoText, setBankInfoText] = useState('');

  // Parsed data
  const [transactions, setTransactions] = useState<ImportTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Config
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [existingTransactions, setExistingTransactions] = useState<Transaction[]>([]);

  // Drag state
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [cats, accs, txs, ppl] = await Promise.all([
          getCategories(user.uid),
          getAccounts(user.uid),
          getTransactions(user.uid),
          getPeople(user.uid),
        ]);
        setCategories(cats);
        setAccounts(accs);
        setExistingTransactions(txs);
        setPeople(ppl);
        if (accs.length === 0) setSelectedAccount('__new__');
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    load();
  }, [user]);

  const isDuplicateTransaction = useCallback(
    (parsed: ParsedTransaction): boolean => {
      return existingTransactions.some((existing) => {
        const existingDate = existing.date instanceof Date
          ? format(existing.date, 'yyyy-MM-dd')
          : String(existing.date);
        const sameDate = existingDate === parsed.date;
        const sameAmount = Math.abs(existing.amount - parsed.amount) < 0.01;
        const sameDesc =
          existing.description.toLowerCase().trim() ===
          parsed.description.toLowerCase().trim();
        return sameDate && sameAmount && sameDesc;
      });
    },
    [existingTransactions]
  );

  const handleFile = useCallback(
    async (f: File) => {
      setError('');
      setSuccess('');
      setFile(f);
      setBankInfoText('');

      const fmt = detectFormat(f);
      setFileFormat(fmt);

      if (fmt === 'unknown') {
        setError('Formato não reconhecido. Use arquivos .ofx ou .csv');
        return;
      }

      setParsing(true);
      try {
        let parsed: ParsedTransaction[] = [];
        let errors: string[] = [];
        let total = 0;

        if (fmt === 'ofx') {
          const content = await readOFXFile(f);
          const result = parseOFX(content);
          parsed = result.transactions;
          errors = result.errors;
          total = result.totalRows;
          if (result.bankInfo) {
            const parts: string[] = [];
            if (result.bankInfo.bankId) parts.push(`Banco: ${result.bankInfo.bankId}`);
            if (result.bankInfo.accountId) parts.push(`Conta: ${result.bankInfo.accountId}`);
            if (result.bankInfo.accountType) parts.push(`Tipo: ${result.bankInfo.accountType}`);
            setBankInfoText(parts.join(' | '));
          }
        } else {
          const content = await readCSVFile(f);
          const result = parseCSV(content);
          parsed = result.transactions;
          errors = result.errors;
          total = result.totalRows;
        }

        const withDuplicates: ImportTransaction[] = parsed.map((tx) => ({
          ...tx,
          isDuplicate: isDuplicateTransaction(tx),
        }));

        // Auto-deselect duplicates
        withDuplicates.forEach((tx) => {
          if (tx.isDuplicate) tx.selected = false;
        });

        setTransactions(withDuplicates);
        setParseErrors(errors);
        setTotalRows(total);
      } catch (err) {
        setError('Erro ao processar o arquivo. Verifique se o formato está correto.');
        console.error('Parse error:', err);
      } finally {
        setParsing(false);
      }
    },
    [isDuplicateTransaction]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // Selection
  const toggleTx = (id: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, selected: !tx.selected } : tx))
    );
  };

  const toggleAll = () => {
    const allSelected = transactions.every((t) => t.selected);
    setTransactions((prev) => prev.map((tx) => ({ ...tx, selected: !allSelected })));
  };

  // Stats
  const selectedTxs = useMemo(() => transactions.filter((t) => t.selected), [transactions]);
  const selectedCount = selectedTxs.length;
  const selectedTotal = useMemo(
    () => selectedTxs.reduce((sum, t) => sum + t.amount, 0),
    [selectedTxs]
  );
  const incomeTotal = useMemo(
    () => selectedTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [selectedTxs]
  );
  const expenseTotal = useMemo(
    () => selectedTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [selectedTxs]
  );
  const duplicateCount = useMemo(
    () => transactions.filter((t) => t.isDuplicate).length,
    [transactions]
  );

  const accountName = selectedAccount === '__new__' ? newAccountName.trim() : selectedAccount;

  // Import
  const handleImport = async () => {
    if (!user || selectedCount === 0) return;

    const finalAccount = accountName;
    if (!finalAccount) {
      setError('Informe ou selecione uma conta para importar.');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setError('');

    try {
      // Auto-create account if it's a new name
      if (selectedAccount === '__new__' && finalAccount) {
        const exists = accounts.some(
          (a) => a.name.toLowerCase() === finalAccount.toLowerCase()
        );
        if (!exists) {
          await addAccount(user.uid, {
            name: finalAccount,
            type: 'checking',
            balance: 0,
            color: '#3b82f6',
            icon: 'landmark',
          });
          const updatedAccs = await getAccounts(user.uid);
          setAccounts(updatedAccs);
        }
      }

      let done = 0;
      const batch = selectedTxs;
      const category = selectedCategory || 'Outros';

      for (const tx of batch) {
        await addTransaction(user.uid, {
          type: tx.type,
          amount: tx.amount,
          category,
          description: tx.description,
          date: new Date(tx.date + 'T12:00:00'),
          account: finalAccount,
          ...(selectedPerson ? { person: selectedPerson } : {}),
        });
        done++;
        setImportProgress(Math.round((done / batch.length) * 100));
      }

      setSuccess(`${done} transações importadas com sucesso!`);
      setTransactions([]);
      setFile(null);
      setParseErrors([]);
      setTotalRows(0);
      setBankInfoText('');
      setNewAccountName('');

      // Refresh existing transactions for future duplicate detection
      const updated = await getTransactions(user.uid);
      setExistingTransactions(updated);
    } catch (err) {
      setError('Erro ao importar transações. Tente novamente.');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setTransactions([]);
    setParseErrors([]);
    setTotalRows(0);
    setError('');
    setSuccess('');
    setBankInfoText('');
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <div className={styles.page}>
      <Toast type="error" message={error} onClose={() => setError('')} duration={0} />
      <Toast type="success" message={success} onClose={() => setSuccess('')} />

      <h2 className={styles.pageTitle}>
        <Upload size={22} /> Importar Extrato
      </h2>

      {/* Drop Zone */}
      {transactions.length === 0 && !parsing && (
        <>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropIcon}>
              <Upload size={28} />
            </div>
            <span className={styles.dropTitle}>
              Arraste seu extrato bancário aqui
            </span>
            <span className={styles.dropHint}>
              ou clique para selecionar o arquivo
            </span>
            <div className={styles.dropFormats}>
              <span className={styles.formatBadge}>
                <FileSpreadsheet size={12} /> OFX
              </span>
              <span className={styles.formatBadge}>
                <FileSpreadsheet size={12} /> OFC
              </span>
              <span className={styles.formatBadge}>
                <FileSpreadsheet size={12} /> CSV
              </span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.ofc,.csv"
            className={styles.hiddenInput}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {/* Bank Guides */}
          <div className={styles.guidesSection}>
            <span className={styles.guidesTitle}>
              <HelpCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Como exportar o extrato do seu banco
            </span>
            <div className={styles.guidesGrid}>
              {BANK_GUIDES.map((guide) => (
                <div
                  key={guide.name}
                  className={`${styles.guideCard} ${expandedGuide === guide.name ? styles.guideCardActive : ''}`}
                  onClick={() => setExpandedGuide(expandedGuide === guide.name ? null : guide.name)}
                >
                  <div className={styles.guideLogo}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://logo.clearbit.com/${guide.domain}`}
                      alt={guide.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.textContent = '🏦';
                      }}
                    />
                  </div>
                  <div className={styles.guideInfo}>
                    <span className={styles.guideName}>{guide.name}</span>
                    <span className={styles.guideFormats}>{guide.formats}</span>
                    <div className={styles.guideSteps}>{guide.steps}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Loading */}
      {parsing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Processando arquivo...</span>
        </div>
      )}

      {/* Review */}
      {transactions.length > 0 && !parsing && (
        <>
          {/* File info */}
          <div className={styles.fileInfo}>
            <div className={styles.fileIcon}>
              <FileSpreadsheet size={20} />
            </div>
            <div className={styles.fileDetails}>
              <span className={styles.fileName}>{file?.name}</span>
              <span className={styles.fileMeta}>
                {fileFormat.toUpperCase()} — {totalRows} linhas — {transactions.length} transações
              </span>
            </div>
            <button className={styles.removeFileBtn} onClick={resetImport}>
              <X size={18} />
            </button>
          </div>

          {bankInfoText && (
            <div className={styles.bankInfo}>
              <Info size={14} /> {bankInfoText}
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className={styles.parseWarnings}>
              <AlertCircle size={14} />
              <span>{parseErrors.length} linha(s) ignorada(s) por dados inválidos</span>
            </div>
          )}

          {/* Summary */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Selecionadas</span>
              <span className={styles.summaryValue}>{selectedCount} / {transactions.length}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Receitas</span>
              <span className={`${styles.summaryValue} ${styles.summaryIncome}`}>
                {formatCurrency(incomeTotal)}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Despesas</span>
              <span className={`${styles.summaryValue} ${styles.summaryExpense}`}>
                {formatCurrency(expenseTotal)}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Duplicadas</span>
              <span className={`${styles.summaryValue} ${styles.summaryDuplicates}`}>
                {duplicateCount}
              </span>
            </div>
          </div>

          {/* Config */}
          <div className={styles.configRow}>
            <div className={styles.configField}>
              <span className={styles.configLabel}>Categoria (opcional)</span>
              <select
                className={styles.configSelect}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Sem categoria (Outros)</option>
                <optgroup label="Despesas">
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Receitas">
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className={styles.configField}>
              <span className={styles.configLabel}>Conta</span>
              <select
                className={styles.configSelect}
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  if (e.target.value !== '__new__') setNewAccountName('');
                }}
              >
                <option value="">Selecionar conta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
                <option value="__new__">+ Nova conta...</option>
              </select>
              {selectedAccount === '__new__' && (
                <input
                  type="text"
                  className={styles.configSelect}
                  placeholder="Nome da nova conta (ex: Nubank, Itaú...)"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  autoFocus
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
            {people.length > 0 && (
              <div className={styles.configField}>
                <span className={styles.configLabel}>Pessoa (opcional)</span>
                <select
                  className={styles.configSelect}
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                >
                  <option value="">Sem pessoa atribuída</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Select all */}
          <div className={styles.selectAllRow}>
            <button className={styles.selectAllBtn} onClick={toggleAll}>
              {transactions.every((t) => t.selected)
                ? <><Ban size={14} /> Desmarcar todas</>
                : <><Check size={14} /> Selecionar todas</>}
            </button>
            {duplicateCount > 0 && (
              <span className={styles.duplicateHint}>
                {duplicateCount} possível(is) duplicata(s) desmarcada(s)
              </span>
            )}
          </div>

          {/* Transaction List */}
          <div className={styles.txList}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={`${styles.txRow} ${tx.selected ? styles.txSelected : ''}`}
                onClick={() => toggleTx(tx.id)}
              >
                <div className={styles.txCheck}>
                  {tx.selected && <Check size={14} />}
                </div>
                <div className={styles.txIcon}>
                  <TransactionIcon description={tx.description} category={selectedCategory || 'Outros'} size={18} />
                </div>
                <div className={styles.txInfo}>
                  <span className={styles.txDesc}>{tx.description}</span>
                  <span className={styles.txDate}>
                    {format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}
                  </span>
                </div>
                {tx.isDuplicate && <span className={styles.txDuplicate}>duplicada</span>}
                <span className={`${styles.txAmount} ${tx.type === 'expense' ? styles.txExpense : styles.txIncome}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Import progress */}
          {importing && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${importProgress}%` }} />
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={resetImport}>
              Cancelar
            </button>
            <button
              className={styles.importBtn}
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
            >
              {importing
                ? `Importando... ${importProgress}%`
                : `Importar ${selectedCount} transações`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
