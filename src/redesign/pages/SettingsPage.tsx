import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { SUPPORTED_LANGS } from '@/i18n/config';
import type { NotificationPreferences } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { Toggle } from '../components/Toggle';
import { Pressable } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Paramètres (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route `/redesign/settings` — c'est LA page paramètres de l'app native (l'ancienne
 * `/settings` y redirige), donc tout est implémenté ici, sans fuite vers l'ancien design :
 *  - Profil : avatar (`POST /api/users/me/avatar`), nom/pseudo/bio/niveau (`PATCH /api/users/me`)
 *  - Confidentialité : compte privé, visibilité carnet & matériel (`PATCH /api/users/me`)
 *  - Notifications : 6 préférences + mode silencieux avec plage horaire
 *  - Mot de passe : `PATCH /api/auth/change-password`
 *  - Langue (i18n + `zdg_lang`) et thème (store — le redesign reste sombre, le choix
 *    s'applique à l'UI web classique)
 *  - Admin (liens /redesign/admin*), déconnexion, suppression de compte (double confirmation)
 * i18n en dur (FR), comme les autres pages redesign.
 */

const GROUP = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);padding:16px 4px 10px';
const CARD = 'border-radius:20px;overflow:hidden;display:flex;flex-direction:column';
const ROW_B = 'padding:14px 18px;display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;position:relative;z-index:2';
const ROW = 'padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;position:relative;z-index:2';
const ROWN_B = 'padding:14px 18px;display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,.05);position:relative;z-index:2';
const ROWN = 'padding:14px 18px;display:flex;align-items:center;gap:14px;position:relative;z-index:2';
const TITLE_MB = 'font-size:15px;font-weight:600;color:#f0ece6;margin-bottom:2px';
const TITLE = 'font-size:15px;font-weight:600;color:#f0ece6';
const SUB = 'font-size:12px;color:rgba(240,236,230,.6)';
const CHEV = 'color:rgba(240,236,230,.22);font-size:18px;transition:transform .2s';
const VALUE = 'font-size:13px;color:rgba(240,236,230,.6);font-weight:500';
const ICONBOX = 'width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0';
const FORM = 'padding:4px 18px 16px;display:flex;flex-direction:column;gap:12px;position:relative;z-index:2';
const LABEL = 'font-size:11px;font-weight:600;color:rgba(212,160,48,.8);letter-spacing:.3px;margin-bottom:4px';
const INPUT = 'width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;color:#f0ece6;font-size:15px;outline:none;font-family:inherit';
const SELECT = 'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px 10px;color:#f0ece6;font-size:13px;font-weight:500;outline:none;cursor:pointer';
const BTN_GOLD = 'padding:11px 20px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28);width:100%';
const ERR = 'font-size:12px;color:#f87171';

const APP_VERSION = '6.3.0';
const LANG_FR: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español' };
const LEVELS = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
] as const;
const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'friends', label: 'Amis' },
  { value: 'private', label: 'Privé' },
] as const;
type Visibility = (typeof VISIBILITIES)[number]['value'];

type PrefKey = keyof Omit<NotificationPreferences, 'quietMode'>;
const NOTIF_ROWS: { key: PrefKey; title: string; sub: string }[] = [
  { key: 'friendRequest', title: 'Demandes d\'ami', sub: 'Quand on veut t\'ajouter' },
  { key: 'friendAccepted', title: 'Demande acceptée', sub: 'Quand ta demande est acceptée' },
  { key: 'newFollower', title: 'Nouveaux abonnés', sub: 'Quand on te suit' },
  { key: 'newReview', title: 'Nouvel avis', sub: 'Avis sur tes spots' },
  { key: 'spotApproved', title: 'Spot approuvé', sub: 'Ta proposition validée' },
  { key: 'spotRejected', title: 'Spot refusé', sub: 'Ta proposition rejetée' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SettingsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout, updateUser } = useAuthStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  // ── Accordéon (une seule section dépliée à la fois) ──
  const [openSection, setOpenSection] = useState<'profile' | 'password' | null>(null);
  const toggleSection = (s: 'profile' | 'password') => setOpenSection((cur) => (cur === s ? null : s));

  // ── Profil ──
  const [profileForm, setProfileForm] = useState({ displayName: '', username: '', bio: '', level: 'debutant' });
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── Mot de passe ──
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  // ── Notifications ──
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => ({ ...user?.notificationPreferences }));
  const [saving, setSaving] = useState(false);

  // ── Suppression de compte ──
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOn = (k: PrefKey) => prefs[k] !== false; // défaut = activé
  const quietMode = prefs.quietMode ?? { enabled: false, startHour: 22, endHour: 7 };

  async function patchMe(body: Record<string, unknown>) {
    await apiFetch('/api/users/me', { method: 'PATCH', auth: true, body: JSON.stringify(body) });
  }

  async function togglePref(k: PrefKey) {
    if (saving) return;
    const next = !isOn(k);
    const updated = { ...prefs, [k]: next };
    setPrefs(updated);                 // optimiste
    setSaving(true);
    try {
      await patchMe({ notificationPreferences: { [k]: next } });
      updateUser({ notificationPreferences: updated });
    } catch {
      setPrefs((p) => ({ ...p, [k]: !next })); // rollback
    } finally {
      setSaving(false);
    }
  }

  async function patchQuietMode(patch: Partial<NonNullable<NotificationPreferences['quietMode']>>) {
    if (saving) return;
    const prev = quietMode;
    const updated = { ...prefs, quietMode: { ...quietMode, ...patch } };
    setPrefs(updated);                 // optimiste
    setSaving(true);
    try {
      await patchMe({ notificationPreferences: { quietMode: patch } });
      updateUser({ notificationPreferences: updated });
    } catch {
      setPrefs((p) => ({ ...p, quietMode: prev })); // rollback
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate('/redesign/profile')}><BackChevronIcon width={9} height={15} /> Profil</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Paramètres</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour accéder aux paramètres.</div>
          <Pressable onClick={() => navigate('/redesign/login?next=/redesign/settings')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</Pressable>
        </div>
      </PageFrame>
    );
  }

  const isPrivate = user.privacy?.isPrivate ?? false;
  const logbookVisibility = user.privacy?.logbookVisibility ?? 'public';
  const gearVisibility = user.privacy?.gearVisibility ?? 'private';
  const langCode = (localStorage.getItem('zdg_lang') || user.preferences?.lang || i18n.language || 'fr').slice(0, 2);

  function openProfileForm() {
    if (openSection !== 'profile') {
      setProfileForm({
        displayName: user!.displayName,
        username: user!.username || '',
        bio: user!.profile?.bio || '',
        level: user!.profile?.level || 'debutant',
      });
    }
    toggleSection('profile');
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    if (!profileForm.displayName.trim()) { toast.error('Le nom est requis.'); return; }
    setSavingProfile(true);
    try {
      const username = profileForm.username.trim().toLowerCase();
      const data = await apiFetch<Record<string, unknown>>('/api/users/me', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({
          displayName: profileForm.displayName.trim(),
          // username vide → on ne l'envoie pas (le backend exige 3-30 caractères)
          ...(username ? { username } : {}),
          bio: profileForm.bio.trim() || null,
          level: profileForm.level,
        }),
      });
      updateUser({
        displayName: (data.displayName as string) || profileForm.displayName.trim(),
        username: (data.username as string) || profileForm.username.trim(),
        profile: { level: profileForm.level, bio: profileForm.bio.trim() || undefined },
      });
      setOpenSection(null);
      toast.success('Profil mis à jour.');
    } catch {
      toast.error('Enregistrement impossible. Réessaie.');
    }
    setSavingProfile(false);
  }

  async function handleAvatarFile(file: File | null) {
    if (!file || uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const data = await apiFetch<Record<string, unknown>>('/api/users/me/avatar', { method: 'POST', auth: true, body: form });
      if (data?.avatarUrl) updateUser({ avatarUrl: data.avatarUrl as string });
      toast.success('Photo de profil mise à jour.');
    } catch {
      toast.error('Envoi de la photo impossible.');
    }
    setUploadingAvatar(false);
  }

  async function togglePrivate() {
    const next = !isPrivate;
    updateUser({ privacy: { ...user!.privacy, isPrivate: next } }); // optimiste
    try { await patchMe({ isPrivate: next }); }
    catch {
      updateUser({ privacy: { ...user!.privacy, isPrivate: !next } });
      toast.error('Enregistrement impossible.');
    }
  }

  async function changeVisibility(field: 'logbookVisibility' | 'gearVisibility', v: Visibility) {
    const prev = field === 'logbookVisibility' ? logbookVisibility : gearVisibility;
    updateUser({ privacy: { ...user!.privacy, [field]: v } }); // optimiste
    try { await patchMe({ [field]: v }); }
    catch {
      updateUser({ privacy: { ...user!.privacy, [field]: prev } });
      toast.error('Enregistrement impossible.');
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    if (!pwForm.current) { setPwError('Mot de passe actuel requis.'); return; }
    if (pwForm.next.length < 12) { setPwError('Le nouveau mot de passe doit faire au moins 12 caractères.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return; }
    setPwSaving(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'PATCH', auth: true,
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      setPwForm({ current: '', next: '', confirm: '' });
      setOpenSection(null);
      toast.success('Mot de passe modifié.');
    } catch {
      setPwError('Mot de passe actuel incorrect.');
    }
    setPwSaving(false);
  }

  function changeLang(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('zdg_lang', lang);
    updateUser({ preferences: { ...user!.preferences, lang } });
  }

  function handleLogout() {
    logout();
    navigate('/redesign/login');
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await apiFetch(`/api/users/${user!._id}`, { method: 'DELETE', auth: true });
      logout();
      navigate('/redesign/home');
      toast.success('Compte supprimé.');
    } catch {
      toast.error('Suppression impossible. Réessaie.');
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate('/redesign/profile')}><BackChevronIcon width={9} height={15} /> Profil</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Paramètres</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Compte */}
        <div style={css(GROUP)}>Compte</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)} onClick={openProfileForm}>
            <div style={css(`${ICONBOX};background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.22);color:#D4A030`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Modifier le profil</div><div style={css(SUB)}>Photo, nom, bio</div></div>
            <div style={css(`${CHEV}${openSection === 'profile' ? ';transform:rotate(90deg)' : ''}`)}>›</div>
          </div>
          {openSection === 'profile' && (
            <form onSubmit={saveProfile} style={css(`${FORM};border-bottom:1px solid rgba(255,255,255,.05)`)}>
              <div style={css('display:flex;align-items:center;gap:14px')}>
                <div style={css('width:56px;height:56px;border-radius:50%;overflow:hidden;background:rgba(212,160,48,.18);border:1px solid rgba(212,160,48,.3);display:flex;align-items:center;justify-content:center;color:#D4A030;font-weight:700;font-size:22px;flex-shrink:0')}>
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : (user.displayName?.[0] ?? '?').toUpperCase()}
                </div>
                <Pressable onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={css('padding:8px 14px;border-radius:9999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#f0ece6;font-size:13px;font-weight:600;cursor:pointer')}>
                  {uploadingAvatar ? 'Envoi…' : 'Changer la photo'}
                </Pressable>
                <input ref={avatarInputRef} type="file" accept="image/*" style={css('display:none')} onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)} />
              </div>
              <div><div style={css(LABEL)}>NOM</div><input value={profileForm.displayName} onChange={(e) => setProfileForm((f) => ({ ...f, displayName: e.target.value }))} style={css(INPUT)} /></div>
              <div><div style={css(LABEL)}>PSEUDO</div><input value={profileForm.username} onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} style={css(INPUT)} /></div>
              <div>
                <div style={css(LABEL)}>BIO</div>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value.slice(0, 160) }))} rows={2} placeholder="Quelques mots sur toi…" style={css(`${INPUT};resize:none`)} />
                <div style={css('text-align:right;font-size:10px;color:rgba(240,236,230,.4);margin-top:2px')}>{profileForm.bio.length}/160</div>
              </div>
              <div>
                <div style={css(LABEL)}>NIVEAU</div>
                <select value={profileForm.level} onChange={(e) => setProfileForm((f) => ({ ...f, level: e.target.value }))} style={css(`${SELECT};width:100%;padding:10px 12px;font-size:15px`)}>
                  {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <Pressable type="submit" disabled={savingProfile} style={css(BTN_GOLD)}>{savingProfile ? 'Enregistrement…' : 'Enregistrer'}</Pressable>
            </form>
          )}
          <div style={css(ROWN_B)}>
            <div style={css(`${ICONBOX};background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.20);color:#88BBEE`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Email</div><div style={css(SUB)}>{user.email}</div></div>
          </div>
          <div style={css(openSection === 'password' ? ROW_B : ROW)} onClick={() => { setPwError(''); toggleSection('password'); }}>
            <div style={css(`${ICONBOX};background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.20);color:#D4A030`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Mot de passe</div><div style={css(SUB)}>Modifier le mot de passe</div></div>
            <div style={css(`${CHEV}${openSection === 'password' ? ';transform:rotate(90deg)' : ''}`)}>›</div>
          </div>
          {openSection === 'password' && (
            <form onSubmit={changePassword} style={css(FORM)}>
              <div><div style={css(LABEL)}>MOT DE PASSE ACTUEL</div><input type="password" autoComplete="current-password" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} style={css(INPUT)} /></div>
              <div><div style={css(LABEL)}>NOUVEAU MOT DE PASSE</div><input type="password" autoComplete="new-password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} style={css(INPUT)} /></div>
              <div><div style={css(LABEL)}>CONFIRMER</div><input type="password" autoComplete="new-password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} style={css(INPUT)} /></div>
              <div style={css('font-size:11px;color:rgba(240,236,230,.45)')}>Au moins 12 caractères.</div>
              {pwError && <div style={css(ERR)}>{pwError}</div>}
              <Pressable type="submit" disabled={pwSaving} style={css(BTN_GOLD)}>{pwSaving ? 'Modification…' : 'Modifier le mot de passe'}</Pressable>
            </form>
          )}
        </div>

        {/* Confidentialité */}
        <div style={css(GROUP)}>Confidentialité</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROWN_B)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Compte privé</div><div style={css(SUB)}>Profil visible par tes amis uniquement</div></div>
            <Toggle on={isPrivate} onClick={togglePrivate} />
          </div>
          <div style={css(ROWN_B)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Carnet de grimpe</div><div style={css(SUB)}>Qui voit tes ascensions</div></div>
            <select value={logbookVisibility} onChange={(e) => changeVisibility('logbookVisibility', e.target.value as Visibility)} style={css(SELECT)}>
              {VISIBILITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div style={css(ROWN)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Matériel</div><div style={css(SUB)}>Qui voit ton équipement</div></div>
            <select value={gearVisibility} onChange={(e) => changeVisibility('gearVisibility', e.target.value as Visibility)} style={css(SELECT)}>
              {VISIBILITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Notifications — vraies préférences */}
        <div style={css(GROUP)}>Notifications</div>
        <div className="g" style={css(CARD)}>
          {NOTIF_ROWS.map((r) => (
            <div key={r.key} style={css(ROWN_B)}>
              <div style={css('flex:1')}><div style={css(TITLE_MB)}>{r.title}</div><div style={css(SUB)}>{r.sub}</div></div>
              <Toggle on={isOn(r.key)} onClick={() => togglePref(r.key)} />
            </div>
          ))}
          <div style={css(quietMode.enabled ? ROWN_B : ROWN)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Mode silencieux</div><div style={css(SUB)}>Pas de notifications la nuit</div></div>
            <Toggle on={quietMode.enabled ?? false} onClick={() => patchQuietMode({ enabled: !(quietMode.enabled ?? false) })} />
          </div>
          {quietMode.enabled && (
            <div style={css(`${ROWN};justify-content:flex-start`)}>
              <span style={css(VALUE)}>De</span>
              <select value={quietMode.startHour ?? 22} onChange={(e) => patchQuietMode({ startHour: parseInt(e.target.value, 10) })} style={css(SELECT)}>
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
              </select>
              <span style={css(VALUE)}>à</span>
              <select value={quietMode.endHour ?? 7} onChange={(e) => patchQuietMode({ endHour: parseInt(e.target.value, 10) })} style={css(SELECT)}>
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Apparence & Langue */}
        <div style={css(GROUP)}>Apparence & Langue</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROWN_B)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Thème sombre</div><div style={css(SUB)}>S'applique à la version web</div></div>
            <Toggle on={theme === 'dark'} onClick={toggleTheme} />
          </div>
          <div style={css(ROWN)}>
            <div style={css('flex:1')}><div style={css(TITLE)}>Langue</div></div>
            <select value={langCode} onChange={(e) => changeLang(e.target.value)} style={css(SELECT)}>
              {SUPPORTED_LANGS.map((l) => <option key={l} value={l}>{LANG_FR[l] ?? l.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        {/* Administration */}
        {isAdmin && (
          <>
            <div style={css(GROUP)}>Administration</div>
            <div className="g" style={css(CARD)}>
              <div style={css(ROW_B)} onClick={() => navigate('/redesign/admin')}><div style={css('flex:1')}><div style={css(TITLE)}>Spots & modifications</div></div><div style={css(CHEV)}>›</div></div>
              <div style={css(ROW_B)} onClick={() => navigate('/redesign/admin/users')}><div style={css('flex:1')}><div style={css(TITLE)}>Utilisateurs</div></div><div style={css(CHEV)}>›</div></div>
              <div style={css(ROW)} onClick={() => navigate('/redesign/admin/gear')}><div style={css('flex:1')}><div style={css(TITLE)}>Matériel</div></div><div style={css(CHEV)}>›</div></div>
            </div>
          </>
        )}

        {/* Compte — actions sensibles */}
        <div style={css(GROUP)}>Session</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)} onClick={handleLogout}>
            <div style={css(`${ICONBOX};background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.8)`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE)}>Se déconnecter</div></div>
          </div>
          <div style={css(ROWN)}>
            <div style={css(`${ICONBOX};background:rgba(220,60,60,.12);border:1px solid rgba(220,60,60,.22);color:#f87171`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </div>
            <div style={css('flex:1')}>
              <div style={css('font-size:15px;font-weight:600;color:#f87171;cursor:pointer')} onClick={handleDelete}>
                {deleting ? 'Suppression…' : confirmDelete ? 'Confirmer la suppression ?' : 'Supprimer mon compte'}
              </div>
              <div style={css(SUB)}>{confirmDelete ? 'Cette action est définitive.' : 'Supprime ton compte et tes données'}</div>
            </div>
            {confirmDelete && !deleting && (
              <Pressable onClick={() => setConfirmDelete(false)} style={css('padding:8px 14px;border-radius:9999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#f0ece6;font-size:13px;font-weight:600;cursor:pointer')}>Annuler</Pressable>
            )}
          </div>
        </div>

        {/* À propos */}
        <div style={css(GROUP)}>À propos</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROWN)}><div style={css('flex:1')}><div style={css(TITLE)}>Version</div></div><div style={css('font-size:13px;color:rgba(240,236,230,.6)')}>{APP_VERSION}</div></div>
        </div>
        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
