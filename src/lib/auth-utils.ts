const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://financeapp.vercel.app';

/**
 * Extracts the oobCode from a Firebase password reset link
 * and builds a URL pointing to the app's own reset-password page.
 */
export function buildAppResetLink(firebaseLink: string): string {
  try {
    const url = new URL(firebaseLink);
    const oobCode = url.searchParams.get('oobCode');

    if (!oobCode) {
      console.warn('[auth-utils] oobCode not found in Firebase link, returning original');
      return firebaseLink;
    }

    return `${APP_URL}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
  } catch {
    console.error('[auth-utils] Failed to parse Firebase link:', firebaseLink);
    return firebaseLink;
  }
}
