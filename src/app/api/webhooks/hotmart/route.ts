import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { sendWelcomeEmail } from '@/lib/email';
import { buildAppResetLink } from '@/lib/auth-utils';

/**
 * Hotmart Webhook - Cria conta e ativa assinatura automaticamente
 * 
 * Fluxo:
 * 1. Compra aprovada → Cria usuário no Firebase Auth + perfil no Firestore
 * 2. Usuário recebe email de redefinição de senha
 * 3. Cancelamento → desativa assinatura
 */

interface HotmartWebhookPayload {
  event: string;
  data: {
    buyer: {
      email: string;
      name: string;
    };
    purchase: {
      status: string;
      transaction: string;
      order_date: string;
    };
    subscription?: {
      status: string;
      subscriber_code: string;
      plan?: {
        name: string;
      };
    };
    product?: {
      id: number;
      name: string;
    };
  };
}

const ACTIVATION_EVENTS = [
  'PURCHASE_COMPLETE',
  'PURCHASE_APPROVED',
];

const DEACTIVATION_EVENTS = [
  'PURCHASE_CANCELED',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'SUBSCRIPTION_CANCELLATION',
];

function normalizePlan(rawPlan?: string): string {
  const p = (rawPlan || '').toLowerCase().trim();
  if (p.includes('anual') || p.includes('annual') || p.includes('ano')) return 'annual';
  if (p.includes('mensal') || p.includes('monthly') || p.includes('mês') || p.includes('mes')) return 'monthly';
  return 'monthly';
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: Request) {
  try {
    // Validate Hottok
    const hottok = process.env.HOTMART_HOTTOK;
    if (hottok) {
      const url = new URL(request.url);
      const queryHottok = url.searchParams.get('hottok');
      const headerHottok = request.headers.get('x-hotmart-hottok');
      
      if (queryHottok !== hottok && headerHottok !== hottok) {
        console.error('[Hotmart Webhook] Invalid hottok');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload: HotmartWebhookPayload = await request.json();
    const { event, data } = payload;

    console.log(`[Hotmart Webhook] Event: ${event}`);
    console.log(`[Hotmart Webhook] Buyer: ${data.buyer.email}`);

    const buyerEmail = data.buyer.email?.toLowerCase();
    if (!buyerEmail) {
      return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
    }

    const plan = normalizePlan(data.subscription?.plan?.name);

    // Activation events
    if (ACTIVATION_EVENTS.includes(event)) {
      const adminAuth = getAdminAuth();
      const adminDb = getAdminDb();

      // Check if Firebase Auth user exists
      let firebaseUser;
      try {
        firebaseUser = await adminAuth.getUserByEmail(buyerEmail);
        console.log(`[Hotmart Webhook] Existing user found: ${firebaseUser.uid}`);
      } catch {
        // User doesn't exist — create one
        const password = generateRandomPassword();
        firebaseUser = await adminAuth.createUser({
          email: buyerEmail,
          displayName: data.buyer.name,
          password,
        });
        console.log(`[Hotmart Webhook] New user created: ${firebaseUser.uid}`);

        // Generate password reset link & send welcome email
        try {
          const firebaseLink = await adminAuth.generatePasswordResetLink(buyerEmail);
          const resetLink = buildAppResetLink(firebaseLink);
          await sendWelcomeEmail({
            to: buyerEmail,
            name: data.buyer.name,
            plan,
            tempPassword: password,
            resetLink,
          });
          console.log(`[Hotmart Webhook] Welcome email sent to ${buyerEmail}`);
        } catch (emailError) {
          console.error('[Hotmart Webhook] Error sending email:', emailError);
        }
      }

      // Create or update Firestore profile
      const userRef = adminDb.collection('users').doc(firebaseUser.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // User exists — just activate subscription
        await userRef.update({
          'subscription.active': true,
          'subscription.plan': plan,
          'subscription.hotmartTransaction': data.purchase.transaction,
          'subscription.activatedAt': new Date(),
        });
      } else {
        // Create full profile
        await userRef.set({
          name: data.buyer.name,
          email: buyerEmail,
          photoURL: '',
          createdAt: new Date(),
          subscription: {
            active: true,
            plan,
            hotmartTransaction: data.purchase.transaction,
            activatedAt: new Date(),
          },
        });

        // Create default categories for the new user
        const defaultCategories = [
          { name: 'Salário', icon: '💰', color: '#10b981', type: 'income', userId: firebaseUser.uid },
          { name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income', userId: firebaseUser.uid },
          { name: 'Alimentação', icon: '🍔', color: '#f59e0b', type: 'expense', userId: firebaseUser.uid },
          { name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense', userId: firebaseUser.uid },
          { name: 'Moradia', icon: '🏠', color: '#8b5cf6', type: 'expense', userId: firebaseUser.uid },
          { name: 'Saúde', icon: '🏥', color: '#ef4444', type: 'expense', userId: firebaseUser.uid },
          { name: 'Educação', icon: '📚', color: '#06b6d4', type: 'expense', userId: firebaseUser.uid },
          { name: 'Lazer', icon: '🎮', color: '#ec4899', type: 'expense', userId: firebaseUser.uid },
        ];

        const batch = adminDb.batch();
        for (const cat of defaultCategories) {
          const catRef = adminDb.collection('categories').doc();
          batch.set(catRef, cat);
        }
        await batch.commit();
      }

      // Also save pending activation for Google login flow
      await adminDb.collection('pendingActivations').doc(buyerEmail).set({
        email: buyerEmail,
        name: data.buyer.name,
        plan,
        transaction: data.purchase.transaction,
        activatedAt: new Date(),
        event,
      });

      console.log(`[Hotmart Webhook] Account created & activated for ${buyerEmail}`);
      return NextResponse.json({ 
        success: true, 
        userId: firebaseUser.uid,
        message: 'User created and subscription activated',
      });
    }

    // Deactivation events
    if (DEACTIVATION_EVENTS.includes(event)) {
      const adminDb = getAdminDb();
      const usersSnapshot = await adminDb
        .collection('users')
        .where('email', '==', buyerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          'subscription.active': false,
          'subscription.plan': 'expired',
          'subscription.deactivatedAt': new Date(),
        });
        console.log(`[Hotmart Webhook] Subscription deactivated for ${buyerEmail}`);
      }
      return NextResponse.json({ success: true });
    }

    console.log(`[Hotmart Webhook] Unhandled event: ${event}`);
    return NextResponse.json({ success: true, message: 'Event not handled' });
  } catch (error) {
    console.error('[Hotmart Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
