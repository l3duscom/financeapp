import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  startAfter,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction, Category, CreditCard, Installment, Person } from '@/types';

// ===== Transactions =====

export async function addTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...data,
    userId,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateTransaction(
  transactionId: string,
  data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'transactions', transactionId);
  const updateData: Record<string, unknown> = { ...data };
  if (data.date) {
    updateData.date = Timestamp.fromDate(new Date(data.date));
  }
  await updateDoc(ref, updateData);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', transactionId));
}

export async function getTransactions(
  userId: string,
  options?: {
    limitCount?: number;
    startAfterDoc?: DocumentData;
    month?: number;
    year?: number;
    type?: 'income' | 'expense';
    category?: string;
  }
): Promise<Transaction[]> {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  ];

  if (options?.type) {
    constraints.push(where('type', '==', options.type));
  }

  if (options?.category) {
    constraints.push(where('category', '==', options.category));
  }

  if (options?.month !== undefined && options?.year !== undefined) {
    const startDate = new Date(options.year, options.month, 1);
    const endDate = new Date(options.year, options.month + 1, 0, 23, 59, 59);
    constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
    constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
  }

  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  const q = query(collection(db, 'transactions'), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Transaction[];
}

export async function getTransaction(transactionId: string): Promise<Transaction | null> {
  const docSnap = await getDoc(doc(db, 'transactions', transactionId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    date: data.date?.toDate(),
    createdAt: data.createdAt?.toDate(),
  } as Transaction;
}

// ===== Categories =====

export async function getCategories(userId: string): Promise<Category[]> {
  const q = query(
    collection(db, 'categories'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];
}

export async function addCategory(
  userId: string,
  data: Omit<Category, 'id' | 'userId'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'categories'), {
    ...data,
    userId,
  });
  return docRef.id;
}

export async function updateCategory(
  categoryId: string,
  data: Partial<Omit<Category, 'id' | 'userId'>>
): Promise<void> {
  await updateDoc(doc(db, 'categories', categoryId), data);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', categoryId));
}

// ===== Default Categories =====

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  { name: 'Alimentação', icon: 'coffee', color: '#f59e0b', type: 'expense', budget: 0 },
  { name: 'Mercado', icon: 'shopping-cart', color: '#10b981', type: 'expense', budget: 0 },
  { name: 'Moradia', icon: 'home', color: '#6366f1', type: 'expense', budget: 0 },
  { name: 'Transporte', icon: 'car', color: '#3b82f6', type: 'expense', budget: 0 },
  { name: 'Saúde', icon: 'heart', color: '#ef4444', type: 'expense', budget: 0 },
  { name: 'Educação', icon: 'book-open', color: '#8b5cf6', type: 'expense', budget: 0 },
  { name: 'Lazer', icon: 'gamepad-2', color: '#ec4899', type: 'expense', budget: 0 },
  { name: 'Utilidades', icon: 'zap', color: '#06b6d4', type: 'expense', budget: 0 },
  { name: 'Vestuário', icon: 'shirt', color: '#f97316', type: 'expense', budget: 0 },
  { name: 'Outros', icon: 'more-horizontal', color: '#64748b', type: 'expense', budget: 0 },
  { name: 'Salário', icon: 'dollar-sign', color: '#10b981', type: 'income', budget: 0 },
  { name: 'Freelance', icon: 'briefcase', color: '#8b5cf6', type: 'income', budget: 0 },
  { name: 'Investimentos', icon: 'trending-up', color: '#6366f1', type: 'income', budget: 0 },
  { name: 'Outros', icon: 'plus-circle', color: '#64748b', type: 'income', budget: 0 },
];

export async function initializeDefaultCategories(userId: string): Promise<void> {
  const existing = await getCategories(userId);
  if (existing.length > 0) return; // Already initialized

  const promises = DEFAULT_CATEGORIES.map((cat) =>
    addDoc(collection(db, 'categories'), { ...cat, userId })
  );
  await Promise.all(promises);
}

// ===== Accounts =====

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
  balance: number;
  color: string;
  icon: string;
}

export async function getAccounts(userId: string): Promise<Account[]> {
  const q = query(
    collection(db, 'accounts'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Account[];
}

export async function addAccount(
  userId: string,
  data: Omit<Account, 'id' | 'userId'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'accounts'), {
    ...data,
    userId,
  });
  return docRef.id;
}

export async function updateAccount(
  accountId: string,
  data: Partial<Omit<Account, 'id' | 'userId'>>
): Promise<void> {
  await updateDoc(doc(db, 'accounts', accountId), data);
}

export async function deleteAccount(accountId: string): Promise<void> {
  await deleteDoc(doc(db, 'accounts', accountId));
}

export const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'userId'>[] = [
  { name: 'Carteira', type: 'cash', balance: 0, color: '#10b981', icon: 'wallet' },
  { name: 'Conta Corrente', type: 'checking', balance: 0, color: '#3b82f6', icon: 'landmark' },
  { name: 'Poupança', type: 'savings', balance: 0, color: '#8b5cf6', icon: 'piggy-bank' },
];

export async function initializeDefaultAccounts(userId: string): Promise<void> {
  const existing = await getAccounts(userId);
  if (existing.length > 0) return;

  const promises = DEFAULT_ACCOUNTS.map((acc) =>
    addDoc(collection(db, 'accounts'), { ...acc, userId })
  );
  await Promise.all(promises);
}

// ===== Credit Cards =====

export async function getCreditCards(userId: string): Promise<CreditCard[]> {
  const q = query(
    collection(db, 'creditCards'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as CreditCard[];
}

export async function addCreditCard(
  userId: string,
  data: Omit<CreditCard, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'creditCards'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateCreditCard(
  cardId: string,
  data: Partial<Omit<CreditCard, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'creditCards', cardId), data);
}

export async function deleteCreditCard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'creditCards', cardId));
}

// ===== Installments =====

export async function getInstallments(userId: string): Promise<Installment[]> {
  const q = query(
    collection(db, 'installments'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    startDate: d.data().startDate?.toDate(),
    createdAt: d.data().createdAt?.toDate(),
  })) as Installment[];
  return items.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

export async function addInstallment(
  userId: string,
  data: Omit<Installment, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'installments'), {
    ...data,
    userId,
    startDate: Timestamp.fromDate(new Date(data.startDate)),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateInstallment(
  installmentId: string,
  data: Partial<Omit<Installment, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...data };
  if (data.startDate) {
    updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
  }
  await updateDoc(doc(db, 'installments', installmentId), updateData);
}

export async function deleteInstallment(installmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'installments', installmentId));
}

// ===== People =====

export async function getPeople(userId: string): Promise<Person[]> {
  const q = query(
    collection(db, 'people'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate(),
  })) as Person[];
}

export async function addPerson(
  userId: string,
  data: Omit<Person, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'people'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updatePerson(
  personId: string,
  data: Partial<Omit<Person, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'people', personId), data);
}

export async function deletePerson(personId: string): Promise<void> {
  await deleteDoc(doc(db, 'people', personId));
}

// ===== Helpers =====

export function getMonthlyTotals(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  return { income, expenses, balance: income - expenses };
}

export function getCategoryTotals(transactions: Transaction[]) {
  const totals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
  return totals;
}
