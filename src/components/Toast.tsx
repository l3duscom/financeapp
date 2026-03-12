'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ type, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (!message || duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span className={styles.message}>{message}</span>
      <button onClick={onClose} className={styles.close}><X size={14} /></button>
    </div>
  );
}
