// ===== User Types =====
export interface UserSubscription {
  active: boolean;
  plan: string;
  expiresAt: Date | null;
  trialEndsAt?: Date | null;
  asaasSubscriptionId: string;
}

export interface UserAsaasData {
  customerId: string;
  paymentId: string;
  purchaseDate: Date;
}

export interface UserSettings {
  currency: string;
  theme: 'dark' | 'light';
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  subscription: UserSubscription;
  asaas: UserAsaasData;
  createdAt: Date;
  createdBy: string;
  settings: UserSettings;
}

// ===== Transaction Types =====
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  account: string;
  createdAt: Date;
}

// ===== Category Types =====
export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget: number;
}

// ===== Asaas Webhook Types =====
export type AsaasPaymentEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED';

export type AsaasSubscriptionEvent =
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_INACTIVATED'
  | 'SUBSCRIPTION_DELETED';

export type AsaasWebhookEvent = AsaasPaymentEvent | AsaasSubscriptionEvent;

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment?: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    status: string;
    billingType: string;
    subscription?: string;
    externalReference?: string;
    dateCreated: string;
    dueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
  };
  subscription?: {
    id: string;
    customer: string;
    value: number;
    status: string;
    cycle: string;
    nextDueDate: string;
  };
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
}

// ===== Dashboard Types =====
export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyChange: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}
