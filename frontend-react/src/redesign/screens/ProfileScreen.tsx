import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { ProfileMenuRow } from '../components/ProfileMenuRow';
import { BookOpenIcon, MapPinIcon, UsersIcon, ShieldIcon } from '../lib/icons';

const GEAR = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const STAT = 'border-radius:16px;padding:14px 10px;text-align:center';
const STAT_VALUE = 'font-size:20px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.43);text-transform:uppercase;letter-spacing:.5px';

/** SCREEN: PROFIL — port fidèle (proto l.931-956). */
export function ProfileScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'profil' && 'active')} id="sc-profil">
      <NavBar>
        <div className="nbi">
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton onClick={() => goTo('parametres')}>{GEAR}</IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('text-align:center;padding:20px 20px 0')}>
        <div style={css('width:88px;height:88px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(145deg,rgba(212,160,48,.25),rgba(184,134,30,.35));border:2.5px solid rgba(212,160,48,.35);display:flex;align-items:center;justify-content:center;font-size:38px;box-shadow:0 0 30px rgba(212,160,48,.18),0 4px 20px rgba(0,0,0,.4);position:relative')}>
          <div style={css('position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(212,160,48,.2)')} />
        </div>
        <div style={css('font-size:22px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:4px')}>Vincent C.</div>
        <div style={css('font-size:14px;color:rgba(240,236,230,.45);margin-bottom:16px')}>@vincentchaye · Valbonne </div>
        <div style={css('display:flex;flex-direction:column;gap:2px;margin-bottom:24px')}>
          <span style={css('font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:rgba(212,160,48,.65);font-weight:600')}>Grimpeur confirmé</span>
          <span style={css('font-size:15px;font-weight:700;color:rgba(240,236,230,.80);letter-spacing:-.3px')}>Max 7b</span>
        </div>
        <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px')}>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>47</div><div style={css(STAT_LABEL)}>Ascensions</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>12</div><div style={css(STAT_LABEL)}>Spots</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>8</div><div style={css(STAT_LABEL)}>Amis</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>3</div><div style={css(STAT_LABEL)}>Contribs</div></div></div>
        </div>
      </div>

      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:8px')}>
        <ProfileMenuRow onClick={() => goTo('carnet')} iconBox="background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.20)" iconColor="#D4A030" label="Mon carnet de grimpe" icon={<BookOpenIcon width={16} height={16} />} />
        <ProfileMenuRow onClick={() => goTo('mes-spots')} iconBox="background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.20)" iconColor="#80D880" label="Mes spots favoris" icon={<MapPinIcon width={16} height={16} />} />
        <ProfileMenuRow onClick={() => goTo('amis')} iconBox="background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.20)" iconColor="#88BBEE" label="Mes amis" icon={<UsersIcon width={16} height={16} />} />
        <ProfileMenuRow onClick={() => goTo('mes-spots')} iconBox="background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.20)" iconColor="#D4A030" label="Mes contributions" icon={<ShieldIcon width={16} height={16} />} />
        <ProfileMenuRow onClick={() => goTo('materiel')} iconBox="background:rgba(232,128,128,.12);border:1px solid rgba(232,128,128,.20)" iconColor="#E88080" label="Mon matériel" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" /><path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" /></svg>} />
        <ProfileMenuRow onClick={() => goTo('parametres')} iconBox="background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.20)" iconColor="#88BBEE" label="Paramètres" icon={GEAR} />
        <ProfileMenuRow onClick={() => goTo('login')} marginTop iconBox="background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.20)" iconColor="#E88080" labelColor="rgba(240,150,150,.85)" label="Se déconnecter" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>} />
      </div>
      <div style={css('height:20px')} />
    </div>
  );
}
