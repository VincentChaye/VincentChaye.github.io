import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useMessagesStore } from '@/stores/messages.store';
import type { Message, SharedObject } from '@/types';
import { normalizeSpotType, SPOT_TYPE_LABEL, type SpotType } from '../lib/spotType';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { Pressable } from '../components/primitives';
import { BackChevronIcon, SearchIcon } from '../lib/icons';

/**
 * SWAP — Conversation (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/messages/:id`. `useMessagesStore` : openConversation + messages + sendMessage
 * (socket déjà branché par App → temps réel). Bouton « + » à gauche du composer = envoyer une **photo /
 * fichier** (`uploadMedia` → `/api/messages/upload`) ou **partager un spot** (`sharedObject`, picker
 * `/api/spots`). Bulles : images, carte spot partagé, et événements système (`outing_*`) en notices.
 */

const RECV_ROW = 'display:flex;align-items:flex-end;gap:8px;max-width:80%';
const RECV_BUBBLE = 'background:rgba(255,255,255,.08);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.10);border-radius:18px 18px 18px 4px;padding:10px 14px';
const RECV_TEXT = 'font-size:14px;color:#f0ece6;line-height:1.4';
const SENT_ROW = 'display:flex;justify-content:flex-end;max-width:80%;align-self:flex-end';
const SENT_BUBBLE = 'background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.90));border:1px solid rgba(255,255,255,.20);border-radius:18px 18px 4px 18px;padding:10px 14px;box-shadow:0 2px 12px rgba(212,160,48,.20)';
const SENT_TEXT = 'font-size:14px;color:#1a0f05;font-weight:500;line-height:1.4';
const AVATAR = 'width:28px;height:28px;border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3));display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;font-size:11px;flex-shrink:0';
const SYS = 'text-align:center;margin:6px 0;font-size:11px;color:rgba(240,236,230,.6);font-weight:500';
const MENU_ROW = 'display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer;font-size:14px;color:#f0ece6;font-weight:500';

const SYS_LABEL: Record<string, string> = { outing_created: '📅 Sortie créée', outing_completed: '✅ Sortie terminée' };
type PickSpot = { id: string; name: string; type: SpotType; min: string | null; max: string | null };

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { conversations, messages, openConversation, sendMessage, uploadMedia, setActiveConversation } = useMessagesStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [spotModal, setSpotModal] = useState(false);
  const [spotQuery, setSpotQuery] = useState('');
  const [spots, setSpots] = useState<PickSpot[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const myUid = user?._id;

  useEffect(() => {
    if (isAuthenticated && id) { openConversation(id); setActiveConversation(id); }
    return () => setActiveConversation(null);
  }, [isAuthenticated, id, openConversation, setActiveConversation]);

  const list = id ? messages[id] : undefined;
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [list]);

  const conv = conversations.find((c) => c._id === id);
  const isGroup = conv?.type === 'group';
  const other = conv?.participantInfo?.find((p) => p.uid !== myUid) ?? conv?.participantInfo?.[0];
  const headerName = isGroup ? (conv?.groupName || 'Groupe') : (other?.displayName || 'Conversation');
  const headerInitial = (headerName[0] || '?').toUpperCase();
  const senderInitial = (uid: string | null) => (conv?.participantInfo?.find((x) => x.uid === uid)?.displayName?.[0] || '?').toUpperCase();

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !id || sending) return;
    setText(''); setSending(true);
    try { await sendMessage(id, t); } catch { setText(t); toast.error('Message non envoyé. Réessaie.'); } finally { setSending(false); }
  }

  async function handleFile(file?: File) {
    setMenuOpen(false);
    if (!file || !id) return;
    setSending(true);
    try { const att = await uploadMedia(file); await sendMessage(id, '', [att]); }
    catch { toast.error("Échec de l'envoi du fichier."); } finally { setSending(false); }
  }

  function openSpotPicker() {
    setMenuOpen(false); setSpotModal(true);
    if (spots === null) {
      apiFetch<{ features?: { properties: Record<string, unknown> }[] }>('/api/spots')
        .then((d) => setSpots((d?.features ?? []).map((f) => {
          const p = f.properties;
          return { id: String(p.id ?? p._id), name: (p.name as string) || 'Sans nom', type: normalizeSpotType(p.type as string), min: (p.niveau_min ?? null) as string | null, max: (p.niveau_max ?? null) as string | null };
        })))
        .catch(() => setSpots([]));
    }
  }
  async function shareSpot(s: PickSpot) {
    setSpotModal(false);
    if (!id) return;
    const sub = [SPOT_TYPE_LABEL[s.type], (s.min || s.max) ? `${s.min || '?'}→${s.max || '?'}` : null].filter(Boolean).join(' · ');
    const obj: SharedObject = { type: 'spot', id: s.id, name: s.name, subtitle: sub, spotType: s.type, grade: s.min };
    setSending(true);
    try { await sendMessage(id, '', undefined, obj); } catch { toast.error('Partage du spot impossible.'); } finally { setSending(false); }
  }

  const filteredSpots = useMemo(() => {
    const q = spotQuery.trim().toLowerCase();
    const base = spots ?? [];
    return (q ? base.filter((s) => s.name.toLowerCase().includes(q)) : base).slice(0, 40);
  }, [spots, spotQuery]);

  function MessageContent({ m, sent }: { m: Message; sent: boolean }) {
    if (m.attachments?.length) {
      return (
        <div style={css('display:flex;flex-direction:column;gap:6px')}>
          {m.attachments.map((a, i) => a.type === 'image'
            ? <img key={i} src={a.url} alt="" style={css('max-width:210px;width:100%;border-radius:12px;display:block')} />
            : <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={css(`font-size:14px;${sent ? 'color:#1a0f05' : 'color:#D4A030'};text-decoration:underline`)}>🎥 Vidéo</a>)}
        </div>
      );
    }
    if (m.sharedObject) {
      const o = m.sharedObject;
      return (
        <div onClick={() => o.type === 'spot' && navigate(`/redesign/spot/${o.id}`)} style={css(`border-radius:12px;background:${sent ? 'rgba(255,255,255,.18)' : 'rgba(212,160,48,.10)'};border:1px solid ${sent ? 'rgba(255,255,255,.28)' : 'rgba(212,160,48,.20)'};padding:9px 11px;display:flex;align-items:center;gap:10px;cursor:pointer;min-width:180px`)}>
          <div style={css(`width:34px;height:34px;border-radius:10px;background:${sent ? 'rgba(255,255,255,.2)' : 'rgba(212,160,48,.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px`)}>📍</div>
          <div style={css('min-width:0;flex:1')}>
            <div style={css(`font-size:13px;font-weight:700;${sent ? 'color:#1a0f05' : 'color:#f0ece6'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>{o.name}</div>
            {o.subtitle && <div style={css(`font-size:11px;${sent ? 'color:rgba(26,15,5,.6)' : 'color:rgba(240,236,230,.5)'}`)}>{o.subtitle}</div>}
          </div>
          <span style={css(`flex-shrink:0;${sent ? 'color:rgba(26,15,5,.5)' : 'color:rgba(212,160,48,.7)'}`)}><BackChevronIcon width={7} height={12} style={css('transform:rotate(180deg)')} /></span>
        </div>
      );
    }
    return <span style={css(sent ? SENT_TEXT : RECV_TEXT)}>{m.content}</span>;
  }

  if (!isAuthenticated) {
    return (
      <PageFrame flush>
        <NavBar><div className="nbi"><Pressable className="back-btn" onClick={() => navigate('/redesign/messages')}><BackChevronIcon width={9} height={15} /> Messages</Pressable></div></NavBar>
        <div style={css('padding:60px 28px;text-align:center;color:rgba(240,236,230,.6);font-size:15px')}>Connecte-toi pour accéder à tes messages.</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame flush>
      <div style={css('display:flex;flex-direction:column;min-height:100%')}>
        <NavBar style={css('height:calc(102px + var(--safe-top));flex-shrink:0')}>
          <div className="nbi">
            <Pressable className="back-btn" onClick={() => navigate('/redesign/messages')}><BackChevronIcon width={9} height={15} /> Messages</Pressable>
            <div style={css('position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none')}>
              <div style={css(`width:32px;height:32px;${isGroup ? 'border-radius:11px' : 'border-radius:50%'};background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3));display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;font-size:13px;overflow:hidden`)}>
                {other?.avatarUrl && !isGroup ? <img src={other.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : headerInitial}
              </div>
              <span style={css('font-size:12px;font-weight:600;color:#f0ece6;letter-spacing:-.2px')}>{headerName}</span>
            </div>
          </div>
        </NavBar>

        <div style={css('flex:1;padding:8px 16px 16px;display:flex;flex-direction:column;gap:6px')}>
          {list === undefined ? (
            <div style={css('flex:1;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div>
          ) : list.length === 0 ? (
            <div style={css('flex:1;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.6);font-size:14px;text-align:center;padding:40px 20px')}>Aucun message. Dis bonjour 👋</div>
          ) : (
            list.map((m) => {
              if (m.systemEvent) return <div key={m._id} className="lg-item-in" style={css(SYS)}>{SYS_LABEL[m.systemEvent.type] ?? 'Événement'}</div>;
              const hasContent = !!(m.content?.trim() || m.attachments?.length || m.sharedObject);
              if (!hasContent) return null;
              const sent = m.senderUid === myUid;
              if (sent) return <div key={m._id} className="lg-item-in" style={css(SENT_ROW)}><div style={css(SENT_BUBBLE)}><MessageContent m={m} sent /></div></div>;
              return (
                <div key={m._id} className="lg-item-in" style={css(RECV_ROW)}>
                  <div style={css(AVATAR)}>{senderInitial(m.senderUid)}</div>
                  <div style={css(RECV_BUBBLE)}><MessageContent m={m} sent={false} /></div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div style={css('position:sticky;bottom:0;padding:10px 16px 14px;background:linear-gradient(to top,rgba(10,7,4,.95) 60%,transparent);flex-shrink:0')}>
          {/* Menu pièce jointe */}
          {menuOpen && (
            <div className="g lg-pop" style={css('position:absolute;bottom:72px;left:16px;width:200px;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.5)')}>
              <div style={css('position:relative;z-index:2')}>
                <Pressable style={css(`width:100%;text-align:left;${MENU_ROW};border-bottom:1px solid rgba(255,255,255,.06)`)} onClick={() => photoRef.current?.click()}><span aria-hidden>📷</span> Photo</Pressable>
                <Pressable style={css(`width:100%;text-align:left;${MENU_ROW};border-bottom:1px solid rgba(255,255,255,.06)`)} onClick={() => openSpotPicker()}><span aria-hidden>📍</span> Partager un spot</Pressable>
                <Pressable style={css(`width:100%;text-align:left;${MENU_ROW}`)} onClick={() => fileRef.current?.click()}><span aria-hidden>📎</span> Fichier</Pressable>
              </div>
            </div>
          )}
          <input ref={photoRef} type="file" accept="image/*" style={css('display:none')} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          <input ref={fileRef} type="file" style={css('display:none')} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

          <form onSubmit={send} style={css('display:flex;align-items:center;gap:10px')}>
            {/* Bouton « + » pièce jointe (gauche) */}
            <button type="button" aria-label="Ajouter une pièce jointe" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} style={css(`width:38px;height:38px;border-radius:50%;flex-shrink:0;cursor:pointer;background:rgba(255,255,255,.07);backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#D4A030;transition:transform .2s${menuOpen ? ';transform:rotate(45deg)' : ''}`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <div style={css('flex:1;display:flex;align-items:center;background:rgba(255,255,255,.07);backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);border:1px solid rgba(255,255,255,.11);border-radius:9999px;padding:10px 16px;gap:8px;position:relative;overflow:hidden')}>
              <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" placeholder={sending ? 'Envoi…' : 'Message…'} style={css('font-size:15px;color:#f0ece6;flex:1;background:transparent;border:none;outline:none;font-family:inherit;min-width:0;position:relative;z-index:2')} />
            </div>
            <button type="submit" aria-label="Envoyer" disabled={sending || !text.trim()} style={css(`width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;box-shadow:0 3px 12px rgba(212,160,48,.30);border:1px solid rgba(255,255,255,.22)${sending || !text.trim() ? ';opacity:.5' : ''}`)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a0f05" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
            </button>
          </form>
        </div>
      </div>

      {/* Modal partage de spot */}
      {spotModal && (
        <div onClick={() => setSpotModal(false)} className="lg-fade" style={css('position:absolute;inset:0;z-index:300;background:rgba(8,5,3,.78);backdrop-filter:blur(8px);display:flex;flex-direction:column;padding:90px 16px 20px')}>
          <div onClick={(e) => e.stopPropagation()} className="g lg-item-in" style={css('border-radius:22px;overflow:hidden;display:flex;flex-direction:column;max-height:100%')}>
            <div style={css('position:relative;z-index:2;display:flex;flex-direction:column;min-height:0')}>
              <div style={css('display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.07)')}>
                <span style={css('font-size:15px;font-weight:700;color:#f0ece6;flex:1')}>Partager un spot</span>
                <Pressable onClick={() => setSpotModal(false)} style={css('font-size:14px;color:#D4A030;font-weight:600;cursor:pointer')}>Fermer</Pressable>
              </div>
              <div style={css('padding:12px 16px')}>
                <div style={css('display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:9999px;padding:9px 14px')}>
                  <span style={css('color:rgba(212,160,48,.7)')}><SearchIcon width={15} height={15} /></span>
                  <input value={spotQuery} onChange={(e) => setSpotQuery(e.target.value)} aria-label="Chercher un spot" placeholder="Chercher un spot…" autoFocus style={css('font-size:14px;color:#f0ece6;flex:1;background:transparent;border:none;outline:none;font-family:inherit;min-width:0')} />
                </div>
              </div>
              <div style={css('overflow-y:auto;padding:0 10px 12px;display:flex;flex-direction:column;gap:4px')}>
                {spots === null ? (
                  <div style={css('padding:24px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Chargement…</div>
                ) : filteredSpots.length === 0 ? (
                  <div style={css('padding:24px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Aucun spot.</div>
                ) : filteredSpots.map((s) => (
                  <Pressable key={s.id} onClick={() => shareSpot(s)} style={css('width:100%;text-align:left;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer')}>
                    <div aria-hidden style={css('width:32px;height:32px;border-radius:9px;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px')}>📍</div>
                    <div style={css('min-width:0;flex:1')}>
                      <div style={css('font-size:14px;font-weight:600;color:#f0ece6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{s.name}</div>
                      <div style={css('font-size:11px;color:rgba(240,236,230,.6)')}>{[SPOT_TYPE_LABEL[s.type], (s.min || s.max) ? `${s.min || '?'}→${s.max || '?'}` : null].filter(Boolean).join(' · ')}</div>
                    </div>
                  </Pressable>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
