import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useGearStore } from '@/stores/gear.store';
import type { GearCategory, GearEpiStatus, UserMateriel } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { GearRow } from '../components/GearRow';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Matériel / EPI (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/gear`. Réutilise `useGearStore` (`/api/user-materiel/me`).
 * Regroupé par catégorie, badge EPI réel (ok/watch/retire). Non connecté → invite login.
 *
 * LECTURE seule : ajout/édition d'EPI → page live `/gear` ; catalogue → `/gear/catalogue`. i18n FR.
 */

const STAT = 'border-radius:16px;padding:14px 10px;text-align:center';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.43);text-transform:uppercase;letter-spacing:.5px';
const SECTION = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.35);padding:0 4px 10px';
const CARD = 'border-radius:20px;overflow:hidden;display:flex;flex-direction:column;margin-bottom:16px';
const BADGE_OK = 'background:rgba(80,160,80,.2);border:1px solid rgba(80,160,80,.3);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#80D880';
const BADGE_WARN = 'background:rgba(232,128,128,.2);border:1px solid rgba(232,128,128,.3);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#E88080';
const BADGE_NEUTRAL = 'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:rgba(240,236,230,.5)';

const CAT_FR: Record<GearCategory, string> = {
  rope: 'Cordes', quickdraw: 'Dégaines', belay_auto: 'Assureurs auto', belay_tube: 'Assureurs tube',
  harness: 'Baudriers', shoes: 'Chaussons', carabiner: 'Mousquetons', machard: 'Machards',
  crashpad: 'Crashpads', quicklink: 'Maillons rapides',
};
const CAT_ORDER: GearCategory[] = ['rope', 'harness', 'belay_auto', 'belay_tube', 'carabiner', 'quickdraw', 'machard', 'quicklink', 'shoes', 'crashpad'];

const gearIcon = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /><path d="M12 8v8M8 12h8" /></svg>
);

function badgeFor(status: GearEpiStatus | null): { label: string; style: string } {
  if (status === 'retire') return { label: 'Retiré', style: BADGE_WARN };
  if (status === 'watch') return { label: '⚠ Bientôt', style: BADGE_WARN };
  if (status === 'ok') return { label: 'OK', style: BADGE_OK };
  return { label: 'Suivi', style: BADGE_NEUTRAL };
}
function iconBoxFor(status: GearEpiStatus | null): { box: string; color: string } {
  if (status === 'retire' || status === 'watch') return { box: 'background:rgba(232,128,128,.12);border:1px solid rgba(232,128,128,.2)', color: '#E88080' };
  if (status === 'ok') return { box: 'background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.2)', color: '#80D880' };
  return { box: 'background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2)', color: '#D4A030' };
}

function ageSub(it: UserMateriel): string {
  const iso = it.firstUseDate || it.purchaseDate;
  if (!iso) return CAT_FR[it.category] ?? it.category;
  const months = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (30 * 86400000)));
  const since = it.firstUseDate ? 'En service depuis' : 'Acheté il y a';
  if (months < 1) return `${since} <1 mois`;
  if (months < 12) return `${since} ${months} mois`;
  const y = Math.floor(months / 12);
  return `${since} ${y} an${y > 1 ? 's' : ''}`;
}
const nameOf = (it: UserMateriel) => it.customName || [it.brand, it.model].filter(Boolean).join(' ') || (CAT_FR[it.category] ?? 'Équipement');

export function GearPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { items, loading, fetchMyGear } = useGearStore();

  useEffect(() => { if (isAuthenticated) fetchMyGear(); }, [isAuthenticated, fetchMyGear]);

  const groups = useMemo(() => {
    const by: Partial<Record<GearCategory, UserMateriel[]>> = {};
    for (const it of items) (by[it.category] ??= []).push(it);
    return CAT_ORDER.filter((c) => by[c]?.length).map((c) => ({ cat: c, list: by[c]! }));
  }, [items]);

  const actifs = items.filter((i) => i.epiStatus !== 'retire').length;
  const watch = items.filter((i) => i.epiStatus === 'watch').length;
  const retire = items.filter((i) => i.epiStatus === 'retire').length;

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Matériel</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir ton matériel.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/gear')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Matériel</span>
          <div className="na">
            <IconButton style={css('cursor:pointer')} title="Ajouter un EPI" onClick={() => navigate('/gear')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Stats */}
        <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:4px 0 20px')}>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css('font-size:22px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px')}>{actifs}</div><div style={css(STAT_LABEL)}>EPI actifs</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(`font-size:22px;font-weight:800;letter-spacing:-.5px;color:${watch ? '#E88080' : '#f0ece6'};margin-bottom:3px`)}>{watch}</div><div style={css(STAT_LABEL)}>⚠ Expire bientôt</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css('font-size:22px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px')}>{retire}</div><div style={css(STAT_LABEL)}>Retraité</div></div></div>
        </div>

        {loading && items.length === 0 ? (
          <div style={css('min-height:200px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div>
        ) : items.length === 0 ? (
          <div className="g" style={css('border-radius:20px;padding:18px;font-size:13px;color:rgba(240,236,230,.45);text-align:center;margin-bottom:16px')}>Aucun équipement enregistré. Ajoute ton premier EPI.</div>
        ) : (
          groups.map(({ cat, list }) => (
            <div key={cat}>
              <div style={css(SECTION)}>{CAT_FR[cat]}</div>
              <div className="g" style={css(CARD)}>
                {list.map((it, i) => {
                  const b = badgeFor(it.epiStatus);
                  const ib = iconBoxFor(it.epiStatus);
                  return (
                    <GearRow key={it._id} border={i < list.length - 1} iconBox={ib.box} icon={gearIcon(ib.color)} name={nameOf(it)} sub={ageSub(it)} badge={b.label} badgeStyle={b.style} />
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Lien catalogue */}
        <div className="g" onClick={() => navigate('/gear/catalogue')} style={css('border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;margin-bottom:8px')}>
          <div style={css('width:36px;height:36px;border-radius:11px;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2);display:flex;align-items:center;justify-content:center;position:relative;z-index:2')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A030" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
          </div>
          <div style={css('flex:1;font-size:15px;font-weight:600;color:#f0ece6;position:relative;z-index:2')}>Catalogue matériel</div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.22)" strokeWidth="2" style={css('position:relative;z-index:2')}><polyline points="9 18 15 12 9 6" /></svg>
        </div>
        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
