import { getAdminAuth, getAdminDb } from './firebase-admin';
import { buildAppResetLink } from './auth-utils';
import type { AsaasWebhookPayload, AsaasWebhookEvent, AsaasCustomer } from '@/types';

const ASAAS_BASE_URL = process.env.ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

// ===== Webhook Validation =====
export function validateWebhookToken(token: string | null): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken || !token) return false;
  return token === expectedToken;
}

// ===== Asaas API Client =====
async function asaasRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY || '',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Asaas API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ===== Customer Management =====
export async function getAsaasCustomer(customerId: string): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>(`/customers/${customerId}`);
}

// ===== User Creation via Webhook =====
export async function createUserFromPayment(payload: AsaasWebhookPayload): Promise<string> {
  if (!payload.payment) {
    throw new Error('Payment data is required to create user');
  }

  const customerId = payload.payment.customer;
  const customer = await getAsaasCustomer(customerId);

  // Check if user already exists in Firebase Auth
  let userRecord;
  try {
    userRecord = await getAdminAuth().getUserByEmail(customer.email);
  } catch {
    // User does not exist, create new one
    const tempPassword = generateTempPassword();
    userRecord = await getAdminAuth().createUser({
      email: customer.email,
      password: tempPassword,
      displayName: customer.name,
    });

    const firebaseLink = await getAdminAuth().generatePasswordResetLink(customer.email);
    const resetLink = buildAppResetLink(firebaseLink);
    console.log(`[Asaas Webhook] Password reset link generated for ${customer.email}: ${resetLink}`);
    // TODO: Send this link via email service (SendGrid, Resend, etc.)
  }

  // Create or update Firestore document
  const userDoc = {
    name: customer.name,
    email: customer.email,
    photoURL: '',
    subscription: {
      active: true,
      plan: 'premium',
      expiresAt: null,
      asaasSubscriptionId: payload.payment.subscription || '',
    },
    asaas: {
      customerId: customerId,
      paymentId: payload.payment.id,
      purchaseDate: new Date(),
    },
    createdBy: 'asaas_webhook',
    settings: {
      currency: 'BRL',
      theme: 'dark',
    },
  };

  const userRef = getAdminDb().collection('users').doc(userRecord.uid);
  const existingDoc = await userRef.get();

  if (existingDoc.exists) {
    // Update subscription data
    await userRef.update({
      'subscription.active': true,
      'subscription.asaasSubscriptionId': payload.payment.subscription || '',
      'asaas.paymentId': payload.payment.id,
      'asaas.purchaseDate': new Date(),
    });
  } else {
    await userRef.set({
      ...userDoc,
      createdAt: new Date(),
    });
  }

  return userRecord.uid;
}

// ===== Subscription Management =====
export async function deactivateSubscription(payload: AsaasWebhookPayload): Promise<void> {
  const customerId = payload.payment?.customer || payload.subscription?.customer;
  if (!customerId) return;

  const customer = await getAsaasCustomer(customerId);
  
  try {
    const userRecord = await getAdminAuth().getUserByEmail(customer.email);
    await getAdminDb().collection('users').doc(userRecord.uid).update({
      'subscription.active': false,
    });
  } catch {
    console.error(`[Asaas Webhook] User not found for email: ${customer.email}`);
  }
}

export async function markSubscriptionPending(payload: AsaasWebhookPayload): Promise<void> {
  const customerId = payload.payment?.customer;
  if (!customerId) return;

  const customer = await getAsaasCustomer(customerId);
  
  try {
    const userRecord = await getAdminAuth().getUserByEmail(customer.email);
    await getAdminDb().collection('users').doc(userRecord.uid).update({
      'subscription.active': false,
    });
  } catch {
    console.error(`[Asaas Webhook] User not found for email: ${customer.email}`);
  }
}

// ===== Event Handlers Map =====
export function isActivationEvent(event: AsaasWebhookEvent): boolean {
  return ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event);
}

export function isDeactivationEvent(event: AsaasWebhookEvent): boolean {
  return [
    'PAYMENT_REFUNDED',
    'PAYMENT_DELETED',
    'SUBSCRIPTION_INACTIVATED',
    'SUBSCRIPTION_DELETED',
  ].includes(event);
}

export function isPendingEvent(event: AsaasWebhookEvent): boolean {
  return event === 'PAYMENT_OVERDUE';
}

// ===== Helpers =====
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function isSubscriptionActive(expiresAt: Date | null): boolean {
  if (!expiresAt) return true; // No expiry = active
  return new Date() < new Date(expiresAt);
}
