import type { ReactNode } from 'react';
import { GlassCard } from './primitives';
import { css } from '../lib/css';

/** Ligne « Voie d'escalade » du détail spot : badge de cotation coloré + nom + méta + tag. */
export interface RouteRowProps {
  grade: string;
  gradeBg: string;
  gradeBorder: string;
  gradeColor: string;
  name: string;
  meta: string;
  tag: ReactNode;
}

export function RouteRow({ grade, gradeBg, gradeBorder, gradeColor, name, meta, tag }: RouteRowProps) {
  return (
    <GlassCard style={css('border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px')}>
      <div
        style={css(
          `width:44px;height:44px;border-radius:13px;background:${gradeBg};border:1px solid ${gradeBorder};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${gradeColor};flex-shrink:0`,
        )}
      >
        {grade}
      </div>
      <div style={css('flex:1')}>
        <div style={css('font-size:15px;font-weight:600;color:#f0ece6;margin-bottom:2px')}>{name}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.45)')}>{meta}</div>
      </div>
      {tag}
    </GlassCard>
  );
}
