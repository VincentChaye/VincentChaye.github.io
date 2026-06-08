import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { GearRow } from '../components/GearRow';
import { BackChevronIcon } from '../lib/icons';

const STAT = 'border-radius:16px;padding:14px 10px;text-align:center';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.43);text-transform:uppercase;letter-spacing:.5px';
const SECTION = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.35);padding:0 4px 10px';
const CARD = 'border-radius:20px;overflow:hidden;display:flex;flex-direction:column;margin-bottom:16px';
const BADGE_OK = 'background:rgba(80,160,80,.2);border:1px solid rgba(80,160,80,.3);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#80D880';
const BADGE_WARN = 'background:rgba(232,128,128,.2);border:1px solid rgba(232,128,128,.3);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#E88080';
const ROPE = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /><path d="M12 8v8M8 12h8" /></svg>
);

/** SCREEN: MATÉRIEL — port fidèle (proto l.1389-1435). */
export function GearScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'materiel' && 'active')} id="sc-materiel">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('profil')}>
            <BackChevronIcon width={9} height={15} /> Profil
          </div>
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton style={css('cursor:pointer')} title="Ajouter un EPI">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Stats */}
        <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:4px 0 20px')}>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css('font-size:22px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px')}>7</div><div style={css(STAT_LABEL)}>EPI actifs</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css('font-size:22px;font-weight:800;letter-spacing:-.5px;color:#E88080;margin-bottom:3px')}>2</div><div style={css(STAT_LABEL)}>⚠ Expire bientôt</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css('font-size:22px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px')}>1</div><div style={css(STAT_LABEL)}>Retraité</div></div></div>
        </div>

        {/* Cordes */}
        <div style={css(SECTION)}>Cordes</div>
        <div className="g" style={css(CARD)}>
          <GearRow border iconBox="background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2)" icon={ROPE('#D4A030')} name="Petzl Volta 9.2mm" sub="60m · En service depuis 14 mois" badge="OK" badgeStyle={BADGE_OK} />
          <GearRow iconBox="background:rgba(232,128,128,.12);border:1px solid rgba(232,128,128,.2)" icon={ROPE('#E88080')} name="Black Diamond 9.6mm" sub="70m · Expire dans 2 mois" badge="⚠ Bientôt" badgeStyle={BADGE_WARN} />
        </div>

        {/* Baudriers & Casques */}
        <div style={css(SECTION)}>Baudriers & Casques</div>
        <div className="g" style={css(CARD)}>
          <GearRow border iconBox="background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.2)" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#88BBEE" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" /></svg>} name="Petzl Hirundos" sub="Baudrier · 3 ans d'utilisation" badge="OK" badgeStyle={BADGE_OK} />
          <GearRow iconBox="background:rgba(232,128,128,.12);border:1px solid rgba(232,128,128,.2)" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E88080" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>} name="Camp Armour" sub="Casque · Retire recommandé" badge="Retirer" badgeStyle={BADGE_WARN} />
        </div>

        {/* Lien catalogue */}
        <div className="g" style={css('border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;margin-bottom:8px')}>
          <div style={css('width:36px;height:36px;border-radius:11px;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2);display:flex;align-items:center;justify-content:center;position:relative;z-index:2')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A030" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
          </div>
          <div style={css('flex:1;font-size:15px;font-weight:600;color:#f0ece6;position:relative;z-index:2')}>Catalogue matériel</div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.22)" strokeWidth="2" style={css('position:relative;z-index:2')}><polyline points="9 18 15 12 9 6" /></svg>
        </div>
        <div style={css('height:20px')} />
      </div>
    </div>
  );
}
