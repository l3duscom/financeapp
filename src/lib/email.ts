import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'FinanceApp <noreply@financeapp.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://financeapp.vercel.app';

interface WelcomeEmailParams {
  to: string;
  name: string;
  plan: string;
  resetLink?: string;
}

export async function sendWelcomeEmail({ to, name, plan, resetLink }: WelcomeEmailParams) {
  const planLabel = plan === 'annual' ? 'Anual' : 'Mensal';
  const loginUrl = `${APP_URL}/login`;
  const firstName = name.split(' ')[0];

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Bem-vindo ao FinanceApp, ${firstName}! 🎉`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:56px;font-size:24px;color:white;">💰</div>
      <h1 style="color:#ffffff;font-size:24px;margin:16px 0 4px;">Finance<span style="color:#6366f1;">App</span></h1>
    </div>

    <!-- Card -->
    <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Olá, ${firstName}! 👋</h2>
      <p style="color:#a0a0b0;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Sua conta no <strong style="color:#fff;">FinanceApp</strong> foi criada com sucesso! 
        Agora você tem acesso completo ao seu gerenciador financeiro inteligente.
      </p>

      <!-- Plan Badge -->
      <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="color:#a0a0b0;font-size:13px;margin:0 0 4px;">Seu plano</p>
        <p style="color:#6366f1;font-size:18px;font-weight:700;margin:0;">Plano ${planLabel} ✨</p>
      </div>

      <!-- Access Info -->
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">📧 Dados de acesso:</p>
        <p style="color:#a0a0b0;font-size:14px;margin:0 0 4px;">
          <strong style="color:#d0d0e0;">Email:</strong> ${to}
        </p>
        <p style="color:#a0a0b0;font-size:14px;margin:0;">
          <strong style="color:#d0d0e0;">Senha:</strong> Defina sua senha clicando no botão abaixo
        </p>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align:center;margin-bottom:16px;">
        ${resetLink ? `
        <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:12px;">
          Definir minha senha
        </a>
        <br>
        ` : ''}
        <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;background:${resetLink ? 'transparent;border:1px solid rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)'};color:${resetLink ? '#6366f1' : 'white'};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;margin-top:8px;">
          ${resetLink ? 'Ou entre com Google' : 'Acessar o FinanceApp'}
        </a>
      </div>

      <p style="color:#707080;font-size:13px;text-align:center;margin:16px 0 0;">
        Você também pode fazer login com sua conta Google usando o mesmo email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#505060;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} FinanceApp — Seu gerenciador financeiro inteligente
      </p>
    </div>

  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Email] Error sending welcome email:', error);
      return { success: false, error };
    }

    console.log(`[Email] Welcome email sent to ${to}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return { success: false, error };
  }
}

interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetLink: string;
}

export async function sendPasswordResetEmail({ to, name, resetLink }: PasswordResetEmailParams) {
  const firstName = name?.split(' ')[0] || 'Usuário';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Redefinir sua senha — FinanceApp',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:56px;font-size:24px;color:white;">🔐</div>
      <h1 style="color:#ffffff;font-size:24px;margin:16px 0 4px;">Finance<span style="color:#6366f1;">App</span></h1>
    </div>

    <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Olá, ${firstName}!</h2>
      <p style="color:#a0a0b0;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Recebemos uma solicitação para redefinir a senha da sua conta no FinanceApp.
        Clique no botão abaixo para criar uma nova senha.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
          Redefinir minha senha
        </a>
      </div>

      <p style="color:#707080;font-size:13px;text-align:center;margin:0;">
        Se você não solicitou esta alteração, ignore este email.<br>
        Este link expira em 1 hora.
      </p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <p style="color:#505060;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} FinanceApp — Seu gerenciador financeiro inteligente
      </p>
    </div>

  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Email] Error sending reset email:', error);
      return { success: false, error };
    }

    console.log(`[Email] Reset email sent to ${to}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[Email] Failed to send reset email:', error);
    return { success: false, error };
  }
}
