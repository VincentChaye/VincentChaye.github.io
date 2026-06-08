import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { GlassCard } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';

/**
 * SCREEN: MOT DE PASSE OUBLIÉ — port fidèle (proto l.1207-1230).
 * NB : dans le proto, le bouton « Envoyer le lien » a des attributs `style` dupliqués ;
 * le navigateur ne garde QUE le premier (donc PAS le dégradé doré) → on reproduit le rendu
 * réel : une carte glass `.g` à texte sombre. (Quirk du proto, à corriger au swap si voulu.)
 */
export function ForgotPasswordScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'forgot-password' && 'active')} id="sc-forgot-password">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('login')}>
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
          <div style={css('font-size:14px;color:rgba(240,236,230,.5);line-height:1.6;max-width:280px;margin:0 auto')}>Saisis ton adresse email et on t'envoie un lien de réinitialisation.</div>
        </div>
        <div style={css('display:flex;flex-direction:column;gap:14px')}>
          <div style={css('position:relative')}>
            <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px')}>Adresse email</div>
            <GlassCard style={css('border-radius:16px;overflow:hidden;position:relative')}>
              <input type="email" placeholder="ton@email.com" style={css('width:100%;padding:15px 18px;background:transparent;border:none;outline:none;font-size:16px;color:#f0ece6;font-family:inherit;box-sizing:border-box')} />
            </GlassCard>
          </div>
          <GlassCard onClick={() => goTo('login')} style={css('border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#1a0f05;cursor:pointer;margin-top:8px;letter-spacing:-.2px')}>
            Envoyer le lien
          </GlassCard>
          <div style={css('text-align:center;padding:8px 0;font-size:14px;color:rgba(240,236,230,.4);cursor:pointer')} onClick={() => goTo('login')}>Retour à la connexion</div>
        </div>
      </div>
    </div>
  );
}
