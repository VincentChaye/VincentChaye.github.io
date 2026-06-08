import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { FilterPill } from '../components/FilterPill';
import { MapMarker } from '../components/MapMarker';
import { SpotSheet } from '../components/SpotSheet';
import { SearchIcon, FilterLinesIcon } from '../lib/icons';

const GOLD = 'linear-gradient(145deg,rgba(212,160,48,.85),rgba(184,134,30,.9))';
const GREEN = 'linear-gradient(145deg,rgba(140,180,100,.85),rgba(100,150,70,.9))';
const BLUE = 'linear-gradient(145deg,rgba(100,130,200,.85),rgba(70,100,180,.9))';

/** SCREEN: CARTE — port fidèle (proto l.382-471). */
export function MapScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'carte' && 'active')} id="sc-carte">
      <div style={css('position:relative;height:844px;overflow:hidden')}>
        {/* Fond carte */}
        <div style={css('position:absolute;inset:0;background:radial-gradient(circle at 35% 55%,rgba(40,65,30,.7),transparent 40%),radial-gradient(circle at 70% 35%,rgba(35,50,25,.6),transparent 35%),linear-gradient(160deg,#0d1a0a,#0a1408 35%,#0d1a0a)')} />
        <div style={css('position:absolute;inset:0;background-image:linear-gradient(rgba(60,90,40,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(60,90,40,.15) 1px,transparent 1px);background-size:45px 45px')} />

        {/* Search */}
        <div style={css('position:absolute;top:80px;left:16px;right:16px;z-index:20')}>
          <div style={css('border-radius:9999px;padding:12px 16px;display:flex;align-items:center;gap:10px;background:rgba(12,8,4,.70);backdrop-filter:blur(28px) saturate(1.7);-webkit-backdrop-filter:blur(28px) saturate(1.7);border:1px solid rgba(212,160,48,.18);box-shadow:0 4px 20px rgba(0,0,0,.4);position:relative;overflow:hidden')}>
            <div style={css('position:absolute;top:0;left:5%;right:5%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),rgba(212,160,48,.30),rgba(255,255,255,.18),transparent)')} />
            <div style={css('color:rgba(212,160,48,.7);position:relative;z-index:1')}>
              <SearchIcon width={16} height={16} />
            </div>
            <div style={css('font-size:15px;color:rgba(240,236,230,.45);flex:1;position:relative;z-index:1')}>Rechercher un spot...</div>
            <div
              onClick={() => goTo('filtres' as ScreenId)}
              style={css('width:30px;height:30px;border-radius:50%;background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.25);display:flex;align-items:center;justify-content:center;color:#D4A030;position:relative;z-index:1;cursor:pointer')}
            >
              <FilterLinesIcon width={13} height={13} />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div style={css('position:absolute;top:148px;left:0;right:0;z-index:19;padding:0 16px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none')}>
          <FilterPill active shadow>Falaise</FilterPill>
          <FilterPill active>Bloc</FilterPill>
          <FilterPill>Indoor</FilterPill>
          <FilterPill>Favoris</FilterPill>
        </div>

        {/* Pins */}
        <MapMarker left="38%" top="28%" size={42} gradient={GOLD} borderColor="rgba(255,255,255,.25)" glow label="Gorges du Verdon" onClick={() => goTo('spot-detail')} />
        <MapMarker left="62%" top="38%" size={36} gradient={GREEN} borderColor="rgba(255,255,255,.2)" label="Fontainebleau" />
        <MapMarker left="22%" top="50%" size={36} gradient={GOLD} borderColor="rgba(255,255,255,.2)" label="Calanques" />
        <MapMarker left="70%" top="25%" size={36} gradient={GREEN} borderColor="rgba(255,255,255,.2)" />
        <MapMarker left="48%" top="55%" size={36} gradient={BLUE} borderColor="rgba(255,255,255,.2)" innerFontSize={14} />

        {/* Zoom */}
        <div style={css('position:absolute;right:16px;top:50%;transform:translateY(-50%);z-index:20;display:flex;flex-direction:column;gap:2px')}>
          <div style={css('width:38px;height:38px;border-radius:12px 12px 4px 4px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.75);cursor:pointer;font-size:18px')}>+</div>
          <div style={css('width:38px;height:38px;border-radius:4px 4px 12px 12px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.75);cursor:pointer;font-size:18px')}>−</div>
        </div>

        {/* FAB ajouter un spot */}
        <div
          onClick={() => goTo('proposer')}
          style={css('position:absolute;right:16px;bottom:185px;z-index:20;width:46px;height:46px;border-radius:14px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.92));border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(212,160,48,.40);cursor:pointer;font-size:22px')}
        >
          +
        </div>

        {/* Spot sheet */}
        <SpotSheet goTo={goTo} />
      </div>
    </div>
  );
}
