import { css } from '../lib/css';

/** Pin en goutte sur la carte (couleur/taille variables, glow + label optionnels). */
export interface MapMarkerProps {
  left: string;
  top: string;
  size: number;
  gradient: string; // "linear-gradient(...)" complet
  borderColor: string;
  glow?: boolean;
  /** Taille de police du glyphe interne (vide dans le proto), défaut 15. */
  innerFontSize?: number;
  label?: string;
  onClick?: () => void;
}

export function MapMarker({
  left,
  top,
  size,
  gradient,
  borderColor,
  glow,
  innerFontSize = 15,
  label,
  onClick,
}: MapMarkerProps) {
  return (
    <div
      onClick={onClick}
      style={css(
        `position:absolute;left:${left};top:${top};display:flex;flex-direction:column;align-items:center` +
          (onClick ? ';cursor:pointer' : ''),
      )}
    >
      <div
        style={css(
          `width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${gradient};border:1.5px solid ${borderColor};display:flex;align-items:center;justify-content:center` +
            (glow ? ';box-shadow:0 0 20px rgba(212,160,48,.5)' : ''),
        )}
      >
        <div style={css(`transform:rotate(45deg);font-size:${innerFontSize}px`)} />
      </div>
      <div style={css('width:10px;height:5px;background:rgba(0,0,0,.35);border-radius:50%;margin-top:-2px;filter:blur(2px)')} />
      {label && (
        <div style={css('font-size:10px;font-weight:600;color:rgba(240,236,230,.85);background:rgba(10,7,4,.65);backdrop-filter:blur(8px);padding:2px 7px;border-radius:8px;margin-top:4px;white-space:nowrap;border:1px solid rgba(255,255,255,.1)')}>
          {label}
        </div>
      )}
    </div>
  );
}
