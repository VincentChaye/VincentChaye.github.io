import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { Tag } from '../components/primitives';
import { SearchResultRow } from '../components/SearchResultRow';
import { SearchIcon } from '../lib/icons';

const FILTER_OFF = 'padding:7px 14px;border-radius:9999px;font-size:12px;font-weight:600;white-space:nowrap;background:rgba(12,8,4,.60);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.60);flex-shrink:0';

/** SCREEN: RECHERCHE — port fidèle (proto l.747-793). */
export function SearchScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'recherche' && 'active')} id="sc-recherche">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('accueil')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>Retour
          </div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Recherche</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        <div className="g" style={css('border-radius:9999px;padding:14px 18px;display:flex;align-items:center;gap:10px;margin-bottom:16px;position:relative;overflow:hidden')}>
          <div style={css('color:rgba(212,160,48,.7);position:relative;z-index:2')}>
            <SearchIcon width={18} height={18} />
          </div>
          <div style={css('font-size:16px;color:rgba(240,236,230,.6);flex:1;position:relative;z-index:2')}>Spot, lieu, cotation...</div>
          <div style={css('font-size:14px;color:#D4A030;font-weight:500;position:relative;z-index:2;cursor:pointer')}>Annuler</div>
        </div>

        {/* Filters */}
        <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:20px;padding-bottom:4px')}>
          <div style={css('padding:7px 14px;border-radius:9999px;font-size:12px;font-weight:600;white-space:nowrap;background:rgba(212,160,48,.80);border:1px solid rgba(255,255,255,.25);color:#1a0f05;flex-shrink:0')}>Tous</div>
          <div style={css(FILTER_OFF)}>{' '}Falaise</div>
          <div style={css(FILTER_OFF)}>{' '}Bloc</div>
          <div style={css(FILTER_OFF)}>{' '}Indoor</div>
          <div style={css(FILTER_OFF)}>Près de moi</div>
        </div>

        {/* Results */}
        <div style={css('font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);margin-bottom:12px')}>5 711 spots trouvés</div>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          <SearchResultRow onClick={() => goTo('spot-detail')} thumbStyle="background:linear-gradient(145deg,rgba(40,70,30,.8),rgba(20,45,15,.9));border:1px solid rgba(212,160,48,.15)" name="Gorges du Verdon" meta="4c→8b · 12 km" tag={<Tag variant="a" style={css('font-size:10px;padding:3px 8px')}>Falaise</Tag>} />
          <SearchResultRow thumbStyle="background:linear-gradient(145deg,rgba(30,55,20,.8),rgba(15,35,10,.9));border:1px solid rgba(80,160,80,.15)" name="Fontainebleau" meta="1A→8C · 45 km" tag={<Tag variant="g" style={css('font-size:10px;padding:3px 8px')}>Bloc</Tag>} />
          <SearchResultRow thumbStyle="background:linear-gradient(145deg,rgba(40,55,70,.8),rgba(20,35,50,.9));border:1px solid rgba(80,120,200,.15)" name="Calanques de Marseille" meta="4a→7c · 89 km" tag={<Tag variant="a" style={css('font-size:10px;padding:3px 8px')}>Falaise</Tag>} />
          <SearchResultRow thumbStyle="background:linear-gradient(145deg,rgba(50,40,70,.8),rgba(30,25,50,.9));border:1px solid rgba(130,100,200,.15)" name="Arkose Nation Paris" meta="Bloc & Voie · 2 km" tag={<Tag variant="b" style={css('font-size:10px;padding:3px 8px')}>Indoor</Tag>} />
          <SearchResultRow thumbStyle="background:linear-gradient(145deg,rgba(50,60,30,.8),rgba(30,40,15,.9));border:1px solid rgba(100,140,60,.15)" name="Céüse" meta="5b→9a · 145 km" tag={<Tag variant="a" style={css('font-size:10px;padding:3px 8px')}>Falaise</Tag>} />
        </div>
      </div>
    </div>
  );
}
