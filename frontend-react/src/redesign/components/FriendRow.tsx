import { css } from '../lib/css';

const CHEV = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.22)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
);

/** Ligne « ami » de l'écran Amis (proto l.1325-1339), avec pastille « en ligne » optionnelle.
 *  `avatarUrl`/`initial`/`onClick` optionnels (ajoutés au swap, la galerie n'en passe pas). */
export function FriendRow({
  avatarStyle,
  online,
  name,
  sub,
  border,
  avatarUrl,
  initial,
  onClick,
}: {
  avatarStyle: string;
  online?: boolean;
  name: string;
  sub: string;
  border?: boolean;
  avatarUrl?: string;
  initial?: string;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={css(`padding:14px 16px;display:flex;align-items:center;gap:14px;${border ? 'border-bottom:1px solid rgba(255,255,255,.05);' : ''}cursor:pointer;position:relative;z-index:2`)}>
      <div style={css('position:relative')}>
        <div style={css(`width:44px;height:44px;border-radius:50%;${avatarStyle};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#f0ece6;flex-shrink:0;overflow:hidden`)}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : (initial ?? '')}
        </div>
        {online && <div style={css('position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:#4CD964;border:2px solid rgba(20,15,10,.9)')} />}
      </div>
      <div style={css('flex:1')}>
        <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:2px')}>{name}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>{sub}</div>
      </div>
      {CHEV}
    </div>
  );
}
