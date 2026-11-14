import React from 'react';

interface CamelliaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Original Camellia Neural Garden botanical + circuit mark (inline SVG, zero external assets).
 */
export const CamelliaLogo: React.FC<CamelliaLogoProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="camellia-petal-teal" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="camellia-rose-core" x1="12" y1="10" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>

      {/* Outer subtle circuit ring */}
      <circle
        cx="18"
        cy="18"
        r="16.25"
        stroke="url(#camellia-petal-teal)"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Five symmetric camellia petals with fine vector veins */}
      <path
        d="M18 4.5C21.2 4.5 23.2 8.2 21.6 13.4C20.4 14.3 15.6 14.3 14.4 13.4C12.8 8.2 14.8 4.5 18 4.5Z"
        stroke="url(#camellia-petal-teal)"
        strokeWidth="1.4"
        fill="url(#camellia-petal-teal)"
        fillOpacity="0.12"
      />
      <path
        d="M30.8 13.8C31.8 16.8 29 19.9 23.6 20.1C22.4 19.2 20.9 14.6 21.4 13.2C25.8 10.1 29.8 10.8 30.8 13.8Z"
        stroke="url(#camellia-petal-teal)"
        strokeWidth="1.4"
        fill="url(#camellia-petal-teal)"
        fillOpacity="0.12"
      />
      <path
        d="M25.9 28.9C23.3 30.8 19.4 29 17.6 23.9C18.1 22.5 22.1 19.6 23.6 19.7C27.9 22.9 28.5 27 25.9 28.9Z"
        stroke="url(#camellia-petal-teal)"
        strokeWidth="1.4"
        fill="url(#camellia-petal-teal)"
        fillOpacity="0.12"
      />
      <path
        d="M10.1 28.9C7.5 27 8.1 22.9 12.4 19.7C13.9 19.6 17.9 22.5 18.4 23.9C16.6 29 12.7 30.8 10.1 28.9Z"
        stroke="url(#camellia-petal-teal)"
        strokeWidth="1.4"
        fill="url(#camellia-petal-teal)"
        fillOpacity="0.12"
      />
      <path
        d="M5.2 13.8C6.2 10.8 10.2 10.1 14.6 13.2C15.1 14.6 13.6 19.2 12.4 20.1C7 19.9 4.2 16.8 5.2 13.8Z"
        stroke="url(#camellia-petal-teal)"
        strokeWidth="1.4"
        fill="url(#camellia-petal-teal)"
        fillOpacity="0.12"
      />

      {/* Precision neural trace nodes */}
      <circle cx="18" cy="18" r="2.75" fill="url(#camellia-rose-core)" />
      <circle cx="18" cy="8.5" r="1.1" fill="#2DD4BF" />
      <circle cx="26.5" cy="15.2" r="1.1" fill="#A78BFA" />
      <circle cx="23.2" cy="25.2" r="1.1" fill="#2DD4BF" />
      <circle cx="12.8" cy="25.2" r="1.1" fill="#FB7185" />
      <circle cx="9.5" cy="15.2" r="1.1" fill="#2DD4BF" />
    </svg>
  );
};
