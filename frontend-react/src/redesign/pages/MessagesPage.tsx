import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useMessagesStore } from '@/stores/messages.store';
import type { Conversation } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { ConversationRow } from '../components/ConversationRow';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Messagerie (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/messages`. Réutilise `useMessagesStore` (socket déjà branché par App).
 * DM + groupes, dernier message + non-lus réels. Clic → `/redesign/messages/:id`. i18n FR.
 */

function convTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 1) return 'Hier';
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const DM_AV = 'border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3))';
const GROUP_AV = 'border-radius:14px;background:linear-gradient(145deg,rgba(212,160,48,.25),rgba(180,100,20,.2))';

export function MessagesPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { conversations, loadConversations } = useMessagesStore();
  const myUid = user?._id;

  useEffect(() => { if (isAuthenticated) loadConversations(); }, [isAuthenticated, loadConversations]);

  function display(c: Conversation) {
    const isGroup = c.type === 'group';
    const other = c.participantInfo?.find((p) => p.uid !== myUid) ?? c.participantInfo?.[0];
    const name = isGroup ? (c.groupName || 'Groupe') : (other?.displayName || 'Conversation');
    let preview = c.lastMessage?.content || 'Démarrer la conversation';
    if (isGroup && c.lastMessage?.senderUid) {
      const sender = c.participantInfo?.find((p) => p.uid === c.lastMessage!.senderUid);
      if (sender) preview = `${sender.displayName.split(' ')[0]} : ${preview}`;
    }
    const initials = isGroup
      ? (c.groupName || 'G').split(' ').map((w) => w[0]).slice(0, 3).join('').toUpperCase()
      : (name[0] || '?').toUpperCase();
    return { isGroup, name, preview, initials, unread: (c.unread?.[myUid ?? ''] ?? 0) > 0 };
  }

  if (!isAuthenticated) {
    return (
      <PageFrame tab="messagerie">
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Messages</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir tes messages.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/messages')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  const dms = conversations.filter((c) => c.type !== 'group');
  const groups = conversations.filter((c) => c.type === 'group');

  return (
    <PageFrame tab="messagerie">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Messages</span>
        </div>
      </NavBar>

      <div style={css('padding:0 16px')}>
        {conversations.length === 0 ? (
          <div className="g" style={css('border-radius:16px;padding:18px;font-size:13px;color:rgba(240,236,230,.45);text-align:center;margin-top:8px')}>Aucune conversation. Démarre-en une depuis un profil.</div>
        ) : (
          <>
            {dms.map((c) => {
              const d = display(c);
              return <ConversationRow key={c._id} onClick={() => navigate(`/redesign/messages/${c._id}`)} avatarStyle={DM_AV} avatarColor="#E8B84B" avatarFontSize="16px" initials={d.initials} name={d.name} time={convTime(c.lastMessage?.createdAt || c.updatedAt)} preview={d.preview} unread={d.unread} />;
            })}
            {groups.length > 0 && <div style={css('margin-top:6px;margin-bottom:8px;padding:0 4px;font-size:12px;font-weight:600;color:rgba(240,236,230,.35);letter-spacing:.6px;text-transform:uppercase')}>Groupes</div>}
            {groups.map((c) => {
              const d = display(c);
              return <ConversationRow key={c._id} onClick={() => navigate(`/redesign/messages/${c._id}`)} avatarStyle={GROUP_AV} avatarColor="#E8B84B" avatarFontSize="13px" initials={d.initials} name={d.name} time={convTime(c.lastMessage?.createdAt || c.updatedAt)} preview={d.preview} unread={d.unread} />;
            })}
          </>
        )}
      </div>
      <div style={css('height:20px')} />
    </PageFrame>
  );
}
