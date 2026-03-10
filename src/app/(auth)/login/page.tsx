'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './login.module.css';
import { Eye, EyeOff, LogIn, Wallet } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, error, clearError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Decorative background elements */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <div className={styles.bgOrb3} />

      <div className={styles.card}>
        {/* Logo & Branding */}
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <Wallet size={32} strokeWidth={1.5} />
          </div>
          <h1 className={styles.title}>
            Finance<span className={styles.titleAccent}>App</span>
          </h1>
          <p className={styles.subtitle}>
            Seu gerenciador financeiro inteligente
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBox}>
              <span>{error}</span>
              <button
                type="button"
                onClick={clearError}
                className={styles.errorClose}
              >
                ×
              </button>
            </div>
          )}

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

          <div className={styles.inputGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="password" className={styles.label}>
                Senha
              </label>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Esqueci minha senha
              </Link>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePassword}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Ainda não tem uma conta?{' '}
            <a
              href="https://www.asaas.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Assine agora
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
