import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useMessagesStore } from '@/stores/messages.store';
import { apiFetch } from '@/lib/api';
import type { Conversation } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { ConversationRow } from '../components/ConversationRow';
import { Pressable } from '../components/primitives';
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
  const { conversations, loadConversations, markUnread, hideConversation, startConversationWith, createGroup } = useMessagesStore();
  const myUid = user?._id;

  const [newConvOpen, setNewConvOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newConvTab, setNewConvTab] = useState<'dm' | 'group'>('dm');
  const [dmQuery, setDmQuery] = useState('');
  const [dmResults, setDmResults] = useState<{ _id: string; displayName: string; username?: string }[]>([]);
  const [groupQuery, setGroupQuery] = useState('');
  const [groupResults, setGroupResults] = useState<{ _id: string; displayName: string; username?: string }[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<{ _id: string; displayName: string }[]>([]);

  useEffect(() => { if (isAuthenticated) loadConversations(); }, [isAuthenticated, loadConversations]);

  useEffect(() => {
    if (dmQuery.length < 2) { setDmResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch<{ _id: string; displayName: string; username?: string }[]>(
          `/api/users/search?q=${encodeURIComponent(dmQuery)}&limit=20`,
          { auth: true }
        );
        setDmResults(r);
      } catch { setDmResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [dmQuery]);

  useEffect(() => {
    if (groupQuery.length < 2) { setGroupResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch<{ _id: string; displayName: string; username?: string }[]>(
          `/api/users/search?q=${encodeURIComponent(groupQuery)}&limit=20`,
          { auth: true }
        );
        setGroupResults(r);
      } catch { setGroupResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [groupQuery]);

  async function startDM(uid: string) {
    try {
      const conv = await startConversationWith(uid);
      setNewConvOpen(false);
      navigate(`/redesign/messages/${conv._id}`);
    } catch { toast.error('Impossible de démarrer la conversation.'); }
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || groupMembers.length === 0) return;
    try {
      const conv = await createGroup(groupName.trim(), groupMembers.map((m) => m._id));
      setNewConvOpen(false);
      setGroupName('');
      setGroupMembers([]);
      setGroupQuery('');
      navigate(`/redesign/messages/${conv._id}`);
    } catch { toast.error('Création du groupe impossible.'); }
  }

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
        <NavBar><div className="nbi"><Pressable className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</Pressable><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Messages</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir tes messages.</div>
          <Pressable onClick={() => navigate('/redesign/login?next=/redesign/messages')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</Pressable>
        </div>
      </PageFrame>
    );
  }

  const dms = conversations.filter((c) => c.type !== 'group');
  const groups = conversations.filter((c) => c.type === 'group');

  return (
    <PageFrame tab="messagerie">
      <NavBar>
        <div className="nbi" style={newConvOpen ? { opacity: 0, pointerEvents: 'none', transition: 'opacity .2s' } : { opacity: 1, transition: 'opacity .2s' }}>
          <Pressable className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</Pressable>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Messages</span>
          <Pressable aria-label="Nouvelle conversation" onClick={() => setNewConvOpen(true)} style={css('position:absolute;right:0;width:32px;height:32px;border-radius:50%;background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.25);display:flex;align-items:center;justify-content:center;color:#D4A030;cursor:pointer;font-size:20px')}>+</Pressable>
        </div>
      </NavBar>

      <div style={css('padding:14px 16px 0')}>
        {conversations.length === 0 ? (
          <div className="g" style={css('border-radius:16px;padding:18px;font-size:13px;color:rgba(240,236,230,.6);text-align:center;margin-top:8px')}>Aucune conversation. Démarre-en une depuis un profil.</div>
        ) : (
          <>
            {dms.map((c) => {
              const d = display(c);
              return (
                <ConversationRow
                  key={c._id}
                  onClick={() => navigate(`/redesign/messages/${c._id}`)}
                  avatarStyle={DM_AV}
                  avatarColor="#E8B84B"
                  avatarFontSize="16px"
                  initials={d.initials}
                  name={d.name}
                  time={convTime(c.lastMessage?.createdAt || c.updatedAt)}
                  preview={d.preview}
                  unread={d.unread}
                  onMarkUnread={() => markUnread(c._id)}
                  onDelete={() => setConfirmDeleteId(c._id)}
                />
              );
            })}
            {groups.length > 0 && <div style={css('margin-top:6px;margin-bottom:8px;padding:0 4px;font-size:12px;font-weight:600;color:rgba(240,236,230,.6);letter-spacing:.6px;text-transform:uppercase')}>Groupes</div>}
            {groups.map((c) => {
              const d = display(c);
              return (
                <ConversationRow
                  key={c._id}
                  onClick={() => navigate(`/redesign/messages/${c._id}`)}
                  avatarStyle={GROUP_AV}
                  avatarColor="#E8B84B"
                  avatarFontSize="13px"
                  initials={d.initials}
                  name={d.name}
                  time={convTime(c.lastMessage?.createdAt || c.updatedAt)}
                  preview={d.preview}
                  unread={d.unread}
                  onMarkUnread={() => markUnread(c._id)}
                  onDelete={() => setConfirmDeleteId(c._id)}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Overlay */}
      {newConvOpen && <div onClick={() => { setNewConvOpen(false); setDmQuery(''); setDmResults([]); setGroupQuery(''); setGroupResults([]); }} style={css('position:fixed;inset:0;z-index:49;background:rgba(0,0,0,0.55)')} />}

      {/* Panneau latéral nouvelle conversation */}
      <div style={css(`position:fixed;top:var(--panel-top);right:0;bottom:0;width:88vw;max-width:360px;z-index:50;background:rgba(18,12,6,.72);backdrop-filter:blur(40px) saturate(1.8);-webkit-backdrop-filter:blur(40px) saturate(1.8);border-radius:26px 0 0 26px;border:1px solid rgba(212,160,48,.18);border-right:none;box-shadow:-8px 0 48px rgba(0,0,0,.55),inset 1px 1px 0 rgba(255,255,255,.08);display:flex;flex-direction:column;transition:transform .35s cubic-bezier(.32,0,.67,0);transform:${newConvOpen ? 'translateX(0)' : 'translateX(110%)'};pointer-events:${newConvOpen ? 'auto' : 'none'}`)}>

        {/* Reflet haut Apple */}
        <div style={css('position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),rgba(212,160,48,.35),rgba(255,255,255,.22),transparent);border-radius:26px 0 0 0;pointer-events:none')} />

        {/* Header */}
        <div style={css('display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0')}>
          <Pressable aria-label="Fermer" onClick={() => { setNewConvOpen(false); setDmQuery(''); setDmResults([]); setGroupQuery(''); setGroupResults([]); }} style={css('width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.7);cursor:pointer;font-size:16px;font-weight:300')}><span aria-hidden>✕</span></Pressable>
          <span style={css('font-size:16px;font-weight:700;color:#f0ece6;letter-spacing:-.3px')}>Nouvelle conversation</span>
          <div style={css('width:34px')} />
        </div>

        {/* Contenu scrollable */}
        <div style={css('flex:1;overflow-y:auto;padding:16px 18px')}>

        {/* Tabs DM / Groupe */}
        <div style={css('display:flex;gap:8px;margin-bottom:16px')}>
          <Pressable aria-pressed={newConvTab === 'dm'} onClick={() => setNewConvTab('dm')} style={css(`flex:1;text-align:center;padding:10px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;${newConvTab === 'dm' ? 'background:rgba(212,160,48,.2);color:#D4A030;' : 'background:rgba(255,255,255,.06);color:rgba(240,236,230,.5);'}`)}>Message privé</Pressable>
          <Pressable aria-pressed={newConvTab === 'group'} onClick={() => setNewConvTab('group')} style={css(`flex:1;text-align:center;padding:10px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;${newConvTab === 'group' ? 'background:rgba(212,160,48,.2);color:#D4A030;' : 'background:rgba(255,255,255,.06);color:rgba(240,236,230,.5);'}`)}>Groupe</Pressable>
        </div>

        {newConvTab === 'dm' ? (
          <>
            <input
              value={dmQuery}
              onChange={(e) => setDmQuery(e.target.value)}
              aria-label="Rechercher un utilisateur"
              placeholder="Rechercher un utilisateur..."
              style={css('width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 14px;color:#f0ece6;font-size:14px;margin-bottom:12px;box-sizing:border-box')}
            />
            {dmResults.map((u) => (
              <Pressable key={u._id} onClick={() => startDM(u._id)} style={css('width:100%;text-align:left;display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;cursor:pointer;margin-bottom:4px;background:rgba(255,255,255,.04)')}>
                <div style={css('width:38px;height:38px;border-radius:50%;background:rgba(212,160,48,.3);display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;flex-shrink:0')}>{(u.displayName[0] || '?').toUpperCase()}</div>
                <div>
                  <div style={css('font-size:14px;font-weight:600;color:#f0ece6')}>{u.displayName}</div>
                  {u.username && <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>@{u.username}</div>}
                </div>
              </Pressable>
            ))}
            {dmQuery.length >= 2 && dmResults.length === 0 && (
              <div style={css('text-align:center;color:rgba(240,236,230,.6);font-size:13px;padding:12px')}>Aucun utilisateur trouvé</div>
            )}
          </>
        ) : (
          <>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              aria-label="Nom du groupe"
              placeholder="Nom du groupe..."
              style={css('width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 14px;color:#f0ece6;font-size:14px;margin-bottom:12px;box-sizing:border-box')}
            />
            <input
              value={groupQuery}
              onChange={(e) => setGroupQuery(e.target.value)}
              aria-label="Ajouter des membres"
              placeholder="Ajouter des membres..."
              style={css('width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 14px;color:#f0ece6;font-size:14px;margin-bottom:8px;box-sizing:border-box')}
            />
            {groupResults.filter((u) => !groupMembers.find((m) => m._id === u._id)).map((u) => (
              <Pressable key={u._id} aria-label={`Ajouter ${u.displayName}`} onClick={() => setGroupMembers((prev) => [...prev, { _id: u._id, displayName: u.displayName }])} style={css('width:100%;text-align:left;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;background:rgba(255,255,255,.04)')}>
                <div style={css('font-size:14px;color:#f0ece6')}>{u.displayName}</div>
                <div aria-hidden style={css('margin-left:auto;color:#D4A030;font-size:18px')}>+</div>
              </Pressable>
            ))}
            {groupMembers.length > 0 && (
              <div style={css('display:flex;flex-wrap:wrap;gap:6px;margin:8px 0')}>
                {groupMembers.map((m) => (
                  <Pressable key={m._id} aria-label={`Retirer ${m.displayName}`} onClick={() => setGroupMembers((prev) => prev.filter((x) => x._id !== m._id))} style={css('padding:4px 10px;border-radius:9999px;background:rgba(212,160,48,.2);color:#D4A030;font-size:12px;font-weight:600;cursor:pointer')}>
                    {m.displayName} <span aria-hidden>×</span>
                  </Pressable>
                ))}
              </div>
            )}
            <Pressable
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || groupMembers.length === 0}
              style={css(`margin-top:12px;width:100%;padding:14px;border-radius:12px;background:${groupName.trim() && groupMembers.length > 0 ? 'linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94))' : 'rgba(255,255,255,.1)'};color:${groupName.trim() && groupMembers.length > 0 ? '#1a0f05' : 'rgba(240,236,230,.6)'};font-weight:700;font-size:15px;text-align:center;cursor:pointer`)}
            >
              Créer le groupe ({groupMembers.length} membre{groupMembers.length > 1 ? 's' : ''})
            </Pressable>
          </>
        )}
        </div>{/* fin contenu scrollable */}
      </div>

      {/* Confirmation suppression conversation */}
      {confirmDeleteId && (
        <>
          <div onClick={() => setConfirmDeleteId(null)} style={css('position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55)')} />
          <div role="dialog" aria-modal="true" aria-label="Supprimer la conversation ?" style={css('position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:78vw;max-width:300px;background:rgba(18,12,6,.78);backdrop-filter:blur(40px) saturate(1.8);-webkit-backdrop-filter:blur(40px) saturate(1.8);border-radius:22px;border:1px solid rgba(212,160,48,.18);box-shadow:0 18px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08);padding:22px 20px;text-align:center')}>
            <div style={css('font-size:16px;font-weight:700;color:#f0ece6;letter-spacing:-.3px;margin-bottom:6px')}>Supprimer la conversation ?</div>
            <div style={css('font-size:13px;color:rgba(240,236,230,.6);margin-bottom:18px')}>Elle disparaîtra de ta liste.</div>
            <div style={css('display:flex;gap:8px')}>
              <Pressable onClick={() => setConfirmDeleteId(null)} style={css('flex:1;padding:11px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(240,236,230,.75);font-size:14px;font-weight:600;cursor:pointer;text-align:center')}>Annuler</Pressable>
              <Pressable onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(null); hideConversation(id); }} style={css('flex:1;padding:11px;border-radius:12px;background:rgba(200,80,80,.18);border:1px solid rgba(200,80,80,.32);color:#E88080;font-size:14px;font-weight:700;cursor:pointer;text-align:center')}>Supprimer</Pressable>
            </div>
          </div>
        </>
      )}

      <div style={css('height:20px')} />
    </PageFrame>
  );
}
