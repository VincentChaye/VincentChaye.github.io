import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { SectionHeader, Tag, type TagVariant } from '../components/primitives';
import { AdminUserRow } from '../components/AdminUserRow';
import { BackChevronIcon, UsersIcon, ClimberIcon } from '../lib/icons';

/**
 * SWAP — Admin (design Liquid Glass) câblé aux vraies données ADMIN (`requireAdmin`).
 * Route additive `/redesign/admin`. Modération réelle : `/api/spots/pending` (+ approve/reject),
 * `/api/spot-edits/pending` (+ approve/reject), compteurs, `/api/users` (récents).
 * Réservé aux admins. « Voir diff » → page live `/admin/spots`. i18n en dur (FR).
 */

type Spot = Record<string, unknown>;
type Edit = Record<string, unknown>;
type Usr = Record<string, unknown>;

const TYPE_TAG: Record<string, { label: string; variant: TagVariant }> = {
  crag: { label: 'Falaise', variant: 'a' }, boulder: { label: 'Bloc', variant: 'g' },
  indoor: { label: 'Salle', variant: 'b' }, shop: { label: 'Magasin', variant: 'a' },
};
const APPROVE = 'flex:1;padding:11px;border-radius:12px;font-size:13px;font-weight:700;text-align:center;background:rgba(80,160,80,.18);border:1px solid rgba(80,160,80,.28);color:#88D088;cursor:pointer';
const REJECT = 'flex:1;padding:11px;border-radius:12px;font-size:13px;font-weight:700;text-align:center;background:rgba(200,80,80,.14);border:1px solid rgba(200,80,80,.24);color:#E88080;cursor:pointer';

function StatBox({ label, labelColor, value, sub }: { label: string; labelColor: string; value: string; sub: string }) {
  return (
    <div className="g" style={css('border-radius:18px;padding:18px 16px')}>
      <div style={css('position:relative;z-index:2')}>
        <div style={css(`font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:${labelColor};margin-bottom:8px`)}>{label}</div>
        <div style={css('font-size:30px;font-weight:800;letter-spacing:-1px;color:#f0ece6;margin-bottom:2px')}>{value}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>{sub}</div>
      </div>
    </div>
  );
}

const authorName = (s: Spot) => {
  const by = (s.submittedBy ?? s.createdBy) as { username?: string; displayName?: string } | undefined;
  return by?.displayName || by?.username || 'utilisateur';
};
const grades = (s: Spot) => {
  const mn = s.niveau_min as string | null, mx = s.niveau_max as string | null;
  return mn || mx ? `${mn || '?'}→${mx || '?'}` : null;
};

export function AdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [users, setUsers] = useState<Usr[]>([]);
  const [approved, setApproved] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { setLoading(false); return; }
    let alive = true;
    Promise.all([
      apiFetch<{ items: Spot[] }>('/api/spots/pending', { auth: true }).catch(() => ({ items: [] })),
      apiFetch<{ items: Edit[] } | Edit[]>('/api/spot-edits/pending', { auth: true }).catch(() => ({ items: [] })),
      apiFetch<{ items: Usr[]; total: number }>('/api/users?limit=5', { auth: true }).catch(() => ({ items: [], total: 0 })),
      apiFetch<{ count: number }>('/api/spots/count').catch(() => ({ count: 0 })),
      apiFetch<{ count: number }>('/api/users/count').catch(() => ({ count: 0 })),
    ]).then(([sp, ed, us, sc, uc]) => {
      if (!alive) return;
      setSpots(sp?.items ?? []);
      setEdits(Array.isArray(ed) ? ed : (ed?.items ?? []));
      setUsers(us?.items ?? []);
      setApproved(sc?.count ?? 0);
      setUserCount(uc?.count ?? (us as { total?: number })?.total ?? 0);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isAuthenticated, isAdmin]);

  async function moderateSpot(id: string, action: 'approve' | 'reject') {
    if (busy) return;
    setBusy(id);
    try {
      await apiFetch(`/api/spots/${id}/${action}`, { method: 'PATCH', auth: true, body: JSON.stringify(action === 'reject' ? { reason: 'Rejeté' } : {}) });
      setSpots((l) => l.filter((s) => String(s._id) !== id));
    } catch { /* reste affiché */ } finally { setBusy(null); }
  }
  async function moderateEdit(id: string, action: 'approve' | 'reject') {
    if (busy) return;
    setBusy(id);
    try {
      await apiFetch(`/api/spot-edits/${id}/${action}`, { method: 'PATCH', auth: true, body: JSON.stringify(action === 'reject' ? { reason: 'Rejeté' } : {}) });
      setEdits((l) => l.filter((e) => String(e._id) !== id));
    } catch { /* reste affiché */ } finally { setBusy(null); }
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate('/redesign/settings')}><BackChevronIcon width={9} height={15} /> Réglages</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Admin</span></div></NavBar>
        <div style={css('padding:60px 28px;text-align:center;color:rgba(240,236,230,.6);font-size:15px')}>
          {isAuthenticated ? 'Accès réservé aux administrateurs.' : (
            <div style={css('display:flex;flex-direction:column;align-items:center;gap:16px')}>
              <div>Connecte-toi avec un compte admin.</div>
              <div onClick={() => navigate('/redesign/login?next=/redesign/admin')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer')}>Se connecter</div>
            </div>
          )}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate('/redesign/settings')}><BackChevronIcon width={9} height={15} /> Réglages</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Admin</span>
        </div>
      </NavBar>

      {/* Stats */}
      <div style={css('padding:0 20px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:4px')}>
        <StatBox label="En attente" labelColor="rgba(212,160,48,.7)" value={loading ? '…' : String(spots.length)} sub="Spots à modérer" />
        <StatBox label="Approuvés" labelColor="rgba(80,160,80,.7)" value={approved == null ? '…' : approved.toLocaleString('fr-FR')} sub="Spots total" />
        <StatBox label="Utilisateurs" labelColor="rgba(100,130,200,.7)" value={userCount == null ? '…' : String(userCount)} sub="Inscrits" />
        <StatBox label="Modifs" labelColor="rgba(200,120,60,.7)" value={loading ? '…' : String(edits.length)} sub="En révision" />
      </div>

      {/* Gestion (port complet redesign) */}
      <SectionHeader small>Gestion</SectionHeader>
      <div style={css('padding:0 20px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px')}>
        <div className="g" onClick={() => navigate('/redesign/admin/users')} style={css('border-radius:16px;padding:16px;cursor:pointer')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('margin-bottom:6px')}><UsersIcon aria-hidden width={22} height={22} /></div>
            <div style={css('font-size:14px;font-weight:700;color:#f0ece6')}>Utilisateurs</div>
            <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>Rôles, ban, suppression</div>
          </div>
        </div>
        <div className="g" onClick={() => navigate('/redesign/admin/gear')} style={css('border-radius:16px;padding:16px;cursor:pointer')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('margin-bottom:6px')}><ClimberIcon aria-hidden width={22} height={22} /></div>
            <div style={css('font-size:14px;font-weight:700;color:#f0ece6')}>Matériel</div>
            <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>Catalogue EPI</div>
          </div>
        </div>
      </div>

      {/* Spots en attente */}
      <SectionHeader small>Spots en attente de modération</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        {loading ? (
          <div className="g" style={css('border-radius:20px;padding:16px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Chargement…</div>
        ) : spots.length === 0 ? (
          <div className="g" style={css('border-radius:20px;padding:16px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Aucun spot en attente.</div>
        ) : spots.map((s) => {
          const id = String(s._id);
          const tt = TYPE_TAG[(s.type as string) ?? 'crag'] ?? TYPE_TAG.crag;
          const g = grades(s);
          return (
            <div key={id} className="g" style={css('border-radius:20px;padding:16px')}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css('display:flex;align-items:flex-start;gap:12px;margin-bottom:14px')}>
                  <div style={css('width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,rgba(40,65,30,.8),rgba(20,45,15,.9));flex-shrink:0;border:1px solid rgba(80,160,80,.2)')} />
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{(s.name as string) || 'Sans nom'}</div>
                    <div style={css('font-size:12px;color:rgba(240,236,230,.6);margin-bottom:6px')}>par {authorName(s)}</div>
                    <div style={css('display:flex;gap:6px')}><Tag variant={tt.variant}>{tt.label}</Tag>{g && <Tag variant="g">{g}</Tag>}</div>
                  </div>
                </div>
                {!!(s.description) && <div style={css('font-size:13px;color:rgba(240,236,230,.55);line-height:1.4;margin-bottom:14px')}>{s.description as string}</div>}
                <div style={css(`display:flex;gap:10px${busy === id ? ';opacity:.5;pointer-events:none' : ''}`)}>
                  <div style={css(APPROVE)} onClick={() => moderateSpot(id, 'approve')}>Approuver</div>
                  <div style={css(REJECT)} onClick={() => moderateSpot(id, 'reject')}>Rejeter</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modifications */}
      <SectionHeader small>Modifications en révision</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        {loading ? null : edits.length === 0 ? (
          <div className="g" style={css('border-radius:18px;padding:14px 16px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Aucune modification en attente.</div>
        ) : edits.map((e) => {
          const id = String(e._id);
          const nChanges = e.changes && typeof e.changes === 'object' ? Object.keys(e.changes as object).length : 0;
          return (
            <div key={id} className="g" style={css('border-radius:18px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px')}>
              <div style={css('width:36px;height:36px;border-radius:11px;background:rgba(200,120,60,.14);border:1px solid rgba(200,120,60,.22);flex-shrink:0;position:relative;z-index:2')} />
              <div style={css('flex:1;min-width:0;position:relative;z-index:2')}>
                <div style={css('font-size:14px;font-weight:600;color:#f0ece6;margin-bottom:2px')}>Modification : {(e.spotName as string) || 'un spot'}</div>
                <div style={css('font-size:12px;color:rgba(240,236,230,.6);margin-bottom:8px')}>{nChanges} champ{nChanges > 1 ? 's' : ''} modifié{nChanges > 1 ? 's' : ''}</div>
                <div style={css(`display:flex;gap:8px${busy === id ? ';opacity:.5;pointer-events:none' : ''}`)}>
                  <div style={css('padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:rgba(80,160,80,.15);border:1px solid rgba(80,160,80,.25);color:#88D088;cursor:pointer')} onClick={() => moderateEdit(id, 'approve')}>Approuver</div>
                  <div style={css('padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.65);cursor:pointer')} onClick={() => navigate('/admin/spots')}>Voir diff</div>
                  <div style={css('padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);color:#E88080;cursor:pointer')} onClick={() => moderateEdit(id, 'reject')}>Rejeter</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users */}
      <SectionHeader small>Utilisateurs récents</SectionHeader>
      <div style={css('padding:0 20px 24px')}>
        <div className="g" style={css('border-radius:20px;overflow:hidden')}>
          <div style={css('position:relative;z-index:2')}>
            {users.length === 0 ? (
              <div style={css('padding:16px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>—</div>
            ) : users.map((u, i) => {
              const admin = ((u.roles as string[]) || []).includes('admin');
              return (
                <AdminUserRow
                  key={String(u._id)}
                  border={i < users.length - 1}
                  avatarBg={admin ? 'background:rgba(212,160,48,.18)' : 'background:rgba(100,130,200,.15)'}
                  name={(u.displayName as string) || (u.username as string) || 'Utilisateur'}
                  meta={u.username ? `@${u.username}` : ''}
                  badge={admin ? 'Admin' : 'Membre'}
                  badgeVariant={admin ? 'a' : 'g'}
                />
              );
            })}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
