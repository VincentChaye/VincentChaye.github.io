import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthState } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { GlassCard } from '../components/primitives';

/**
 * SWAP — Login/Inscription (design Liquid Glass) câblé au VRAI backend.
 * Route additive `/redesign/login`. POST `/api/auth/login` et `/api/auth/register`, token rangé dans
 * `useAuthStore.login()` (localStorage + state) → session valable dans TOUTE l'app, donc les écrans
 * protégés à venir afficheront les vraies données une fois connecté.
 *
 * Inscription : réutilise les 3 champs de la maquette (pseudo/email/mdp) ; `displayName` = pseudo par
 * défaut (l'API l'exige). Différé : mot de passe oublié (→ page live), connexion Apple/Google (pas d'OAuth
 * backend). i18n en dur (FR), comme la maquette.
 */

const TAB_ON = 'padding:10px;border-radius:12px;text-align:center;font-size:14px;font-weight:700;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.90));color:#1a0f05;box-shadow:0 2px 10px rgba(212,160,48,.3)';
const TAB_OFF = 'padding:10px;border-radius:12px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;color:rgba(240,236,230,.55)';
const FIELD_LABEL = 'padding:12px 16px 2px;font-size:11px;font-weight:600;color:rgba(212,160,48,.8);letter-spacing:.3px';
const FIELD_INPUT = 'padding:0 16px 12px;font-size:16px;color:#f0ece6;background:transparent;border:none;outline:none;width:100%;font-family:inherit;box-sizing:border-box';
const SOCIAL_BTN = 'border-radius:9999px;padding:0 20px;height:50px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;position:relative;overflow:hidden';

const ERR_FR: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  missing_fields: 'Remplis tous les champs.',
  too_many_requests: 'Trop de tentatives, réessaie plus tard.',
  email_taken: 'Cet email est déjà utilisé.',
  username_taken: 'Ce pseudo est déjà pris.',
  invalid_password: 'Mot de passe trop court (8 caractères min).',
  username_invalid_format: 'Pseudo invalide (3+ car., a-z 0-9 _).',
  invalid_email: 'Email invalide.',
  username_required: 'Choisis un pseudo.',
};

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, isAuthenticated } = useAuthStore();
  const next = params.get('next') || '/redesign/search';

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate(next, { replace: true }); }, [isAuthenticated, navigate, next]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (isRegister) {
      if (username.trim().length < 3) { setError(ERR_FR.username_invalid_format); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(ERR_FR.invalid_email); return; }
      if (password.length < 8) { setError(ERR_FR.invalid_password); return; }
    } else if (!email.trim() || !password) {
      setError(ERR_FR.missing_fields); return;
    }
    setLoading(true);
    try {
      const path = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { email, password, username: username.trim(), displayName: username.trim() }
        : { email, password };
      const data = await apiFetch<AuthState>(path, { method: 'POST', body: JSON.stringify(body) });
      login(data);
      navigate(next);
    } catch (err) {
      if (err instanceof ApiError) {
        try { const b = JSON.parse(err.body); setError(ERR_FR[b.error] || b.detail || 'Une erreur est survenue.'); }
        catch { setError('Une erreur est survenue.'); }
      } else setError('Une erreur est survenue.');
    } finally { setLoading(false); }
  }

  return (
    <PageFrame>
      <form onSubmit={handleSubmit} style={css('min-height:100%;display:flex;flex-direction:column;padding:70px 24px 24px')}>
        <div style={css('text-align:center;margin-bottom:40px')}>
          <div style={css('width:72px;height:72px;border-radius:22px;background:rgba(42,110,60,.20);backdrop-filter:blur(20px);border:1px solid rgba(212,160,48,.25);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px;box-shadow:0 0 30px rgba(212,160,48,.15)')} />
          <div style={css('font-size:26px;font-weight:800;letter-spacing:-0.8px;color:#f0ece6;margin-bottom:6px')}>{isRegister ? 'Bienvenue !' : 'Bon retour !'}</div>
          <div style={css('font-size:14px;color:rgba(240,236,230,.6)')}>{isRegister ? 'Crée ton compte pour grimper' : 'Connecte-toi pour grimper'}</div>
        </div>

        {/* Tabs */}
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);margin-bottom:28px')}>
          <div onClick={() => { setIsRegister(false); setError(''); }} style={css(isRegister ? TAB_OFF : TAB_ON)}>Connexion</div>
          <div onClick={() => { setIsRegister(true); setError(''); }} style={css(isRegister ? TAB_ON : TAB_OFF)}>Inscription</div>
        </div>

        {/* Fields */}
        <div style={css('display:flex;flex-direction:column;gap:14px')}>
          {isRegister && (
            <GlassCard style={css('border-radius:16px;overflow:hidden')}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css(FIELD_LABEL)}>Nom d'utilisateur</div>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ton_pseudo" autoComplete="username" style={css(FIELD_INPUT)} />
              </div>
            </GlassCard>
          )}
          <GlassCard style={css('border-radius:16px;overflow:hidden')}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Email</div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" autoComplete="email" style={css(FIELD_INPUT)} />
            </div>
          </GlassCard>
          <GlassCard style={css('border-radius:16px;overflow:hidden')}>
            <div style={css('position:relative;z-index:2;display:flex;align-items:center')}>
              <div style={css('flex:1')}>
                <div style={css(FIELD_LABEL)}>Mot de passe</div>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} style={css(FIELD_INPUT)} />
              </div>
              <div onClick={() => setShowPassword((v) => !v)} style={css('padding-right:16px;color:rgba(240,236,230,.6);cursor:pointer')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /></svg>
              </div>
            </div>
          </GlassCard>

          {error && (
            <div style={css('font-size:13px;color:#E88080;background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);border-radius:12px;padding:10px 14px')}>{error}</div>
          )}

          {!isRegister && (
            <div style={css('text-align:right;margin-top:-6px')}>
              <span onClick={() => navigate('/redesign/forgot-password')} style={css('font-size:13px;color:#D4A030;font-weight:500;cursor:pointer')}>Mot de passe oublié ?</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={css(`margin-top:8px;padding:16px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.90),rgba(232,184,75,.95));border:1px solid rgba(255,255,255,.25);text-align:center;font-size:16px;font-weight:700;color:#1a0f05;cursor:pointer;box-shadow:0 4px 20px rgba(212,160,48,.35),inset 0 1px 0 rgba(255,255,255,.25);width:100%;font-family:inherit${loading ? ';opacity:.6' : ''}`)}>
            {loading ? 'Un instant…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </div>

        {/* Divider */}
        <div style={css('display:flex;align-items:center;gap:12px;margin:24px 0')}>
          <div style={css('flex:1;height:1px;background:rgba(255,255,255,.08)')} />
          <span style={css('font-size:12px;color:rgba(240,236,230,.6);font-weight:500')}>ou continuer avec</span>
          <div style={css('flex:1;height:1px;background:rgba(255,255,255,.08)')} />
        </div>

        {/* Social — OAuth non branché (différé) */}
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          <div style={css(`${SOCIAL_BTN};background:#000;border:1px solid rgba(255,255,255,.14);opacity:.55`)} title="Bientôt">
            <svg width="18" height="22" viewBox="0 0 18 22" fill="white"><path d="M14.98 11.58c-.02-2.38 1.94-3.52 2.03-3.58-1.1-1.62-2.82-1.84-3.43-1.87-1.47-.15-2.87.87-3.61.87-.74 0-1.89-.85-3.1-.82-1.6.02-3.08.93-3.9 2.36-1.66 2.88-.43 7.16 1.2 9.5.79 1.15 1.74 2.44 2.98 2.39 1.2-.05 1.65-.78 3.1-.78 1.45 0 1.86.78 3.12.75 1.29-.02 2.1-1.18 2.89-2.33.91-1.33 1.28-2.62 1.3-2.69-.03-.01-2.55-.99-2.58-3.8zm-2.4-6.98c.66-.8 1.1-1.92.98-3.03-1.05.04-2.32.7-3.07 1.5-.67.76-1.25 1.97-1.09 3.13 1.17.09 2.37-.6 3.18-1.6z" /></svg>
            <span style={css('font-size:16px;font-weight:600;color:#fff;letter-spacing:-.2px')}>Se connecter avec Apple</span>
          </div>
          <div style={css(`${SOCIAL_BTN};background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:.55`)} title="Bientôt">
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.4c-.23 1.23-.94 2.28-2 2.98v2.46h3.23c1.9-1.74 2.97-4.31 2.97-7.23z" fill="#4285F4" /><path d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.23-2.46c-.9.6-2.04.96-3.4.96-2.6 0-4.8-1.76-5.6-4.12H1.07v2.54A9.99 9.99 0 0 0 10 20z" fill="#34A853" /><path d="M4.4 11.94A6.02 6.02 0 0 1 4.08 10c0-.67.12-1.33.32-1.94V5.52H1.07A9.99 9.99 0 0 0 0 10c0 1.61.38 3.13 1.07 4.48l3.33-2.54z" fill="#FBBC05" /><path d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86C14.96.99 12.7 0 10 0A9.99 9.99 0 0 0 1.07 5.52l3.33 2.54C5.2 5.72 7.4 3.96 10 3.96z" fill="#EA4335" /></svg>
            <span style={css('font-size:16px;font-weight:600;color:#1f1f1f;letter-spacing:-.2px')}>Se connecter avec Google</span>
          </div>
        </div>
      </form>
    </PageFrame>
  );
}
