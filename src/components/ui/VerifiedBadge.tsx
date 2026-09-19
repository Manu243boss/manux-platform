import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  className = '',
  showTooltip = true,
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4.5 h-4.5',
    md: 'w-5 h-5',
    lg: 'w-6.5 h-6.5',
    xl: 'w-8 h-8',
  };

  return (
    <span
      title={showTooltip ? 'Compte Vérifié & Certifié ManuX' : undefined}
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeMap[size]} ${className}`}
    >
      {/* Official Rosette / Starburst Verified Badge with Checkmark */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xs"
      >
        <path
          d="M10.29 2.308a2.23 2.23 0 0 1 3.42 0l.662.774a2.23 2.23 0 0 0 1.956.76l1.011-.115a2.23 2.23 0 0 1 2.42 2.42l-.115 1.011a2.23 2.23 0 0 0 .76 1.956l.774.662a2.23 2.23 0 0 1 0 3.42l-.774.662a2.23 2.23 0 0 0-.76 1.956l.115 1.011a2.23 2.23 0 0 1-2.42 2.42l-1.011-.115a2.23 2.23 0 0 0-1.956.76l-.662.774a2.23 2.23 0 0 1-3.42 0l-.662-.774a2.23 2.23 0 0 0-1.956-.76l-1.011.115a2.23 2.23 0 0 1-2.42-2.42l.115-1.011a2.23 2.23 0 0 0-.76-1.956l-.774-.662a2.23 2.23 0 0 1 0-3.42l.774-.662a2.23 2.23 0 0 0 .76-1.956l-.115-1.011a2.23 2.23 0 0 1 2.42-2.42l1.011.115a2.23 2.23 0 0 0 1.956-.76l.662-.774Z"
          fill="url(#manux_verified_gradient)"
        />
        <path
          d="M8.5 12.25L10.75 14.5L15.75 9.5"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="manux_verified_gradient"
            x1="2"
            y1="2"
            x2="22"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B82F6" />
            <stop offset="0.5" stopColor="#2563EB" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
};
