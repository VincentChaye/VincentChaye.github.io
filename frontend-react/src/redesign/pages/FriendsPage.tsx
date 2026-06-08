import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { FriendRow } from '../components/FriendRow';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Amis (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/friends`. `/api/friends/requests` (demandes reçues) + `/api/friends`
 * (mes amis). Accepter/Refuser = vrais `PATCH /api/friends/:id/accept|decline`.
 *
 * Honnête : pas d'« amis en commun » ni de présence/online exposés → sous-titre = `@username`,
 * pas de pastille en ligne. Recherche = filtre client sur mes amis. i18n en dur (FR).
 */

interface Person { friendshipId?: string; _id: string; username?: string; displayName?: string; avatarUrl?: string; }

const GROUP = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.35);padding:0 4px 10px';
const REQ_ROW = 'padding:14px 16px;display:flex;align-items:center;gap:14px;position:relative;z-index:2';
const ACCEPT = 'padding:6px 14px;border-radius:10px;font-size:13px;font-weight:700;color:#1a0f05;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.9),rgba(232,184,75,.95))';
const REFUSE = 'padding:6px 14px;border-radius:10px;font-size:13px;font-weight:600;color:rgba(240,236,230,.5);cursor:pointer;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)';

const AV = [
  'background:linear-gradient(145deg,rgba(212,160,48,.25),rgba(184,134,30,.35));border:1.5px solid rgba(212,160,48,.3)',
  'background:linear-gradient(145deg,rgba(80,130,200,.25),rgba(50,90,160,.35));border:1.5px solid rgba(80,130,200,.3)',
  'background:linear-gradient(145deg,rgba(80,160,80,.25),rgba(50,120,50,.35));border:1.5px solid rgba(80,160,80,.3)',
  'background:linear-gradient(145deg,rgba(150,120,200,.25),rgba(110,80,170,.35));border:1.5px solid rgba(150,120,200,.3)',
];
const avStyle = (i: number) => AV[i % AV.length];
const nameOf = (p: Person) => p.displayName || p.username || 'Grimpeur';
const initialOf = (p: Person) => (nameOf(p)[0] || '?').toUpperCase();

export function FriendsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [requests, setRequests] = useState<Person[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let alive = true;
    Promise.all([
      apiFetch<Person[]>('/api/friends/requests', { auth: true }).catch(() => []),
      apiFetch<Person[]>('/api/friends', { auth: true }).catch(() => []),
    ]).then(([reqs, frs]) => {
      if (!alive) return;
      setRequests(Array.isArray(reqs) ? reqs : []);
      setFriends(Array.isArray(frs) ? frs : []);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isAuthenticated]);

  async function respond(p: Person, action: 'accept' | 'decline') {
    if (!p.friendshipId || busy) return;
    setBusy(p.friendshipId);
    try {
      await apiFetch(`/api/friends/${p.friendshipId}/${action}`, { method: 'PATCH', auth: true });
      setRequests((r) => r.filter((x) => x.friendshipId !== p.friendshipId));
      if (action === 'accept') setFriends((f) => [{ ...p, friendshipId: undefined }, ...f]);
    } catch { /* la ligne reste, l'utilisateur peut réessayer */ }
    finally { setBusy(null); }
  }

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((p) => nameOf(p).toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q));
  }, [friends, query]);

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Amis</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir tes amis.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/friends')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Amis</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Recherche (filtre mes amis) */}
        <div className="g" style={css('border-radius:16px;display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:18px')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.4)" strokeWidth="2.2" strokeLinecap="round" style={css('flex-shrink:0;position:relative;z-index:2')}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un ami…" style={css('font-size:15px;color:#f0ece6;background:transparent;border:none;outline:none;flex:1;font-family:inherit;position:relative;z-index:2;min-width:0')} />
        </div>

        {loading ? (
          <div style={css('min-height:240px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div>
        ) : (
          <>
            {/* Demandes reçues */}
            {requests.length > 0 && (
              <>
                <div style={css(GROUP)}>Demandes reçues <span style={css('background:rgba(212,160,48,.25);border-radius:6px;padding:1px 7px;color:#D4A030;font-size:11px')}>{requests.length}</span></div>
                <div className="g" style={css('border-radius:20px;overflow:hidden;display:flex;flex-direction:column;margin-bottom:20px')}>
                  {requests.map((p, i) => (
                    <div key={p.friendshipId} style={css(`${REQ_ROW}${i < requests.length - 1 ? ';border-bottom:1px solid rgba(255,255,255,.05)' : ''}`)}>
                      <div style={css(`width:44px;height:44px;border-radius:50%;${avStyle(i)};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#f0ece6;flex-shrink:0;overflow:hidden`)}>
                        {p.avatarUrl ? <img src={p.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : initialOf(p)}
                      </div>
                      <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:2px')}>{nameOf(p)}</div><div style={css('font-size:12px;color:rgba(240,236,230,.45)')}>{p.username ? `@${p.username}` : ''}</div></div>
                      <div style={css(`display:flex;gap:8px${busy === p.friendshipId ? ';opacity:.5;pointer-events:none' : ''}`)}>
                        <div style={css(ACCEPT)} onClick={() => respond(p, 'accept')}>Accepter</div>
                        <div style={css(REFUSE)} onClick={() => respond(p, 'decline')}>Refuser</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Mes amis */}
            <div style={css(GROUP)}>Mes amis <span style={css('color:rgba(240,236,230,.3);font-weight:500')}>{friends.length}</span></div>
            {filteredFriends.length === 0 ? (
              <div className="g" style={css('border-radius:20px;padding:18px;font-size:13px;color:rgba(240,236,230,.45);text-align:center')}>
                {friends.length === 0 ? "Tu n'as pas encore d'amis. Ajoute des grimpeurs depuis leur profil." : 'Aucun ami ne correspond.'}
              </div>
            ) : (
              <div className="g" style={css('border-radius:20px;overflow:hidden;display:flex;flex-direction:column')}>
                {filteredFriends.map((p, i) => (
                  <FriendRow
                    key={p._id}
                    border={i < filteredFriends.length - 1}
                    avatarStyle={avStyle(i)}
                    avatarUrl={p.avatarUrl}
                    initial={initialOf(p)}
                    name={nameOf(p)}
                    sub={p.username ? `@${p.username}` : ''}
                    onClick={() => navigate(`/redesign/profile/${p._id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
