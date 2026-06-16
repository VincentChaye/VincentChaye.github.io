import type { ReactNode } from 'react';
import { css } from '../lib/css';

/** Ligne de menu du Profil (proto l.947-953) : pastille icône + libellé + chevron. */
export function ProfileMenuRow({
  iconBox,
  iconColor,
  icon,
  label,
  labelColor = '#f0ece6',
  marginTop,
  onClick,
}: {
  iconBox: string;
  iconColor: string;
  icon: ReactNode;
  label: string;
  labelColor?: string;
  marginTop?: boolean;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className="g" style={css(`border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;cursor:pointer${marginTop ? ';margin-top:4px' : ''}`)}>
      <div style={css(`width:36px;height:36px;border-radius:11px;${iconBox};display:flex;align-items:center;justify-content:center;color:${iconColor};flex-shrink:0;position:relative;z-index:2`)}>{icon}</div>
      <div style={css(`flex:1;font-size:15px;font-weight:600;color:${labelColor};position:relative;z-index:2`)}>{label}</div>
      <div style={css('color:rgba(240,236,230,.22);font-size:18px;position:relative;z-index:2')}>›</div>
    </div>
  );
}
