'use client';

import { useCallback } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (maskedValue: string, numericValue: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  const reais = (cents / 100).toFixed(2);
  const [intPart, decPart] = reais.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formattedInt},${decPart}`;
}

export function parseCurrency(masked: string): number {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  autoFocus,
  id,
  style,
}: CurrencyInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCurrency(e.target.value);
      const numeric = parseCurrency(masked);
      onChange(masked, numeric);
    },
    [onChange]
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      id={id}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      autoFocus={autoFocus}
      style={style}
    />
  );
}
