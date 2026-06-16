import type { ReactNode } from 'react';
import { GlassCard } from './primitives';
import { css } from '../lib/css';

/** Grille de stats 3 colonnes de l'accueil (`.g` + dividers verticaux). */
export interface StatItem {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
}

export function StatsGrid({ items }: { items: StatItem[] }) {
  return (
    <GlassCard
      style={css('margin:28px 20px 0;border-radius:26px;padding:24px 16px;display:grid;grid-template-columns:repeat(3,1fr)')}
    >
      {items.map((it, i) => (
        <div key={i} style={css('text-align:center;padding:4px 8px;position:relative')}>
          <div style={css('color:rgba(212,160,48,.75);margin-bottom:6px')}>{it.icon}</div>
          <div style={css('font-size:26px;font-weight:800;letter-spacing:-1px;color:#f0ece6;margin-bottom:3px')}>
            {it.value}
          </div>
          <div style={css('font-size:10px;font-weight:500;color:rgba(240,236,230,.6);text-transform:uppercase;letter-spacing:.7px')}>
            {it.label}
          </div>
          {i < items.length - 1 && (
            <div style={css('position:absolute;right:0;top:15%;bottom:15%;width:1px;background:linear-gradient(180deg,transparent,rgba(212,160,48,.25),transparent)')} />
          )}
        </div>
      ))}
    </GlassCard>
  );
}
