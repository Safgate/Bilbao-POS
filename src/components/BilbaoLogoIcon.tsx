import React from 'react';

/**
 * Modern Basque Mark
 * Circular badge with a stylized "B":
 *   - Fork   → left vertical spine of the B  (terracotta #C65A2E)
 *   - Upper bowl → smooth Guggenheim-arch     (terracotta #C65A2E)
 *   - Lower bowl → ocean-wave fill            (deep navy  #0E2A47)
 * Background: soft cream #F4EFEA
 */
export const BilbaoLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <defs>
      {/* Clip everything to the circle badge */}
      <clipPath id="bilbao-badge-clip">
        <circle cx="60" cy="60" r="56" />
      </clipPath>
    </defs>

    {/* ── Soft cream badge background ── */}
    <circle cx="60" cy="60" r="58" fill="#F4EFEA" />
    {/* Subtle inner border */}
    <circle cx="60" cy="60" r="57" fill="none" stroke="#DDD5CB" strokeWidth="1" />

    <g clipPath="url(#bilbao-badge-clip)">

      {/* ══════════════════════════════════════════
          FORK  — the left spine / stroke of the B
          Three tines at top; the centre tine
          extends all the way down as the handle.
          ══════════════════════════════════════════ */}

      {/* Left tine */}
      <rect x="19" y="20" width="5" height="24" rx="2.5" fill="#C65A2E" />
      {/* Centre tine + handle (full-height spine) */}
      <rect x="27" y="20" width="6" height="80" rx="3"   fill="#C65A2E" />
      {/* Right tine */}
      <rect x="36" y="20" width="5" height="24" rx="2.5" fill="#C65A2E" />

      {/* ══════════════════════════════════════════
          UPPER BOWL  — Guggenheim-arch, terracotta
          D-shape on the right side of the spine,
          occupying the upper half of the badge.
          ══════════════════════════════════════════ */}

      {/* Outer filled arch */}
      <path
        d="
          M 33 24
          C 58 14, 96 20, 100 40
          C 104 54, 90 64, 33 63
          Z
        "
        fill="#C65A2E"
      />
      {/* Inner cream cutout → creates the hollow bowl (letter-B feel) */}
      <path
        d="
          M 38 31
          C 60 22, 90 28, 92 42
          C 94 54, 80 58, 38 57
          Z
        "
        fill="#F4EFEA"
      />

      {/* ══════════════════════════════════════════
          LOWER BOWL  — ocean waves, deep navy
          D-shape on the right side of the spine,
          occupying the lower half of the badge.
          ══════════════════════════════════════════ */}

      {/* Solid navy bowl */}
      <path
        d="
          M 33 65
          C 66 58, 100 66, 104 80
          C 108 93, 88 106, 33 100
          Z
        "
        fill="#0E2A47"
      />

      {/* Three cream wave lines — evenly spaced, opacity fades toward bottom */}
      <path
        d="M 42 73 C 56 69, 72 73, 87 70"
        stroke="#F4EFEA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.65"
      />
      <path
        d="M 41 82 C 55 78, 72 82, 88 79"
        stroke="#F4EFEA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.42"
      />
      <path
        d="M 41 91 C 56 87, 73 91, 89 88"
        stroke="#F4EFEA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.22"
      />

    </g>
  </svg>
);
