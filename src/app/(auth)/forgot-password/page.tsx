'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './forgot.module.css';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email.');
    } finally {
      setIsLoading(false);
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

        {sent ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h1 className={styles.title}>Email enviado!</h1>
            <p className={styles.description}>
              Enviamos um link de redefinição de senha para{' '}
              <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <Link href="/login" className={styles.returnBtn}>
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                <Mail size={28} strokeWidth={1.5} />
              </div>
              <h1 className={styles.title}>Recuperar senha</h1>
              <p className={styles.description}>
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.errorBox}>{error}</div>}

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={styles.input}
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className={styles.spinner} />
                ) : (
                  'Enviar link de recuperação'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
