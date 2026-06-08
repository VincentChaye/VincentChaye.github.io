import { css } from '../lib/css';

const STAR = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#D4A030" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>
);

/** Carte de spot favori (image + tags + note) — onglet Favoris de Mes Spots (proto l.1244-1270). */
export function FavSpotCard({
  headerBg,
  tagStyle,
  tagText,
  gradeText,
  name,
  location,
  rating,
  onClick,
}: {
  headerBg: string;
  tagStyle: string;
  tagText: string;
  gradeText: string;
  name: string;
  location: string;
  rating: string;
  onClick?: () => void;
}) {
  return (
    <div className="g" style={css('border-radius:18px;overflow:hidden;cursor:pointer')} onClick={onClick}>
      <div style={css(`height:100px;${headerBg};position:relative;z-index:2;display:flex;align-items:flex-end;padding:12px`)}>
        <div style={css('display:flex;gap:6px')}>
          <span style={css(tagStyle)}>{tagText}</span>
          <span style={css('background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 8px;font-size:11px;color:rgba(240,236,230,.7)')}>{gradeText}</span>
        </div>
      </div>
      <div style={css('padding:12px 14px;position:relative;z-index:2')}>
        <div style={css('font-size:16px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{name}</div>
        <div style={css('display:flex;align-items:center;justify-content:space-between')}>
          <span style={css('font-size:12px;color:rgba(240,236,230,.45)')}>{location}</span>
          <div style={css('display:flex;align-items:center;gap:4px')}>{STAR}<span style={css('font-size:12px;color:rgba(240,236,230,.55)')}>{rating}</span></div>
        </div>
      </div>
    </div>
  );
}
