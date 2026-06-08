import { css } from '../lib/css';
import { Tag, type TagVariant } from './primitives';

/** Ligne de la table « Utilisateurs récents » de l'Admin (proto l.1078-1080). */
export function AdminUserRow({
  avatarBg,
  name,
  meta,
  badge,
  badgeVariant,
  border,
}: {
  avatarBg: string;
  name: string;
  meta: string;
  badge: string;
  badgeVariant: TagVariant;
  border?: boolean;
}) {
  return (
    <div style={css(`padding:12px 16px;display:flex;align-items:center;gap:12px${border ? ';border-bottom:1px solid rgba(255,255,255,.05)' : ''}`)}>
      <div style={css(`width:32px;height:32px;border-radius:50%;${avatarBg};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0`)} />
      <div style={css('flex:1')}>
        <div style={css('font-size:14px;font-weight:600;color:#f0ece6')}>{name}</div>
        <div style={css('font-size:11px;color:rgba(240,236,230,.40)')}>{meta}</div>
      </div>
      <Tag variant={badgeVariant} style={css('font-size:10px;padding:3px 8px')}>{badge}</Tag>
    </div>
  );
}
