import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const normalizedEmail = email.toLowerCase();

    // Verify user exists
    let userName = 'Usuário';
    try {
      const user = await adminAuth.getUserByEmail(normalizedEmail);
      userName = user.displayName || 'Usuário';
    } catch {
      // Don't reveal if user exists or not (security)
      return NextResponse.json({ success: true });
    }

    // Also try to get name from Firestore
    try {
      const adminDb = getAdminDb();
      const usersSnapshot = await adminDb
        .collection('users')
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        userName = usersSnapshot.docs[0].data().name || userName;
      }
    } catch {
      // ignore
    }

    // Generate reset link via Firebase Admin
    const resetLink = await adminAuth.generatePasswordResetLink(normalizedEmail);

    // Send via Resend
    await sendPasswordResetEmail({
      to: normalizedEmail,
      name: userName,
      resetLink,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
  }
}
