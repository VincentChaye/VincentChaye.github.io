import { GlassCard } from './primitives';
import { css } from '../lib/css';

/** Carte d'avis du détail spot : avatar (pastille colorée) + nom + date + texte. */
export interface ReviewCardProps {
  avatarBg: string;
  name: string;
  time: string;
  text: string;
}

export function ReviewCard({ avatarBg, name, time, text }: ReviewCardProps) {
  return (
    <GlassCard style={css('border-radius:20px;padding:16px')}>
      <div style={css('position:relative;z-index:2')}>
        <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:10px')}>
          <div style={css(`width:36px;height:36px;border-radius:50%;background:${avatarBg};display:flex;align-items:center;justify-content:center;font-size:16px`)} />
          <div>
            <div style={css('font-size:14px;font-weight:600;color:#f0ece6')}>{name}</div>
            <div style={css('font-size:11px;color:rgba(240,236,230,.40)')}>{time} · </div>
          </div>
        </div>
        <div style={css('font-size:13px;line-height:1.5;color:rgba(240,236,230,.65)')}>{text}</div>
      </div>
    </GlassCard>
  );
}
