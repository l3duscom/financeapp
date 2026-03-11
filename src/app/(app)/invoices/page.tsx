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

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

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
    return '🖼️';
  };

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
              <input
                type="text"
                placeholder="Ex: Nubank, Itaú..."
                className={styles.fieldInput}
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
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
            accept=".pdf,.jpg,.jpeg,.png,.webp"
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
              <p className={styles.dropHint}>PDF ou CSV · Máx 10MB</p>
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
    </div>
  );
}
