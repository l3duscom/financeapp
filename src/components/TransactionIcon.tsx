'use client';

import { useState } from 'react';
import { getTransactionEmoji, getTransactionBrandLogo } from '@/lib/emoji';

interface TransactionIconProps {
  description: string;
  category: string;
  size?: number;
}

export default function TransactionIcon({ description, category, size = 20 }: TransactionIconProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const logo = getTransactionBrandLogo(description);
  const emoji = getTransactionEmoji(description, category);

  if (logo && !imgError) {
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
        {!imgLoaded && emoji}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          style={{
            borderRadius: 4,
            objectFit: 'contain',
            display: imgLoaded ? 'block' : 'none',
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
