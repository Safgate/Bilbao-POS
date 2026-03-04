import React from 'react';
import { BilbaoLogoIcon } from './BilbaoLogoIcon';

interface BilbaoLogoProps {
  /** Show only the circular icon badge (for small POS buttons, favicons, etc.) */
  iconOnly?: boolean;
  /** Size of the icon in pixels (default 36) */
  size?: number;
}

export const BilbaoLogo: React.FC<BilbaoLogoProps> = ({ iconOnly = false, size = 36 }) => {
  if (iconOnly) {
    return (
      <BilbaoLogoIcon
        style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <BilbaoLogoIcon style={{ width: size, height: size, flexShrink: 0 }} />
      <span
        style={{
          fontFamily: "'Poppins', 'Montserrat', system-ui, -apple-system, sans-serif",
          letterSpacing: '0.18em',
          fontWeight: 700,
          fontSize: size * 0.5,
          color: '#F4EFEA',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        BILBAO
      </span>
    </div>
  );
};
