import type { ReactNode } from 'react';
import { GlassCard } from './primitives';
import { css } from '../lib/css';

/** Carte « Fonctionnalités » de l'accueil (grille 2 colonnes, parfois pleine largeur). */
export interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  desc: string;
  fullWidth?: boolean;
  onClick?: () => void;
}

export function FeatureCard({ icon, title, desc, fullWidth, onClick }: FeatureCardProps) {
  const base = 'border-radius:26px;padding:22px 18px;cursor:pointer';
  return (
    <GlassCard onClick={onClick} style={css(fullWidth ? `${base};grid-column:1/-1` : base)}>
      <div style={css('width:44px;height:44px;border-radius:13px;background:rgba(212,160,48,.10);border:1px solid rgba(212,160,48,.20);display:flex;align-items:center;justify-content:center;color:#D4A030;margin-bottom:16px')}>
        {icon}
      </div>
      <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:7px')}>{title}</div>
      <div style={css('font-size:13px;line-height:1.5;color:rgba(240,236,230,.50)')}>{desc}</div>
    </GlassCard>
  );
}
