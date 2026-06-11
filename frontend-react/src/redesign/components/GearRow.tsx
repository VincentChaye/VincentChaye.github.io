import type { ReactNode } from 'react';
import { css } from '../lib/css';

/** Ligne d'équipement (EPI) de l'écran Matériel (proto l.1402-1424). */
export function GearRow({
  iconBox,
  icon,
  name,
  sub,
  badge,
  badgeStyle,
  border,
}: {
  iconBox: string;
  icon: ReactNode;
  name: string;
  sub: string;
  badge: string;
  badgeStyle: string;
  border?: boolean;
}) {
  return (
    <div style={css(`padding:14px 16px;display:flex;align-items:center;gap:14px;${border ? 'border-bottom:1px solid rgba(255,255,255,.05);' : ''}cursor:pointer;position:relative;z-index:2`)}>
      <div style={css(`width:40px;height:40px;border-radius:12px;${iconBox};display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>{icon}</div>
      <div style={css('flex:1')}>
        <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:2px')}>{name}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>{sub}</div>
      </div>
      <span style={css(badgeStyle)}>{badge}</span>
    </div>
  );
}
