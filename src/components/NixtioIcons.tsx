import React from 'react';

// Top-left minimalist black abstract logo with two angled bars
export const NixtioGlyphLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    {/* Left angular bar */}
    <path
      d="M6 6L12 12L7.5 17"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right slanted bar */}
    <path
      d="M17.5 6L12 18"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
  </svg>
);

// Circular black brand icon with white stylized "N"
export const NixtioLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-sm ${className}`}
  >
    <svg
      width={Math.round(size * 0.55)}
      height={Math.round(size * 0.55)}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M4 16V4L16 16V4"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
