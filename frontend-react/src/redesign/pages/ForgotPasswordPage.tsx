import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Mot de passe oublié (design Liquid Glass) câblé au VRAI backend.
 * Route additive `/redesign/forgot-password`. POST `/api/auth/forgot-password` { email }.
 * Le backend répond toujours 200 (anti-énumération) → on affiche une confirmation neutre.
 * Quirk du proto corrigé : bouton « Envoyer le lien » = vrai CTA doré (au lieu de la carte glass
 * à texte sombre due aux attributs `style` dupliqués). i18n en dur (FR).
 */

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email invalide.'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError('Trop de tentatives, réessaie plus tard.');
      else setError('Une erreur est survenue. Réessaie.');
    } finally { setLoading(false); }
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate('/redesign/login')}>
            <BackChevronIcon width={9} height={15} /> Connexion
          </div>
        </div>
      </NavBar>
      <div style={css('padding:0 20px')}>
        <div style={css('padding:32px 0 28px;text-align:center')}>
          <div style={css('width:72px;height:72px;border-radius:50%;background:rgba(212,160,48,.12);border:1.5px solid rgba(212,160,48,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 20px')}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,48,.85)" strokeWidth="1.8"><rect width="11" height="11" x="11" y="11" rx="2" /><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" /><path d="M8 8V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4" /></svg>
          </div>
          <div style={css('font-size:24px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:10px')}>Mot de passe oublié ?</div>
          <div style={css('font-size:14px;color:rgba(240,236,230,.5);line-height:1.6;max-width:280px;margin:0 auto')}>
            {sent ? "Si un compte est associé à cet email, un lien de réinitialisation vient d'être envoyé." : "Saisis ton adresse email et on t'envoie un lien de réinitialisation."}
          </div>
        </div>

        {sent ? (
          <div style={css('display:flex;flex-direction:column;gap:14px')}>
            <GlassCard style={css('border-radius:16px;padding:16px;display:flex;align-items:center;gap:10px')}>
              <span style={css('color:#88D088;position:relative;z-index:2')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <span style={css('font-size:14px;color:rgba(240,236,230,.75);position:relative;z-index:2')}>Email envoyé. Pense à vérifier tes spams.</span>
            </GlassCard>
            <div onClick={() => navigate('/redesign/login')} style={css('text-align:center;padding:8px 0;font-size:14px;color:#D4A030;font-weight:600;cursor:pointer')}>Retour à la connexion</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={css('display:flex;flex-direction:column;gap:14px')}>
            <div style={css('position:relative')}>
              <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px')}>Adresse email</div>
              <GlassCard style={css('border-radius:16px;overflow:hidden;position:relative')}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" autoComplete="email" style={css('width:100%;padding:15px 18px;background:transparent;border:none;outline:none;font-size:16px;color:#f0ece6;font-family:inherit;box-sizing:border-box;position:relative;z-index:2')} />
              </GlassCard>
            </div>

            {error && (
              <div style={css('font-size:13px;color:#E88080;background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);border-radius:12px;padding:10px 14px')}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={css(`margin-top:8px;padding:16px;border-radius:16px;background:linear-gradient(145deg,rgba(212,160,48,.90),rgba(232,184,75,.95));border:1px solid rgba(255,255,255,.25);text-align:center;font-size:16px;font-weight:700;color:#1a0f05;cursor:pointer;box-shadow:0 4px 20px rgba(212,160,48,.35),inset 0 1px 0 rgba(255,255,255,.25);width:100%;font-family:inherit${loading ? ';opacity:.6' : ''}`)}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <div style={css('text-align:center;padding:8px 0;font-size:14px;color:rgba(240,236,230,.6);cursor:pointer')} onClick={() => navigate('/redesign/login')}>Retour à la connexion</div>
          </form>
        )}
      </div>
    </PageFrame>
  );
}
