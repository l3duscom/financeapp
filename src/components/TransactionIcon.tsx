'use client';

import { useState } from 'react';
import { getTransactionEmoji, getTransactionBrandLogo, getTransactionBrandLogoFallback } from '@/lib/emoji';

interface TransactionIconProps {
  description: string;
  category: string;
  size?: number;
}

export default function TransactionIcon({ description, category, size = 20 }: TransactionIconProps) {
  const [stage, setStage] = useState<'logo' | 'fallback' | 'emoji'>('logo');
  const [loaded, setLoaded] = useState(false);

  const logo = getTransactionBrandLogo(description);
  const fallback = getTransactionBrandLogoFallback(description);
  const emoji = getTransactionEmoji(description, category);

  const currentSrc =
    stage === 'logo' ? logo :
    stage === 'fallback' ? fallback :
    null;

  if (currentSrc) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          flexShrink: 0,
          fontSize: size,
          lineHeight: 1,
        }}
      >
        {!loaded && emoji}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            if (stage === 'logo' && fallback) {
              setStage('fallback');
            } else {
              setStage('emoji');
            }
          }}
          style={{
            borderRadius: 4,
            objectFit: 'contain',
            display: loaded ? 'block' : 'none',
          }}
        />
      </span>
    );
  }

  return (
    <span style={{ fontSize: size, lineHeight: 1, flexShrink: 0 }}>
      {emoji}
    </span>
  );
}
