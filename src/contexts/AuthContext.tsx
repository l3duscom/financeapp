'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          let profile = userDoc.exists()
            ? ({ uid: user.uid, ...userDoc.data() } as UserProfile)
            : null;

          if (profile && (!profile.name || profile.name === 'Usuário') && user.displayName) {
            await updateDoc(userRef, { name: user.displayName });
            profile = { ...profile, name: user.displayName };
          }

          setState({
            user,
            profile,
            loading: false,
            error: null,
          });
        } catch {
          setState({
            user,
            profile: null,
            loading: false,
            error: null,
          });
        }
      } else {
        setState({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = getErrorMessage(err);
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if ((!data.name || data.name === 'Usuário') && result.user.displayName) {
          await updateDoc(userRef, {
            name: result.user.displayName,
            photoURL: result.user.photoURL || data.photoURL || '',
          });
        }
      } else {
        const userEmail = result.user.email?.toLowerCase() || '';

        // Check if there's a pending Hotmart activation
        const pendingDoc = await getDoc(doc(db, 'pendingActivations', userEmail));
        
        if (pendingDoc.exists()) {
          // User already paid via Hotmart — activate paid plan
          const pending = pendingDoc.data();
          await setDoc(doc(db, 'users', result.user.uid), {
            name: result.user.displayName || pending.name || 'Usuário',
            email: userEmail,
            photoURL: result.user.photoURL,
            createdAt: Timestamp.now(),
            subscription: {
              active: true,
              plan: pending.plan || 'monthly',
              hotmartTransaction: pending.transaction,
              activatedAt: Timestamp.now(),
            },
          });
          // Remove pending activation
          await deleteDoc(doc(db, 'pendingActivations', userEmail));
        } else {
          // No payment — create with 3-day trial
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 3);

          await setDoc(doc(db, 'users', result.user.uid), {
            name: result.user.displayName || 'Usuário',
            email: userEmail,
            photoURL: result.user.photoURL,
            createdAt: Timestamp.now(),
            subscription: {
              active: true,
              plan: 'trial',
              trialEndsAt: Timestamp.fromDate(trialEnd),
            },
          });
        }
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao enviar email');
      }
    } catch (err) {
      const message = getErrorMessage(err);
      throw new Error(message);
    }
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signInWithGoogle, signOut, resetPassword, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/invalid-email':
        return 'Email inválido.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada.';
      case 'auth/user-not-found':
        return 'Nenhuma conta encontrada com este email.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      case 'auth/invalid-credential':
        return 'Email ou senha incorretos.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.';
      default:
        return 'Erro ao fazer login. Tente novamente.';
    }
  }
  return 'Erro inesperado. Tente novamente.';
}
