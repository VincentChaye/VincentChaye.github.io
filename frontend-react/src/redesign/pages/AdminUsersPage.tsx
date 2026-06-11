import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { SectionHeader, Tag } from '../components/primitives';
import { BackChevronIcon, SearchIcon } from '../lib/icons';

/**
 * SWAP — Admin / Gestion des utilisateurs (design Liquid Glass) câblé au VRAI backend `requireAdmin`.
 * Route additive `/redesign/admin/users`. APIs : `GET /api/users?limit&skip&search`,
 * `PATCH /api/users/:id` ({roles} promo admin · {status} ban/unban), `DELETE /api/users/:id`.
 * Port de l'écran live `AdminUsersPage`. i18n en dur (FR), comme le reste du redesign.
 */

interface AdminUser {
  _id: string;
  displayName?: string;
  email?: string;
  username?: string;
  roles?: string[];
  status?: string;
  security?: { createdAt?: string };
}

const LIMIT = 20;
const CHIP = 'padding:7px 12px;border-radius:9999px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap';
const CHIP_NEUTRAL = 'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.70)';
const CHIP_AMBER = 'background:rgba(212,160,48,.16);border:1px solid rgba(212,160,48,.26);color:#D4A030';
const CHIP_GREEN = 'background:rgba(80,160,80,.16);border:1px solid rgba(80,160,80,.26);color:#88D088';
const CHIP_RED = 'background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);color:#E88080';
const PAGER = 'width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:#f0ece6;font-size:20px;line-height:1';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (s: string, p: number) => {
    setLoading(true);
    try {
      const q = s ? `&search=${encodeURIComponent(s)}` : '';
      const data = await apiFetch<{ items: AdminUser[]; total: number }>(
        `/api/users?limit=${LIMIT}&skip=${p * LIMIT}${q}`,
        { auth: true },
      );
      setUsers(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch { /* silencieux */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAdmin) load(search, page); }, [isAdmin, search, page, load]);

  async function toggleAdmin(id: string, isAdminNow: boolean) {
    if (busy) return;
    setBusy(id);
    try {
      const roles = isAdminNow ? ['user'] : ['admin'];
      await apiFetch(`/api/users/${id}`, { method: 'PATCH', auth: true, body: JSON.stringify({ roles }) });
      setUsers((l) => l.map((u) => (u._id === id ? { ...u, roles } : u)));
    } catch { /* reste affiché */ } finally { setBusy(null); }
  }
  async function toggleBan(id: string, isBanned: boolean) {
    if (busy) return;
    setBusy(id);
    try {
      const status = isBanned ? 'active' : 'banned';
      await apiFetch(`/api/users/${id}`, { method: 'PATCH', auth: true, body: JSON.stringify({ status }) });
      setUsers((l) => l.map((u) => (u._id === id ? { ...u, status } : u)));
    } catch { /* reste affiché */ } finally { setBusy(null); }
  }
  async function remove(id: string, name: string) {
    if (busy) return;
    if (!confirm(`Supprimer ${name} ? Action irréversible.`)) return;
    setBusy(id);
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE', auth: true });
      setUsers((l) => l.filter((u) => u._id !== id));
      setTotal((n) => Math.max(0, n - 1));
    } catch { /* reste affiché */ } finally { setBusy(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const Nav = (
    <NavBar>
      <div className="nbi">
        <div className="back-btn" onClick={() => navigate('/redesign/admin')}><BackChevronIcon width={9} height={15} /> Admin</div>
        <span className="nt">Utilisateurs</span>
        <div style={css('width:54px')} />
      </div>
    </NavBar>
  );

  if (!isAuthenticated || !isAdmin) {
    return (
      <PageFrame>
        {Nav}
        <div style={css('padding:60px 28px;text-align:center;color:rgba(240,236,230,.6);font-size:15px')}>Accès réservé aux administrateurs.</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      {Nav}

      {/* Recherche */}
      <div style={css('padding:4px 20px 0')}>
        <div className="g" style={css('border-radius:14px;padding:11px 14px')}>
          <div style={css('position:relative;z-index:2;display:flex;align-items:center;gap:10px')}>
            <span style={css('opacity:.5;flex-shrink:0;display:flex')}><SearchIcon width={16} height={16} /></span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher un utilisateur…"
              style={css('flex:1;min-width:0;background:transparent;border:none;outline:none;color:#f0ece6;font-size:14px')}
            />
            {search && <span onClick={() => { setSearch(''); setPage(0); }} style={css('opacity:.5;cursor:pointer;font-size:20px;line-height:1;flex-shrink:0')}>×</span>}
          </div>
        </div>
      </div>

      <SectionHeader small>{loading ? 'Chargement…' : `${total} utilisateur${total > 1 ? 's' : ''}`}</SectionHeader>

      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        {loading ? (
          <div className="g" style={css('border-radius:20px;padding:16px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Chargement…</div>
        ) : users.length === 0 ? (
          <div className="g" style={css('border-radius:20px;padding:16px;text-align:center;color:rgba(240,236,230,.6);font-size:13px')}>Aucun utilisateur.</div>
        ) : users.map((u) => {
          const admin = (u.roles ?? []).includes('admin');
          const banned = u.status === 'banned';
          const self = String(u._id) === String(user?._id);
          const dis = busy === u._id;
          const avatarBg = admin
            ? 'linear-gradient(145deg,rgba(212,160,48,.9),rgba(232,184,75,.95))'
            : 'rgba(100,130,200,.30)';
          return (
            <div key={u._id} className="g" style={css(`border-radius:18px;padding:14px 16px${banned ? ';opacity:.55' : ''}`)}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:10px')}>
                  <div style={css(`width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#1a0f05;background:${avatarBg}`)}>{(u.displayName || u.username || '?')[0].toUpperCase()}</div>
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                      <span style={css('font-size:15px;font-weight:700;color:#f0ece6')}>{u.displayName || u.username || 'Utilisateur'}</span>
                      {admin && <Tag variant="a">· Admin</Tag>}
                      {banned && <Tag variant="r">· Banni</Tag>}
                      {self && <Tag variant="b">· Toi</Tag>}
                    </div>
                    <div style={css('font-size:12px;color:rgba(240,236,230,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{u.email || (u.username ? `@${u.username}` : '—')}</div>
                  </div>
                </div>
                {self ? (
                  <div style={css('font-size:12px;color:rgba(240,236,230,.6);font-style:italic')}>Ton compte — actions désactivées.</div>
                ) : (
                  <div style={css(`display:flex;gap:8px;flex-wrap:wrap${dis ? ';opacity:.5;pointer-events:none' : ''}`)}>
                    <div onClick={() => toggleAdmin(u._id, admin)} style={css(`${CHIP};${admin ? CHIP_NEUTRAL : CHIP_AMBER}`)}>{admin ? 'Retirer admin' : 'Promouvoir'}</div>
                    <div onClick={() => toggleBan(u._id, banned)} style={css(`${CHIP};${banned ? CHIP_GREEN : CHIP_NEUTRAL}`)}>{banned ? 'Réactiver' : 'Bannir'}</div>
                    <div onClick={() => remove(u._id, u.displayName || u.username || 'cet utilisateur')} style={css(`${CHIP};${CHIP_RED}`)}>Supprimer</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={css('padding:16px 20px 28px;display:flex;align-items:center;justify-content:center;gap:18px')}>
          <div onClick={() => setPage((p) => Math.max(0, p - 1))} style={css(`${PAGER}${page === 0 ? ';opacity:.3;pointer-events:none' : ';cursor:pointer'}`)}>‹</div>
          <span style={css('font-size:13px;color:rgba(240,236,230,.6)')}>{page + 1} / {totalPages}</span>
          <div onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} style={css(`${PAGER}${page >= totalPages - 1 ? ';opacity:.3;pointer-events:none' : ';cursor:pointer'}`)}>›</div>
        </div>
      )}
    </PageFrame>
  );
}
