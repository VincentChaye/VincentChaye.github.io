import { css } from '../lib/css';

/** Ligne de conversation de la Messagerie (proto l.869-926). */
export function ConversationRow({
  avatarStyle,
  avatarColor,
  avatarFontSize,
  initials,
  name,
  time,
  preview,
  unread,
  onClick,
}: {
  avatarStyle: string;
  avatarColor: string;
  avatarFontSize: string;
  initials: string;
  name: string;
  time: string;
  preview: string;
  unread?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="g" onClick={onClick} style={css('display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:16px;margin-bottom:10px;cursor:pointer;position:relative')}>
      <div style={css('position:relative;z-index:2;display:flex;align-items:center;gap:12px;width:100%')}>
        <div style={css(`width:46px;height:46px;${avatarStyle};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;color:${avatarColor};font-size:${avatarFontSize}`)}>{initials}</div>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:3px')}>
            <span style={css('font-size:15px;font-weight:600;color:#f0ece6')}>{name}</span>
            <span style={css('font-size:12px;color:rgba(240,236,230,.4)')}>{time}</span>
          </div>
          <div style={css('font-size:13px;color:rgba(240,236,230,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{preview}</div>
        </div>
        {unread && <div style={css('width:8px;height:8px;border-radius:50%;background:#D4A030;flex-shrink:0')} />}
      </div>
    </div>
  );
}
