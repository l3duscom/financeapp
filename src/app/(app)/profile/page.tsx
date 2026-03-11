'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAccounts,
  addAccount,
  deleteAccount,
  initializeDefaultAccounts,
  type Account,
} from '@/lib/firestore';
import {
  LogOut,
  Plus,
  Trash2,
  Wallet,
  Landmark,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  User,
  Mail,
  Shield,
} from 'lucide-react';
import styles from './profile.module.css';

const accountTypeLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  cash: 'Dinheiro',
  investment: 'Investimento',
};

const accountTypeIcons: Record<string, React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'checking' as Account['type'],
    balance: 0,
    color: '#3b82f6',
    icon: 'landmark',
  });

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await initializeDefaultAccounts(user.uid);
      const accs = await getAccounts(user.uid);
      setAccounts(accs);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAddAccount = async () => {
    if (!user || !newAccount.name) return;
    await addAccount(user.uid, newAccount);
    setNewAccount({ name: '', type: 'checking', balance: 0, color: '#3b82f6', icon: 'landmark' });
    setShowAddAccount(false);
    await loadAccounts();
  };

  const handleDeleteAccount = async (id: string) => {
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className={styles.page}>
      {/* User Card */}
      <div className={styles.userCard}>
        <div className={styles.avatar}>
          {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className={styles.userInfo}>
          <h2 className={styles.userName}>{profile?.name || 'Usuário'}</h2>
          <div className={styles.userDetail}>
            <Mail size={14} />
            <span>{profile?.email}</span>
          </div>
          <div className={styles.userDetail}>
            <Shield size={14} />
            <span className={styles.planBadge}>
              {(() => {
                const plan = profile?.subscription?.plan;
                const active = profile?.subscription?.active;
                if (!active) return 'Inativo';
                if (plan === 'trial') return 'Trial (3 dias)';
                if (plan === 'annual' || plan === 'anual') return 'Plano Anual';
                if (plan === 'monthly' || plan === 'mensal') return 'Plano Mensal';
                if (plan === 'expired') return 'Expirado';
                return plan || 'Inativo';
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Accounts Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Wallet size={18} />
            Minhas Contas
          </h3>
          <button
            className={styles.addBtn}
            onClick={() => setShowAddAccount(!showAddAccount)}
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {/* Add Account Form */}
        {showAddAccount && (
          <div className={styles.addForm}>
            <input
              type="text"
              placeholder="Nome da conta"
              className={styles.formInput}
              value={newAccount.name}
              onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
            />
            <select
              className={styles.formSelect}
              value={newAccount.type}
              onChange={(e) =>
                setNewAccount((p) => ({ ...p, type: e.target.value as Account['type'] }))
              }
            >
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className={styles.formActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowAddAccount(false)}
              >
                Cancelar
              </button>
              <button className={styles.confirmBtn} onClick={handleAddAccount}>
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Account List */}
        <div className={styles.accountList}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))
          ) : accounts.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma conta cadastrada</p>
          ) : (
            accounts.map((acc) => {
              const Icon = accountTypeIcons[acc.type] || Wallet;
              return (
                <div key={acc.id} className={styles.accountItem}>
                  <div
                    className={styles.accountIcon}
                    style={{ backgroundColor: `${acc.color}20`, color: acc.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className={styles.accountInfo}>
                    <span className={styles.accountName}>{acc.name}</span>
                    <span className={styles.accountType}>
                      {accountTypeLabels[acc.type]}
                    </span>
                  </div>
                  <span className={styles.accountBalance}>
                    {formatCurrency(acc.balance)}
                  </span>
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className={styles.deleteBtn}
                    aria-label="Excluir conta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Logout */}
      <button onClick={signOut} className={styles.logoutBtn}>
        <LogOut size={18} />
        Sair da conta
      </button>
    </div>
  );
}
