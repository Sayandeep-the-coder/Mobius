import React from 'react';

interface MobiusLogoProps {
  className?: string;
  size?: number;
  white?: boolean;
}

export function MobiusLogo({ className = 'size-8', size = 32, white = false }: MobiusLogoProps) {
  if (white) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Front loop of the Möbius strip */}
        <path
          d="M15 13C8.925 13 4 17.925 4 24s4.925 11 11 11c5.2 0 9.2-3.4 12.8-8.8L30 24l-2.2-2.2C24.2 16.4 20.2 13 15 13Z"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Intertwined back loop creating the single-surface twisted ribbon */}
        <path
          d="M33 35c6.075 0 11-4.925 11-11s-4.925-11-11-11c-5.2 0-9.2 3.4-12.8 8.8L18 24l2.2 2.2C23.8 31.6 27.8 35 33 35Z"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />
        {/* Dynamic central cross overlap */}
        <path
          d="M21 21L27 27"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Front loop of the Möbius strip */}
      <path
        d="M15 13C8.925 13 4 17.925 4 24s4.925 11 11 11c5.2 0 9.2-3.4 12.8-8.8L30 24l-2.2-2.2C24.2 16.4 20.2 13 15 13Z"
        stroke="url(#mobius-grad-1)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Intertwined back loop creating the single-surface twisted ribbon */}
      <path
        d="M33 35c6.075 0 11-4.925 11-11s-4.925-11-11-11c-5.2 0-9.2 3.4-12.8 8.8L18 24l2.2 2.2C23.8 31.6 27.8 35 33 35Z"
        stroke="url(#mobius-grad-2)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dynamic central cross overlap */}
      <path
        d="M21 21L27 27"
        stroke="#DDD7FE"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="mobius-grad-1" x1="4" y1="13" x2="30" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#836EF9" />
          <stop offset="1" stopColor="#6E54FF" />
        </linearGradient>
        <linearGradient id="mobius-grad-2" x1="44" y1="35" x2="18" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A594FD" />
          <stop offset="1" stopColor="#836EF9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
