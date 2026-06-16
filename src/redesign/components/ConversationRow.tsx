import { useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { css } from '../lib/css';

const ACTION_WIDTH = 140;

const ACTION_BTN: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  borderRadius: 14,
  cursor: 'pointer',
  backdropFilter: 'blur(24px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10)',
};

const MAIL = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
);
const TRASH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);

/** Ligne de conversation de la Messagerie avec swipe gauche pour actions. */
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
  onMarkUnread,
  onDelete,
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
  onMarkUnread?: () => void;
  onDelete?: () => void;
}) {
  const x = useMotionValue(0);
  // La ligne glass est semi-transparente : sans ça, les boutons colorés
  // transparaissent au repos. On ne les révèle qu'une fois le swipe entamé.
  const actionsOpacity = useTransform(x, [-40, 0], [1, 0]);
  const [open, setOpen] = useState(false);

  function snapOpen() {
    animate(x, -ACTION_WIDTH, { type: 'spring', stiffness: 500, damping: 40 });
    setOpen(true);
  }
  function snapClose() {
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    setOpen(false);
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -50) snapOpen(); else snapClose();
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 10 }}>
      {/* Action buttons */}
      <motion.div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_WIDTH, display: 'flex', gap: 6, padding: '4px 4px 4px 8px', opacity: actionsOpacity }}>
        <button
          onClick={() => { snapClose(); onMarkUnread?.(); }}
          style={{ ...ACTION_BTN, background: 'rgba(80,130,200,.16)', border: '1px solid rgba(80,130,200,.30)', color: '#88BBEE' }}
        >
          {MAIL}
          <span style={{ fontSize: 10, fontWeight: 600 }}>Non lu</span>
        </button>
        <button
          onClick={() => { snapClose(); onDelete?.(); }}
          style={{ ...ACTION_BTN, background: 'rgba(200,80,80,.16)', border: '1px solid rgba(200,80,80,.30)', color: '#E88080' }}
        >
          {TRASH}
          <span style={{ fontSize: 10, fontWeight: 600 }}>Supprimer</span>
        </button>
      </motion.div>

      {/* Draggable row */}
      <motion.div
        className="g"
        role="button"
        tabIndex={0}
        aria-label={`Conversation avec ${name}${unread ? ', non lue' : ''}`}
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        style={{ x, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', position: 'relative' }}
        onDragEnd={handleDragEnd}
        onClick={() => { if (open) snapClose(); else onClick?.(); }}
        onKeyDown={(e) => {
          // role="button" → l'élément n'active pas Entrée/Espace tout seul (ce n'est pas un <button>,
          // car il doit rester "draggable" pour le swipe). On câble donc le clavier à la main.
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (open) snapClose(); else onClick?.(); }
        }}
      >
        <div style={css('position:relative;z-index:2;display:flex;align-items:center;gap:12px;width:100%')}>
          {/* Avatar */}
          <div style={css(`width:46px;height:46px;${avatarStyle};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;color:${avatarColor};font-size:${avatarFontSize}`)}>
            {initials}
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: unread ? 700 : 500, color: unread ? '#f0ece6' : 'rgba(240,236,230,.75)' }}>
                {name}
              </span>
              <span style={{ fontSize: 12, color: unread ? 'rgba(240,236,230,.7)' : 'rgba(240,236,230,.6)', fontWeight: unread ? 600 : 400 }}>
                {time}
              </span>
            </div>
            <div style={{ fontSize: 13, color: unread ? 'rgba(240,236,230,.8)' : 'rgba(240,236,230,.6)', fontWeight: unread ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {preview}
            </div>
          </div>
          {/* Unread dot */}
          {unread && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4A030', flexShrink: 0, boxShadow: '0 0 6px #D4A03080' }} />}
        </div>
      </motion.div>
    </div>
  );
}
