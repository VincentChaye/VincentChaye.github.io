import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { FriendRow } from '../components/FriendRow';
import { BackChevronIcon } from '../lib/icons';

const GROUP = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);padding:0 4px 10px';
const REQ_ROW = 'padding:14px 16px;display:flex;align-items:center;gap:14px;position:relative;z-index:2';
const ACCEPT = 'padding:6px 14px;border-radius:10px;font-size:13px;font-weight:700;color:#1a0f05;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.9),rgba(232,184,75,.95))';
const REFUSE = 'padding:6px 14px;border-radius:10px;font-size:13px;font-weight:600;color:rgba(240,236,230,.5);cursor:pointer;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)';

const SEARCH_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);

/** SCREEN: AMIS — port fidèle (proto l.1293-1347). */
export function FriendsScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'amis' && 'active')} id="sc-amis">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('profil')}>
            <BackChevronIcon width={9} height={15} /> Profil
          </div>
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton style={css('cursor:pointer')}>{SEARCH_ICON}</IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Search bar */}
        <div className="g" style={css('border-radius:16px;display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:18px')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.6)" strokeWidth="2.2" strokeLinecap="round" style={css('flex-shrink:0')}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <span style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Rechercher un grimpeur…</span>
        </div>

        {/* Demandes reçues */}
        <div style={css(GROUP)}>Demandes reçues <span style={css('background:rgba(212,160,48,.25);border-radius:6px;padding:1px 7px;color:#D4A030;font-size:11px')}>2</span></div>
        <div className="g" style={css('border-radius:20px;overflow:hidden;display:flex;flex-direction:column;margin-bottom:20px')}>
          <div style={css(`${REQ_ROW};border-bottom:1px solid rgba(255,255,255,.05)`)}>
            <div style={css('width:44px;height:44px;border-radius:50%;background:linear-gradient(145deg,rgba(80,130,200,.3),rgba(50,90,160,.4));border:1.5px solid rgba(80,130,200,.3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0')} />
            <div style={css('flex:1')}><div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:2px')}>Lucas B.</div><div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>@lucasbloc · 2 amis en commun</div></div>
            <div style={css('display:flex;gap:8px')}>
              <div style={css(ACCEPT)}>Accepter</div>
              <div style={css(REFUSE)}>Refuser</div>
            </div>
          </div>
          <div style={css(REQ_ROW)}>
            <div style={css('width:44px;height:44px;border-radius:50%;background:linear-gradient(145deg,rgba(200,80,80,.3),rgba(160,50,50,.4));border:1.5px solid rgba(200,80,80,.3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0')} />
            <div style={css('flex:1')}><div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:2px')}>Marie T.</div><div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>@mariet · 5 amis en commun</div></div>
            <div style={css('display:flex;gap:8px')}>
              <div style={css(ACCEPT)}>Accepter</div>
              <div style={css(REFUSE)}>Refuser</div>
            </div>
          </div>
        </div>

        {/* Mes amis */}
        <div style={css(GROUP)}>Mes amis <span style={css('color:rgba(240,236,230,.6);font-weight:500')}>8</span></div>
        <div className="g" style={css('border-radius:20px;overflow:hidden;display:flex;flex-direction:column')}>
          <FriendRow border online avatarStyle="background:linear-gradient(145deg,rgba(212,160,48,.25),rgba(184,134,30,.35));border:1.5px solid rgba(212,160,48,.3)" name="Thomas R." sub="Max 7a+ · 12 ascensions ce mois" />
          <FriendRow border avatarStyle="background:linear-gradient(145deg,rgba(80,130,200,.25),rgba(50,90,160,.35));border:1.5px solid rgba(80,130,200,.3)" name="Camille M." sub="Max 6c · Fontainebleau" />
          <FriendRow border online avatarStyle="background:linear-gradient(145deg,rgba(80,160,80,.25),rgba(50,120,50,.35));border:1.5px solid rgba(80,160,80,.3)" name="Nico D." sub="Max 8a · Alpes-Mar" />
          <div style={css('padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;position:relative;z-index:2')}>
            <div style={css('width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><span style={css('font-size:13px;color:rgba(240,236,230,.6)')}>+5</span></div>
            <div style={css('font-size:14px;color:rgba(240,236,230,.6)')}>Voir tous mes amis</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.22)" strokeWidth="2" style={css('margin-left:auto')}><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
        <div style={css('height:20px')} />
      </div>
    </div>
  );
}
