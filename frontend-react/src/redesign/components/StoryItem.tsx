import type { ReactNode } from 'react';
import { css } from '../lib/css';

/** Story circulaire de l'écran Social (proto l.566-585). `circleStyle` = bg/bord/ombre/couleur du cercle. */
export function StoryItem({
  circleStyle,
  label,
  labelColor,
  children,
}: {
  circleStyle: string;
  label: string;
  labelColor: string;
  children?: ReactNode;
}) {
  return (
    <div style={css('display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;cursor:pointer')}>
      <div style={css(`width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;${circleStyle}`)}>
        {children}
      </div>
      <div style={css(`font-size:10px;color:${labelColor};font-weight:500;white-space:nowrap`)}>{label}</div>
    </div>
  );
}
