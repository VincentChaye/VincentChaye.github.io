import type { ReactNode } from 'react';
import { GlassCard } from './primitives';
import { css } from '../lib/css';

/** Ligne « Ton espace » de l'accueil : icône `.qi` + titre + sous-titre + chevron. */
export interface ListRowProps {
  icon: ReactNode;
  title: string;
  subtitle: ReactNode;
  onClick?: () => void;
}

export function ListRow({ icon, title, subtitle, onClick }: ListRowProps) {
  return (
    <GlassCard
      onClick={onClick}
      style={css('border-radius:20px;padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer')}
    >
      <div className="qi">{icon}</div>
      <div style={css('flex:1')}>
        <div style={css('font-size:15px;font-weight:600;color:#f0ece6;margin-bottom:2px')}>{title}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>{subtitle}</div>
      </div>
      <div style={css('color:rgba(240,236,230,.6);font-size:18px')}>›</div>
    </GlassCard>
  );
}
