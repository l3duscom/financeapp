import { NextResponse } from 'next/server';
import type { AsaasWebhookPayload } from '@/types';
import {
  validateWebhookToken,
  createUserFromPayment,
  deactivateSubscription,
  markSubscriptionPending,
  isActivationEvent,
  isDeactivationEvent,
  isPendingEvent,
} from '@/lib/asaas';

export async function POST(request: Request) {
  try {
    // Validate webhook token
    const token = request.headers.get('asaas-access-token');
    if (!validateWebhookToken(token)) {
      console.error('[Asaas Webhook] Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: AsaasWebhookPayload = await request.json();
    const { event } = payload;

    console.log(`[Asaas Webhook] Received event: ${event}`);

    // Handle activation events (create user / activate subscription)
    if (isActivationEvent(event)) {
      const userId = await createUserFromPayment(payload);
      console.log(`[Asaas Webhook] User created/updated: ${userId}`);
      return NextResponse.json({ success: true, userId });
    }

    // Handle deactivation events
    if (isDeactivationEvent(event)) {
      await deactivateSubscription(payload);
      console.log(`[Asaas Webhook] Subscription deactivated`);
      return NextResponse.json({ success: true });
    }

    // Handle pending/overdue events
    if (isPendingEvent(event)) {
      await markSubscriptionPending(payload);
      console.log(`[Asaas Webhook] Subscription marked as pending`);
      return NextResponse.json({ success: true });
    }

    // Unhandled event
    console.log(`[Asaas Webhook] Unhandled event: ${event}`);
    return NextResponse.json({ success: true, message: 'Event not handled' });
  } catch (error) {
    console.error('[Asaas Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
