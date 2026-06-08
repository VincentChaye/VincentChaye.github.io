import type { ReactNode } from 'react';
import { css } from '../lib/css';

/** Pastille de filtre de la carte (active ambre / inactive glass). */
export function FilterPill({
  active,
  shadow,
  children,
  onClick,
}: {
  active?: boolean;
  shadow?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  const base =
    'display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9999px;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0';
  const on =
    ';background:rgba(212,160,48,.80);border:1px solid rgba(255,255,255,.25);color:#1a0f05' +
    (shadow ? ';box-shadow:0 2px 12px rgba(212,160,48,.35)' : '');
  const off =
    ';background:rgba(12,8,4,.68);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.60)';
  return <div onClick={onClick} style={css(base + (active ? on : off) + (onClick ? ';cursor:pointer' : ''))}>{children}</div>;
}
