import React from 'react';

export function MithaqLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="emeraldGrad" x1="15" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#022C22" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="85" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      
      {/* Left Leaf - Emerald */}
      <path d="M 50 90 C 10 90 10 20 50 5 C 50 45 30 65 50 90 Z" fill="url(#emeraldGrad)" />
      
      {/* Right Leaf - Gold */}
      <path d="M 50 90 C 90 90 90 20 50 5 C 50 45 70 65 50 90 Z" fill="url(#goldGrad)" />
      
      {/* Center Accent Line - Soft White */}
      <path d="M 50 5 L 50 90" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
