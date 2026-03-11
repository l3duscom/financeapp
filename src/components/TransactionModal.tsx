'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCategories, getAccounts, type Account } from '@/lib/firestore';
import type { Category, TransactionType } from '@/types';
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CreditCard,
} from 'lucide-react';
import styles from './TransactionModal.module.css';

interface TransactionFormData {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  account: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  initialData?: Partial<TransactionFormData>;
  mode: 'add' | 'edit';
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: TransactionModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    account: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      loadData();
      if (initialData) {
        setFormData((prev) => ({ ...prev, ...initialData }));
      } else {
        setFormData({
          type: 'expense',
          amount: 0,
          category: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          account: '',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const loadData = async () => {
    if (!user) return;
    const [cats, accs] = await Promise.all([
      getCategories(user.uid),
      getAccounts(user.uid),
    ]);
    setCategories(cats);
    setAccounts(accs);
  };

  const filteredCategories = categories.filter(
    (cat) => cat.type === formData.type
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.description) return;

    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrencyInput = (value: string): number => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits, 10) / 100;
  };

  const displayCurrency = (amount: number): string => {
    if (amount <= 0) return '';
    const [intPart, decPart] = amount.toFixed(2).split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'add' ? 'Nova transação' : 'Editar transação'}
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Type Toggle */}
        <div className={styles.typeToggle}>
          <button
            type="button"
            className={`${styles.typeBtn} ${formData.type === 'expense' ? styles.typeBtnExpense : ''}`}
            onClick={() => setFormData((p) => ({ ...p, type: 'expense', category: '' }))}
          >
            <ArrowDownCircle size={18} />
            Despesa
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${formData.type === 'income' ? styles.typeBtnIncome : ''}`}
            onClick={() => setFormData((p) => ({ ...p, type: 'income', category: '' }))}
          >
            <ArrowUpCircle size={18} />
            Receita
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Amount */}
          <div className={styles.amountSection}>
            <span className={styles.amountCurrency}>R$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className={styles.amountInput}
              value={displayCurrency(formData.amount)}
              onChange={(e) => {
                const val = formatCurrencyInput(e.target.value);
                setFormData((p) => ({ ...p, amount: val }));
              }}
              autoFocus
            />
          </div>

          {/* Fields */}
          <div className={styles.fields}>
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <FileText size={18} />
              </div>
              <input
                type="text"
                placeholder="Descrição"
                className={styles.input}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <Tag size={18} />
              </div>
              <select
                className={styles.select}
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                required
              >
                <option value="">Categoria</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <CreditCard size={18} />
              </div>
              <select
                className={styles.select}
                value={formData.account}
                onChange={(e) => setFormData((p) => ({ ...p, account: e.target.value }))}
              >
                <option value="">Conta (opcional)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.name}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <Calendar size={18} />
              </div>
              <input
                type="date"
                className={styles.input}
                value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`${styles.submitBtn} ${
              formData.type === 'income' ? styles.submitIncome : styles.submitExpense
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <DollarSign size={18} />
                {mode === 'add' ? 'Adicionar' : 'Salvar'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
