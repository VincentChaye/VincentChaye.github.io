import { useState } from 'react';
import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { FavSpotCard } from '../components/FavSpotCard';
import { BackChevronIcon } from '../lib/icons';

const TAB_ON = 'padding:10px;border-radius:14px;text-align:center;font-size:14px;font-weight:700;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.9));color:#1a0f05;box-shadow:0 2px 10px rgba(212,160,48,.3)';
const TAB_OFF = 'padding:10px;border-radius:14px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;color:rgba(240,236,230,.55)';
const CONTRIB_ROW = 'border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer';
const PIN = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);

/** SCREEN: MES SPOTS — port fidèle (proto l.1232-1290). msTabs() → état React `tab`. */
export function MySpotsScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  const [tab, setTab] = useState<'fav' | 'contrib'>('fav');

  return (
    <div className={cn('sc', active === 'mes-spots' && 'active')} id="sc-mes-spots">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('profil')}>
            <BackChevronIcon width={9} height={15} /> Profil
          </div>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Tabs Favoris / Contributions */}
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px 0 18px')}>
          <div onClick={() => setTab('fav')} style={css(tab === 'fav' ? TAB_ON : TAB_OFF)}>Favoris</div>
          <div onClick={() => setTab('contrib')} style={css(tab === 'contrib' ? TAB_ON : TAB_OFF)}>Contributions</div>
        </div>

        {/* Favoris list */}
        {tab === 'fav' && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            <FavSpotCard onClick={() => goTo('spot-detail')} headerBg="background:linear-gradient(135deg,rgba(80,100,60,.6),rgba(40,60,30,.8))" tagStyle="background:rgba(212,160,48,.25);border:1px solid rgba(212,160,48,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#D4A030" tagText="Falaise" gradeText="6a → 7b" name="Gorges du Verdon" location="Castellane, 04 · 3.2 km" rating="4.8" />
            <FavSpotCard onClick={() => goTo('spot-detail')} headerBg="background:linear-gradient(135deg,rgba(60,80,120,.6),rgba(30,50,90,.8))" tagStyle="background:rgba(80,130,200,.25);border:1px solid rgba(80,130,200,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#88BBEE" tagText="Bloc" gradeText="4 → 7A" name="Fontainebleau — Cuvier" location="Barbizon, 77 · 8.1 km" rating="4.9" />
            <FavSpotCard onClick={() => goTo('spot-detail')} headerBg="background:linear-gradient(135deg,rgba(120,80,60,.6),rgba(90,50,30,.8))" tagStyle="background:rgba(80,160,100,.25);border:1px solid rgba(80,160,100,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#80D880" tagText="Indoor" gradeText="3 → 6b" name="Climb Up Nice" location="Nice, 06 · 1.4 km" rating="4.6" />
          </div>
        )}

        {/* Contributions list */}
        {tab === 'contrib' && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            <div className="g" style={css(CONTRIB_ROW)}>
              <div style={css('width:44px;height:44px;border-radius:12px;background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:2')}>{PIN('#80D880')}</div>
              <div style={css('flex:1;position:relative;z-index:2')}>
                <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>Calanque de Morgiou</div>
                <div style={css('font-size:12px;color:rgba(240,236,230,.45)')}>Ajouté · il y a 3 mois</div>
              </div>
              <span style={css('background:rgba(80,160,80,.2);border:1px solid rgba(80,160,80,.3);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#80D880;position:relative;z-index:2')}>Approuvé</span>
            </div>
            <div className="g" style={css(CONTRIB_ROW)}>
              <div style={css('width:44px;height:44px;border-radius:12px;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:2')}>{PIN('#D4A030')}</div>
              <div style={css('flex:1;position:relative;z-index:2')}>
                <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>Bois de Saint-Pons</div>
                <div style={css('font-size:12px;color:rgba(240,236,230,.45)')}>Modifié · il y a 1 semaine</div>
              </div>
              <span style={css('background:rgba(212,160,48,.18);border:1px solid rgba(212,160,48,.28);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#D4A030;position:relative;z-index:2')}>En attente</span>
            </div>
          </div>
        )}
        <div style={css('height:20px')} />
      </div>
    </div>
  );
}
