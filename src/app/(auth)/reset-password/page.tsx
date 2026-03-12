'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import styles from './reset.module.css';
import { ArrowLeft, Lock, CheckCircle, AlertTriangle, Eye, EyeOff, Check } from 'lucide-react';

type PageState = 'loading' | 'form' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p className={styles.description}>Carregando...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPwd && confirmPwd.length > 0;
  const isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  useEffect(() => {
    if (!oobCode) {
      setPageState('invalid');
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setPageState('form');
      })
      .catch(() => {
        setPageState('invalid');
      });
  }, [oobCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || !oobCode) return;

    setIsSubmitting(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPageState('success');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/expired-action-code') {
        setError('Este link expirou. Solicite um novo link de redefinição.');
      } else if (code === 'auth/weak-password') {
        setError('A senha é muito fraca. Escolha uma senha mais forte.');
      } else {
        setError('Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={styles.card}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} />
          Voltar ao login
        </Link>

        {pageState === 'loading' && (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p className={styles.description}>Verificando link...</p>
          </div>
        )}

        {pageState === 'invalid' && (
          <div className={styles.invalidState}>
            <div className={styles.invalidIcon}>
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <h1 className={styles.title}>Link inválido</h1>
            <p className={styles.description}>
              Este link de redefinição de senha é inválido ou já expirou.
              Solicite um novo link na página de recuperação de senha.
            </p>
            <Link href="/forgot-password" className={styles.retryBtn}>
              Solicitar novo link
            </Link>
          </div>
        )}

        {pageState === 'success' && (
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h1 className={styles.title}>Senha redefinida!</h1>
            <p className={styles.description}>
              Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
            </p>
            <Link href="/login" className={styles.loginBtn}>
              Fazer login
            </Link>
          </div>
        )}

        {pageState === 'form' && (
          <>
            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                <Lock size={28} strokeWidth={1.5} />
              </div>
              <h1 className={styles.title}>Nova senha</h1>
              <p className={styles.description}>
                Defina uma nova senha para sua conta
              </p>
              {email && <span className={styles.emailBadge}>{email}</span>}
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.errorBox}>{error}</div>}

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Nova senha
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className={styles.input}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className={styles.requirements}>
                  <span className={`${styles.requirement} ${hasMinLength ? styles.met : ''}`}>
                    <Check size={12} /> Mínimo 6 caracteres
                  </span>
                  <span className={`${styles.requirement} ${hasUppercase ? styles.met : ''}`}>
                    <Check size={12} /> Uma letra maiúscula
                  </span>
                  <span className={`${styles.requirement} ${hasNumber ? styles.met : ''}`}>
                    <Check size={12} /> Um número
                  </span>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirmar senha
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    className={styles.input}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPwd && !passwordsMatch && (
                  <span className={styles.requirement}>As senhas não coincidem</span>
                )}
                {passwordsMatch && (
                  <span className={`${styles.requirement} ${styles.met}`}>
                    <Check size={12} /> Senhas coincidem
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting ? (
                  <span className={styles.spinner} />
                ) : (
                  'Redefinir senha'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
