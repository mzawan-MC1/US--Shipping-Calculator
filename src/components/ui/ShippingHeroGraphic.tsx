import React from 'react';

/**
 * Lightweight, original SVG shipping illustration.
 * Represents maritime container transit (USA to UAE) with a modern vehicle silhouette.
 * 100% vector, zero external asset dependencies, fast rendering.
 */
export const ShippingHeroGraphic: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full max-w-lg mx-auto select-none ${className}`}>
      <svg
        viewBox="0 0 600 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F2447" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#071224" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0C2340" />
            <stop offset="100%" stopColor="#05101E" />
          </linearGradient>
          <linearGradient id="hullGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        </defs>

        {/* Ocean Surface */}
        <rect x="0" y="210" width="600" height="110" fill="url(#seaGrad)" />
        <path
          d="M0 215 C100 212, 200 218, 300 215 C400 212, 500 218, 600 215 L600 320 L0 320 Z"
          fill="#07182C"
          opacity="0.6"
        />

        {/* Distant Skyline Silhouette (Sharjah / Dubai coastal towers) */}
        <g opacity="0.3" fill="#334155">
          <rect x="420" y="110" width="12" height="100" rx="1" />
          <polygon points="426,90 420,110 432,110" />
          <rect x="440" y="130" width="18" height="80" rx="2" />
          <rect x="465" y="100" width="22" height="110" rx="2" />
          <polygon points="476,75 465,100 487,100" />
          <rect x="495" y="120" width="14" height="90" rx="1" />
          <rect x="520" y="145" width="20" height="65" rx="2" />
          <circle cx="480" cy="55" r="28" fill="#F8FAFC" opacity="0.08" />
        </g>

        {/* Cargo Container Ship */}
        <g id="containerShip">
          {/* Bridge / Superstructure */}
          <rect x="80" y="110" width="55" height="75" rx="4" fill="#F8FAFC" />
          <rect x="85" y="118" width="45" height="10" rx="2" fill="#0284C7" opacity="0.8" />
          <rect x="98" y="85" width="18" height="25" fill="#DC2626" />
          <rect x="94" y="80" width="26" height="5" rx="1" fill="#1E293B" />
          <line x1="107" y1="65" x2="107" y2="80" stroke="#94A3B8" strokeWidth="2" />

          {/* Stacked Shipping Containers (Tier 1 & 2) */}
          <rect x="145" y="145" width="50" height="24" rx="2" fill="url(#orangeGrad)" />
          <rect x="198" y="145" width="50" height="24" rx="2" fill="#2563EB" />
          <rect x="251" y="145" width="50" height="24" rx="2" fill="#16A34A" />
          <rect x="304" y="145" width="50" height="24" rx="2" fill="url(#orangeGrad)" />
          <rect x="357" y="145" width="45" height="24" rx="2" fill="#2563EB" />

          {/* Tier 2 */}
          <rect x="150" y="120" width="48" height="23" rx="2" fill="#2563EB" />
          <rect x="202" y="120" width="48" height="23" rx="2" fill="url(#orangeGrad)" />
          <rect x="254" y="120" width="48" height="23" rx="2" fill="#E2E8F0" />
          <rect x="306" y="120" width="48" height="23" rx="2" fill="#16A34A" />

          {/* Container Rib Lines */}
          <line
            x1="160"
            y1="145"
            x2="160"
            y2="169"
            stroke="#000"
            opacity="0.15"
            strokeWidth="1.5"
          />
          <line
            x1="175"
            y1="145"
            x2="175"
            y2="169"
            stroke="#000"
            opacity="0.15"
            strokeWidth="1.5"
          />
          <line
            x1="215"
            y1="145"
            x2="215"
            y2="169"
            stroke="#000"
            opacity="0.15"
            strokeWidth="1.5"
          />
          <line
            x1="230"
            y1="145"
            x2="230"
            y2="169"
            stroke="#000"
            opacity="0.15"
            strokeWidth="1.5"
          />
          <line
            x1="270"
            y1="145"
            x2="270"
            y2="169"
            stroke="#000"
            opacity="0.15"
            strokeWidth="1.5"
          />

          {/* Ship Hull */}
          <path d="M50 185 L440 185 L490 205 L450 235 L70 235 Z" fill="url(#hullGrad)" />
          {/* Red Antifouling Bottom Line */}
          <path d="M70 230 L450 230 L445 235 L70 235 Z" fill="#DC2626" />
          {/* Waterline Wake */}
          <path
            d="M40 235 C120 233, 280 237, 510 235"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>

        {/* Foreground Modern Vehicle Silhouette */}
        <g id="foregroundVehicle" transform="translate(160, 175) scale(0.72)">
          {/* Car Shadow */}
          <ellipse cx="230" cy="115" rx="190" ry="12" fill="#000000" opacity="0.6" />

          {/* Main Car Body */}
          <path
            d="M50 85 C65 65, 110 50, 160 48 L220 30 C250 22, 330 22, 360 38 L400 55 C430 62, 450 72, 455 85 L450 102 C440 108, 430 110, 420 110 C410 110, 395 90, 370 90 C345 90, 330 110, 200 110 C190 110, 175 90, 150 90 C125 90, 110 110, 70 110 C55 110, 45 100, 50 85 Z"
            fill="url(#carBodyGrad)"
          />

          {/* Cabin Glass & Roofline */}
          <path
            d="M175 48 L225 32 C250 25, 320 25, 350 38 L385 52 C370 54, 210 54, 175 48 Z"
            fill="#0F172A"
          />
          <path d="M235 34 L325 34 L335 48 L225 48 Z" fill="#38BDF8" opacity="0.3" />

          {/* Headlights & Tail accents */}
          <polygon points="440,78 454,82 448,88 435,85" fill="#38BDF8" />
          <polygon points="54,82 65,80 62,88 52,86" fill="#EF4444" />

          {/* Front Wheel */}
          <circle cx="370" cy="98" r="26" fill="#0F172A" />
          <circle cx="370" cy="98" r="18" fill="#475569" />
          <circle cx="370" cy="98" r="10" fill="#E2E8F0" />

          {/* Rear Wheel */}
          <circle cx="150" cy="98" r="26" fill="#0F172A" />
          <circle cx="150" cy="98" r="18" fill="#475569" />
          <circle cx="150" cy="98" r="10" fill="#E2E8F0" />
        </g>
      </svg>
    </div>
  );
};
