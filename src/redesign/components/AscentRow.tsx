import type { ReactNode } from 'react';
import { css } from '../lib/css';

/** Ligne « dernière ascension » du Carnet (proto l.679-682). */
export function AscentRow({
  grade,
  gradeBoxStyle,
  gradeColor,
  name,
  tag,
  location,
  date,
}: {
  grade: string;
  gradeBoxStyle: string;
  gradeColor: string;
  name: string;
  tag: ReactNode;
  location: string;
  date: string;
}) {
  return (
    <div className="g" style={css('border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px')}>
      <div style={css(`width:44px;height:44px;border-radius:13px;${gradeBoxStyle};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${gradeColor};flex-shrink:0;position:relative;z-index:2`)}>{grade}</div>
      <div style={css('flex:1;position:relative;z-index:2')}>
        <div style={css('font-size:15px;font-weight:600;color:#f0ece6;margin-bottom:3px')}>{name}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6);display:flex;align-items:center;gap:8px')}>{tag}{location}</div>
      </div>
      <div style={css('font-size:11px;color:rgba(240,236,230,.6);position:relative;z-index:2;flex-shrink:0')}>{date}</div>
    </div>
  );
}
