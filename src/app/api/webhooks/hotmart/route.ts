import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Hotmart Webhook - Ativa/desativa assinaturas baseado nos eventos da Hotmart
 * 
 * Configure na Hotmart:
 * URL: https://seu-dominio.vercel.app/api/webhooks/hotmart
 * 
 * Eventos suportados:
 * - PURCHASE_COMPLETE / PURCHASE_APPROVED → Ativa assinatura
 * - PURCHASE_CANCELED / PURCHASE_REFUNDED / PURCHASE_CHARGEBACK → Desativa
 * - SUBSCRIPTION_CANCELLATION → Desativa
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

    // Find user by email in Firestore
    const usersSnapshot = await getAdminDb()
      .collection('users')
      .where('email', '==', buyerEmail)
      .limit(1)
      .get();

    // Activation events
    if (ACTIVATION_EVENTS.includes(event)) {
      if (usersSnapshot.empty) {
        // User doesn't exist yet — create a placeholder doc
        // The user will complete registration via Google login
        console.log(`[Hotmart Webhook] No user found for ${buyerEmail}, will activate on login`);
        
        await getAdminDb().collection('pendingActivations').doc(buyerEmail).set({
          email: buyerEmail,
          name: data.buyer.name,
          plan: data.subscription?.plan?.name || 'monthly',
          transaction: data.purchase.transaction,
          activatedAt: new Date(),
          event,
        });

        return NextResponse.json({ success: true, message: 'Pending activation saved' });
      }

      const userDoc = usersSnapshot.docs[0];
      await userDoc.ref.update({
        'subscription.active': true,
        'subscription.plan': data.subscription?.plan?.name || 'monthly',
        'subscription.hotmartTransaction': data.purchase.transaction,
        'subscription.activatedAt': new Date(),
      });

      console.log(`[Hotmart Webhook] Subscription activated for ${buyerEmail}`);
      return NextResponse.json({ success: true });
    }

    // Deactivation events
    if (DEACTIVATION_EVENTS.includes(event)) {
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
