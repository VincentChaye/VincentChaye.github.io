import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import type { NotificationPreferences } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { Toggle } from '../components/Toggle';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Paramètres (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/settings`. Email/Thème/Langue affichés en RÉEL ; les bascules
 * Notifications reflètent et persistent les VRAIES préférences (`PATCH /api/users/me`).
 *
 * Honnête : les toggles de la maquette (« push », « spots proches », « email hebdo ») n'existent
 * pas côté backend → remplacés par les vraies préférences (`friendRequest`/`newFollower`/…).
 * Édition profil/mdp/thème/langue → délègue aux pages live (`/settings`). i18n en dur (FR).
 */

const GROUP = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.35);padding:16px 4px 10px';
const CARD = 'border-radius:20px;overflow:hidden;display:flex;flex-direction:column';
const ROW_B = 'padding:14px 18px;display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;position:relative;z-index:2';
const ROW = 'padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;position:relative;z-index:2';
const ROWN_B = 'padding:14px 18px;display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,.05);position:relative;z-index:2';
const ROWN = 'padding:14px 18px;display:flex;align-items:center;gap:14px;position:relative;z-index:2';
const TITLE_MB = 'font-size:15px;font-weight:600;color:#f0ece6;margin-bottom:2px';
const TITLE = 'font-size:15px;font-weight:600;color:#f0ece6';
const SUB = 'font-size:12px;color:rgba(240,236,230,.45)';
const CHEV = 'color:rgba(240,236,230,.22);font-size:18px';
const VALUE = 'font-size:13px;color:rgba(240,236,230,.45);font-weight:500';
const ICONBOX = 'width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0';

const APP_VERSION = '6.3.0';
const LANG_FR: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español' };

type PrefKey = keyof Omit<NotificationPreferences, 'quietMode' | 'notificationPreferences'>;
const NOTIF_ROWS: { key: PrefKey; title: string; sub: string }[] = [
  { key: 'friendRequest', title: 'Demandes d\'ami', sub: 'Quand on veut t\'ajouter' },
  { key: 'newFollower', title: 'Nouveaux abonnés', sub: 'Quand on te suit' },
  { key: 'newReview', title: 'Nouvel avis', sub: 'Avis sur tes spots' },
  { key: 'spotApproved', title: 'Spot approuvé', sub: 'Ta proposition validée' },
  { key: 'spotRejected', title: 'Spot refusé', sub: 'Ta proposition rejetée' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => ({ ...user?.notificationPreferences }));
  const [saving, setSaving] = useState(false);

  const isOn = (k: PrefKey) => prefs[k] !== false; // défaut = activé

  async function togglePref(k: PrefKey) {
    if (saving) return;
    const next = !isOn(k);
    const updated = { ...prefs, [k]: next };
    setPrefs(updated);                 // optimiste
    setSaving(true);
    try {
      await apiFetch('/api/users/me', { method: 'PATCH', auth: true, body: JSON.stringify({ notificationPreferences: { [k]: next } }) });
      updateUser({ notificationPreferences: updated });
    } catch {
      setPrefs((p) => ({ ...p, [k]: !next })); // rollback
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Paramètres</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour accéder aux paramètres.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/settings')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  const langLabel = LANG_FR[localStorage.getItem('zdg_lang') || user.preferences?.lang || 'fr'] ?? 'Français';
  const themeLabel = theme === 'dark' ? 'Sombre' : 'Clair';

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Paramètres</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Compte */}
        <div style={css(GROUP)}>Compte</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)} onClick={() => navigate('/settings')}>
            <div style={css(`${ICONBOX};background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.22);color:#D4A030`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Modifier le profil</div><div style={css(SUB)}>Photo, nom, bio</div></div>
            <div style={css(CHEV)}>›</div>
          </div>
          <div style={css(ROWN_B)}>
            <div style={css(`${ICONBOX};background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.20);color:#88BBEE`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Email</div><div style={css(SUB)}>{user.email}</div></div>
          </div>
          <div style={css(ROW)} onClick={() => navigate('/settings')}>
            <div style={css(`${ICONBOX};background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.20);color:#D4A030`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Mot de passe</div><div style={css(SUB)}>Modifier le mot de passe</div></div>
            <div style={css(CHEV)}>›</div>
          </div>
        </div>

        {/* Notifications — vraies préférences */}
        <div style={css(GROUP)}>Notifications</div>
        <div className="g" style={css(CARD)}>
          {NOTIF_ROWS.map((r, i) => (
            <div key={r.key} style={css(i < NOTIF_ROWS.length - 1 ? ROWN_B : ROWN)}>
              <div style={css('flex:1')}><div style={css(TITLE_MB)}>{r.title}</div><div style={css(SUB)}>{r.sub}</div></div>
              <Toggle on={isOn(r.key)} onClick={() => togglePref(r.key)} />
            </div>
          ))}
        </div>

        {/* Apparence & Langue */}
        <div style={css(GROUP)}>Apparence & Langue</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)} onClick={() => navigate('/settings')}><div style={css('flex:1')}><div style={css(TITLE)}>Thème</div></div><div style={css(VALUE)}>{themeLabel}</div><div style={css(`${CHEV};margin-left:8px`)}>›</div></div>
          <div style={css(ROW)} onClick={() => navigate('/settings')}><div style={css('flex:1')}><div style={css(TITLE)}>Langue</div></div><div style={css(VALUE)}>{langLabel}</div><div style={css(`${CHEV};margin-left:8px`)}>›</div></div>
        </div>

        {/* À propos */}
        <div style={css(GROUP)}>À propos</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROWN_B)}><div style={css('flex:1')}><div style={css(TITLE)}>Version</div></div><div style={css('font-size:13px;color:rgba(240,236,230,.45)')}>{APP_VERSION}</div></div>
          <div style={css(ROW_B)} onClick={() => navigate('/settings')}><div style={css('flex:1')}><div style={css(TITLE)}>Conditions d'utilisation</div></div><div style={css(CHEV)}>›</div></div>
          <div style={css(ROW)} onClick={() => navigate('/settings')}><div style={css('flex:1')}><div style={css(TITLE)}>Politique de confidentialité</div></div><div style={css(CHEV)}>›</div></div>
        </div>
        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
