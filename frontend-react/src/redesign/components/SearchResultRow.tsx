import type { ReactNode } from 'react';
import { css } from '../lib/css';

/** Ligne de résultat de recherche (proto l.767-791). */
export function SearchResultRow({
  thumbStyle,
  name,
  tag,
  meta,
  onClick,
}: {
  thumbStyle: string;
  name: string;
  tag: ReactNode;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className="g" style={css('border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer')}>
      <div style={css(`width:50px;height:50px;border-radius:14px;${thumbStyle};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0`)} />
      <div style={css('flex:1;position:relative;z-index:2')}>
        <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{name}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6);display:flex;align-items:center;gap:8px')}>{tag}{meta}</div>
      </div>
      <div style={css('font-size:13px;color:rgba(240,236,230,.6)')}>›</div>
    </div>
  );
}
