"use client";

/** Cinematic rooftop + panels silhouette (inline SVG, no external assets). */
export function RooftopIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="hariharSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hariharRoof" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="hariharPanel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#042f2e" stopOpacity="1" />
        </linearGradient>
        <filter id="hariharGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="480" height="220" fill="url(#hariharSky)" />
      <path
        d="M40 160 L240 72 L440 160 L440 200 L40 200 Z"
        fill="url(#hariharRoof)"
        stroke="rgba(148,163,184,0.25)"
        strokeWidth="1"
      />
      <path d="M56 158 L240 84 L424 158" stroke="rgba(56,189,248,0.15)" strokeWidth="1" />
      <g filter="url(#hariharGlow)" opacity="0.92">
        <rect x="100" y="118" width="52" height="28" rx="3" fill="url(#hariharPanel)" stroke="rgba(45,212,191,0.35)" />
        <rect x="158" y="112" width="52" height="28" rx="3" fill="url(#hariharPanel)" stroke="rgba(45,212,191,0.35)" />
        <rect x="216" y="106" width="52" height="28" rx="3" fill="url(#hariharPanel)" stroke="rgba(45,212,191,0.35)" />
        <rect x="274" y="112" width="52" height="28" rx="3" fill="url(#hariharPanel)" stroke="rgba(45,212,191,0.35)" />
        <rect x="332" y="118" width="52" height="28" rx="3" fill="url(#hariharPanel)" stroke="rgba(45,212,191,0.35)" />
      </g>
      <ellipse cx="240" cy="198" rx="160" ry="10" fill="black" fillOpacity="0.35" />
    </svg>
  );
}
