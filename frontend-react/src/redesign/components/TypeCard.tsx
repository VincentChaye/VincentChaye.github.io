import { css } from '../lib/css';

const CHECK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a0f05" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
);

/** Carte de sélection de type de spot (proto l.810-830). `selected` = carte active (ambre + check). */
export function TypeCard({
  selected,
  iconStyle,
  title,
  desc,
  onClick,
}: {
  selected?: boolean;
  iconStyle: string;
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  if (selected) {
    return (
      <div onClick={onClick} style={css('border-radius:20px;padding:18px;display:flex;align-items:center;gap:16px;border:2px solid rgba(212,160,48,.45);background:rgba(212,160,48,.08);backdrop-filter:blur(24px);position:relative;overflow:hidden;cursor:pointer')}>
        <div style={css('position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,160,48,.4),transparent)')} />
        <div style={css(`width:52px;height:52px;border-radius:15px;${iconStyle};display:flex;align-items:center;justify-content:center;font-size:24px`)} />
        <div style={css('flex:1')}>
          <div style={css('font-size:16px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{title}</div>
          <div style={css('font-size:13px;color:rgba(240,236,230,.55)')}>{desc}</div>
        </div>
        <div style={css('width:22px;height:22px;border-radius:50%;background:rgba(212,160,48,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0')}>{CHECK}</div>
      </div>
    );
  }
  return (
    <div onClick={onClick} className="g" style={css('border-radius:20px;padding:18px;display:flex;align-items:center;gap:16px;cursor:pointer')}>
      <div style={css(`width:52px;height:52px;border-radius:15px;${iconStyle};display:flex;align-items:center;justify-content:center;font-size:24px;position:relative;z-index:2`)} />
      <div style={css('flex:1;position:relative;z-index:2')}>
        <div style={css('font-size:16px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{title}</div>
        <div style={css('font-size:13px;color:rgba(240,236,230,.55)')}>{desc}</div>
      </div>
      <div style={css('width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);flex-shrink:0;position:relative;z-index:2')} />
    </div>
  );
}
