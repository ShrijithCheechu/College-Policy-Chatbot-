import React from 'react';

export const CrestLogo = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="shieldBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    {/* Outer Shield Border */}
    <path
      d="M50 5 L88 20 C88 58 72 82 50 95 C28 82 12 58 12 20 Z"
      fill="url(#crestGold)"
    />
    {/* Inner Shield */}
    <path
      d="M50 11 L82 23 C82 55 68 76 50 88 C32 76 18 55 18 23 Z"
      fill="url(#shieldBg)"
    />
    {/* Book / Knowledge Icon */}
    <path
      d="M32 44 C40 40 48 42 50 45 C52 42 60 40 68 44 V68 C60 64 52 66 50 69 C48 66 40 64 32 68 Z"
      fill="#fde68a"
    />
    <line x1="50" y1="45" x2="50" y2="69" stroke="#b45309" strokeWidth="2" />
    {/* Star / Torch */}
    <polygon points="50,26 53,34 61,34 54,39 57,47 50,42 43,47 46,39 39,34 47,34" fill="#fbbf24" />
    {/* Laurel Leaves */}
    <path d="M22 36 Q18 50 26 64" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M78 36 Q82 50 74 64" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const RobotAvatar = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="botBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#3b82f6" />
      </radialGradient>
    </defs>
    {/* Antenna */}
    <line x1="50" y1="8" x2="50" y2="22" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="7" r="6" fill="#38bdf8" />
    {/* Head Outline */}
    <rect x="18" y="22" width="64" height="52" rx="20" fill="white" stroke="#2563eb" strokeWidth="4" />
    {/* Visor Area */}
    <rect x="25" y="32" width="50" height="28" rx="12" fill="#0f172a" />
    {/* Glowing Eyes */}
    <circle cx="39" cy="46" r="6.5" fill="url(#eyeGlow)" />
    <circle cx="61" cy="46" r="6.5" fill="url(#eyeGlow)" />
    <circle cx="41" cy="44" r="2" fill="white" />
    <circle cx="63" cy="44" r="2" fill="white" />
    {/* Ears / Side nodules */}
    <rect x="11" y="40" width="7" height="16" rx="3.5" fill="#3b82f6" />
    <rect x="82" y="40" width="7" height="16" rx="3.5" fill="#3b82f6" />
    {/* Smile */}
    <path d="M43 64 Q50 70 57 64" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Chest / Collar */}
    <path d="M30 76 L70 76 L78 96 L22 96 Z" fill="url(#botBlue)" rx="6" />
    <circle cx="50" cy="86" r="4" fill="white" />
  </svg>
);
