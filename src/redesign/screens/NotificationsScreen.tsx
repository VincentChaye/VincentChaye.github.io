import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';

const GROUP_TITLE = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);padding:16px 0 10px';
const ROW = 'border-radius:18px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;margin-bottom:10px';
const AVATAR = 'position:relative;z-index:2;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0';
const BODY = 'flex:1;position:relative;z-index:2';
const TEXT = 'font-size:14px;color:#f0ece6;line-height:1.4;margin-bottom:4px';
const TEXT_READ = 'font-size:14px;color:rgba(240,236,230,.75);line-height:1.4;margin-bottom:4px';
const TIME = 'font-size:12px;color:rgba(240,236,230,.6)';
const TIME_READ = 'font-size:12px;color:rgba(240,236,230,.6)';
const DOT = 'width:8px;height:8px;border-radius:50%;background:#D4A030;flex-shrink:0;margin-top:4px;box-shadow:0 0 8px rgba(212,160,48,.6)';

/** SCREEN: NOTIFICATIONS — port fidèle (proto l.687-745). */
export function NotificationsScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'notifications' && 'active')} id="sc-notifications">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('accueil')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>Retour
          </div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Notifications</span>
          <div className="na">
            <IconButton style={css('font-size:12px;font-weight:600;color:#D4A030')}>Tout lire</IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        <div style={css(GROUP_TITLE)}>Aujourd'hui</div>

        {/* Notif: ami */}
        <div className="g" style={css(ROW)}>
          <div style={css(`${AVATAR};border-radius:50%;background:rgba(212,160,48,.18);border:1.5px solid rgba(212,160,48,.28)`)} />
          <div style={css(BODY)}>
            <div style={css(TEXT)}><span style={css('font-weight:700')}>Alex_grimpe</span> a commenté ton ascension de <span style={css('color:#D4A030')}>La Surplombante</span></div>
            <div style={css(TIME)}>il y a 15 min</div>
          </div>
          <div style={css(DOT)} />
        </div>

        {/* Notif: spot approuvé */}
        <div className="g" style={css(ROW)}>
          <div style={css(`${AVATAR};border-radius:13px;background:rgba(80,160,80,.15);border:1.5px solid rgba(80,160,80,.25)`)} />
          <div style={css(BODY)}>
            <div style={css(TEXT)}>Ton spot <span style={css('color:#88D088;font-weight:700')}>Falaise des Trois Pics</span> a été approuvé par un modérateur</div>
            <div style={css(TIME)}>il y a 1h</div>
          </div>
          <div style={css(DOT)} />
        </div>

        {/* Notif: ami follow */}
        <div className="g" style={css(ROW)}>
          <div style={css(`${AVATAR};border-radius:50%;background:rgba(100,130,200,.18);border:1.5px solid rgba(100,130,200,.28)`)} />
          <div style={css(BODY)}>
            <div style={css('font-size:14px;color:#f0ece6;line-height:1.4;margin-bottom:8px')}><span style={css('font-weight:700')}>Pierre_bloc</span> a commencé à te suivre</div>
            <div style={css('display:flex;gap:8px')}>
              <div style={css('padding:7px 16px;border-radius:9999px;font-size:13px;font-weight:700;background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.90));color:#1a0f05;cursor:pointer')}>Suivre</div>
              <div style={css('padding:7px 16px;border-radius:9999px;font-size:13px;font-weight:600;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.7);cursor:pointer')}>Profil</div>
            </div>
          </div>
          <div style={css(DOT)} />
        </div>

        <div style={css(GROUP_TITLE)}>Cette semaine</div>

        <div className="gt" style={css(ROW)}>
          <div style={css(`${AVATAR};border-radius:13px;background:rgba(212,160,48,.10)`)} />
          <div style={css(BODY)}>
            <div style={css(TEXT_READ)}><span style={css('font-weight:700')}>MarieFalaise</span> a proposé une modification sur <span style={css('color:#D4A030')}>Gorges du Verdon</span></div>
            <div style={css(TIME_READ)}>il y a 2 jours</div>
          </div>
        </div>

        <div className="gt" style={css(ROW)}>
          <div style={css(`${AVATAR};border-radius:50%;background:rgba(212,160,48,.10)`)} />
          <div style={css(BODY)}>
            <div style={css(TEXT_READ)}><span style={css('font-weight:700')}>Alex_grimpe</span> a mis 5 étoiles à ton avis sur <span style={css('color:#D4A030')}>Fontainebleau</span></div>
            <div style={css(TIME_READ)}>il y a 3 jours</div>
          </div>
        </div>

        <div className="gt" style={css(ROW)}>
          <div style={css(`${AVATAR};border-radius:13px;background:rgba(80,160,80,.10)`)} />
          <div style={css(BODY)}>
            <div style={css(TEXT_READ)}>Nouveau spot ajouté près de toi : <span style={css('color:#88D088')}>Falaise de l'Aigle</span> à 8 km</div>
            <div style={css(TIME_READ)}>il y a 5 jours</div>
          </div>
        </div>
      </div>
    </div>
  );
}
