import { css } from '../lib/css';

/** Barre de la pyramide de cotations du Carnet (proto l.669-673). */
export function PyramidBar({
  grade,
  pct,
  count,
  glow,
}: {
  grade: string;
  pct: string;
  count: string;
  glow?: boolean;
}) {
  return (
    <div style={css('display:flex;align-items:center;gap:10px')}>
      <div style={css('font-size:11px;font-weight:700;color:rgba(240,236,230,.6);width:24px;text-align:right')}>{grade}</div>
      <div style={css('flex:1;height:10px;background:rgba(255,255,255,.07);border-radius:5px;overflow:hidden')}>
        <div style={css(`height:100%;width:${pct};border-radius:5px;background:linear-gradient(90deg,rgba(212,160,48,.7),rgba(232,184,75,.9))${glow ? ';box-shadow:0 0 8px rgba(212,160,48,.25)' : ''}`)} />
      </div>
      <div style={css('font-size:11px;font-weight:600;color:rgba(240,236,230,.5);width:20px')}>{count}</div>
    </div>
  );
}
