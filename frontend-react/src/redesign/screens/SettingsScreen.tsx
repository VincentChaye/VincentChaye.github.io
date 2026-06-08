import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { Toggle } from '../components/Toggle';

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

/** SCREEN: PARAMÈTRES — port fidèle (proto l.958-1012). */
export function SettingsScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'parametres' && 'active')} id="sc-parametres">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('profil')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>Profil
          </div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Paramètres</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Compte */}
        <div style={css(GROUP)}>Compte</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)}>
            <div style={css(`${ICONBOX};background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.22);font-size:18px`)} />
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Modifier le profil</div><div style={css(SUB)}>Photo, nom, bio</div></div>
            <div style={css(CHEV)}>›</div>
          </div>
          <div style={css(ROW_B)}>
            <div style={css(`${ICONBOX};background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.20);color:#88BBEE`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Email</div><div style={css(SUB)}>vincent@email.com</div></div>
            <div style={css(CHEV)}>›</div>
          </div>
          <div style={css(ROW)}>
            <div style={css(`${ICONBOX};background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.20);color:#D4A030`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="11" height="11" x="11" y="11" rx="2" /><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" /><path d="M8 8V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4" /></svg>
            </div>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Mot de passe</div><div style={css(SUB)}>Modifier le mot de passe</div></div>
            <div style={css(CHEV)}>›</div>
          </div>
        </div>

        {/* Notifications */}
        <div style={css(GROUP)}>Notifications</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROWN_B)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Push notifications</div><div style={css(SUB)}>Ascensions des amis, nouveaux spots</div></div>
            <Toggle on />
          </div>
          <div style={css(ROWN_B)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Nouveaux spots proches</div><div style={css(SUB)}>Alertes dans un rayon de 30 km</div></div>
            <Toggle on />
          </div>
          <div style={css(ROWN)}>
            <div style={css('flex:1')}><div style={css(TITLE_MB)}>Email hebdomadaire</div><div style={css(SUB)}>Résumé de l'activité</div></div>
            <Toggle />
          </div>
        </div>

        {/* Apparence & Langue */}
        <div style={css(GROUP)}>Apparence & Langue</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)}><div style={css('flex:1')}><div style={css(TITLE)}>Thème</div></div><div style={css(VALUE)}>Sombre</div><div style={css(`${CHEV};margin-left:8px`)}>›</div></div>
          <div style={css(ROW)}><div style={css('flex:1')}><div style={css(TITLE)}>Langue</div></div><div style={css(VALUE)}>Français </div><div style={css(`${CHEV};margin-left:8px`)}>›</div></div>
        </div>

        {/* À propos */}
        <div style={css(GROUP)}>À propos</div>
        <div className="g" style={css(CARD)}>
          <div style={css(ROW_B)}><div style={css('flex:1')}><div style={css(TITLE)}>Version</div></div><div style={css('font-size:13px;color:rgba(240,236,230,.45)')}>1.0.0-beta</div></div>
          <div style={css(ROW_B)}><div style={css('flex:1')}><div style={css(TITLE)}>Conditions d'utilisation</div></div><div style={css(CHEV)}>›</div></div>
          <div style={css(ROW)}><div style={css('flex:1')}><div style={css(TITLE)}>Politique de confidentialité</div></div><div style={css(CHEV)}>›</div></div>
        </div>
        <div style={css('height:20px')} />
      </div>
    </div>
  );
}
