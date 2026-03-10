import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ===== Types =====

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  icon: string;
  color: string;
  category: 'emergency' | 'travel' | 'purchase' | 'investment' | 'education' | 'retirement' | 'other';
  createdAt: Date;
}

export interface MonthlyBudget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  month: number;
  year: number;
}

// ===== Goals CRUD =====

export async function getGoals(userId: string): Promise<FinancialGoal[]> {
  const q = query(
    collection(db, 'goals'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    deadline: d.data().deadline?.toDate(),
    createdAt: d.data().createdAt?.toDate(),
  })) as FinancialGoal[];
}

export async function addGoal(
  userId: string,
  data: Omit<FinancialGoal, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'goals'), {
    ...data,
    userId,
    deadline: Timestamp.fromDate(new Date(data.deadline)),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateGoal(
  goalId: string,
  data: Partial<Omit<FinancialGoal, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...data };
  if (data.deadline) {
    updateData.deadline = Timestamp.fromDate(new Date(data.deadline));
  }
  await updateDoc(doc(db, 'goals', goalId), updateData);
}

export async function deleteGoal(goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'goals', goalId));
}

export async function addToGoal(goalId: string, amount: number, currentAmount: number): Promise<void> {
  await updateDoc(doc(db, 'goals', goalId), {
    currentAmount: currentAmount + amount,
  });
}

// ===== Budget CRUD =====

export async function getBudgets(
  userId: string,
  month: number,
  year: number
): Promise<MonthlyBudget[]> {
  const q = query(
    collection(db, 'budgets'),
    where('userId', '==', userId),
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MonthlyBudget[];
}

export async function setBudget(
  userId: string,
  category: string,
  limit: number,
  month: number,
  year: number
): Promise<string> {
  // Check if budget already exists
  const existing = await getBudgets(userId, month, year);
  const found = existing.find((b) => b.category === category);

  if (found) {
    await updateDoc(doc(db, 'budgets', found.id), { limit });
    return found.id;
  }

  const docRef = await addDoc(collection(db, 'budgets'), {
    userId,
    category,
    limit,
    month,
    year,
  });
  return docRef.id;
}

export async function deleteBudget(budgetId: string): Promise<void> {
  await deleteDoc(doc(db, 'budgets', budgetId));
}

// ===== Helpers =====

export const GOAL_CATEGORIES: { value: FinancialGoal['category']; label: string; icon: string; color: string }[] = [
  { value: 'emergency', label: 'Reserva de emergência', icon: 'shield', color: '#3b82f6' },
  { value: 'travel', label: 'Viagem', icon: 'plane', color: '#06b6d4' },
  { value: 'purchase', label: 'Compra', icon: 'shopping-bag', color: '#f59e0b' },
  { value: 'investment', label: 'Investimento', icon: 'trending-up', color: '#10b981' },
  { value: 'education', label: 'Educação', icon: 'graduation-cap', color: '#8b5cf6' },
  { value: 'retirement', label: 'Aposentadoria', icon: 'sunset', color: '#f97316' },
  { value: 'other', label: 'Outro', icon: 'target', color: '#64748b' },
];

export function getGoalProgress(goal: FinancialGoal): number {
  if (goal.targetAmount === 0) return 0;
  return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
}

export function getDaysRemaining(deadline: Date): number {
  const now = new Date();
  const diff = new Date(deadline).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getMonthlyNeeded(goal: FinancialGoal): number {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 0;
  const months = getDaysRemaining(goal.deadline) / 30;
  if (months <= 0) return remaining;
  return remaining / months;
}
