import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton, SectionHeader, Tag } from '../components/primitives';
import { PyramidBar } from '../components/PyramidBar';
import { AscentRow } from '../components/AscentRow';
import { BackChevronIcon } from '../lib/icons';

const STAT_CARD = 'border-radius:16px;padding:16px 12px;text-align:center';
const STAT_VALUE = 'font-size:24px;font-weight:800;letter-spacing:-.8px;color:#f0ece6;margin-bottom:3px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.45);text-transform:uppercase;letter-spacing:.6px';

/** SCREEN: CARNET — port fidèle (proto l.655-685). */
export function LogbookScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'carnet' && 'active')} id="sc-carnet">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('profil')}>
            <BackChevronIcon width={9} height={15} /> Profil
          </div>
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </IconButton>
          </div>
        </div>
      </NavBar>

      {/* Stats row */}
      <div style={css('padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:4px')}>
        <div className="g" style={css(STAT_CARD)}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css(STAT_VALUE)}>47</div>
            <div style={css(STAT_LABEL)}>Ascensions</div>
          </div>
        </div>
        <div className="g" style={css(STAT_CARD)}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css(STAT_VALUE)}>7b</div>
            <div style={css(STAT_LABEL)}>Max grade</div>
          </div>
        </div>
        <div className="g" style={css(STAT_CARD)}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css(STAT_VALUE)}>12</div>
            <div style={css(STAT_LABEL)}>Spots</div>
          </div>
        </div>
      </div>

      {/* Pyramide */}
      <div className="g" style={css('margin:16px 20px 0;border-radius:20px;padding:18px')}>
        <div style={css('position:relative;z-index:2')}>
          <div style={css('font-size:14px;font-weight:600;color:rgba(240,236,230,.7);margin-bottom:14px')}>Pyramide de cotations</div>
          <div style={css('display:flex;flex-direction:column;gap:7px')}>
            <PyramidBar grade="7b" pct="15%" count="2" glow />
            <PyramidBar grade="7a" pct="30%" count="5" />
            <PyramidBar grade="6c" pct="55%" count="9" />
            <PyramidBar grade="6b" pct="72%" count="12" />
            <PyramidBar grade="6a" pct="90%" count="19" />
          </div>
        </div>
      </div>

      <SectionHeader small>Dernières ascensions</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        <AscentRow grade="7b" gradeBoxStyle="background:rgba(180,80,80,.14);border:1px solid rgba(180,80,80,.25)" gradeColor="#E88080" name="La Surplombante" location="Gorges du Verdon" date="Hier" tag={<Tag style={css('background:rgba(150,120,200,.12);border:1px solid rgba(150,120,200,.2);color:#B8A0E8;font-size:10px;padding:3px 8px')}>Redpoint</Tag>} />
        <AscentRow grade="7a" gradeBoxStyle="background:rgba(200,120,60,.14);border:1px solid rgba(200,120,60,.25)" gradeColor="#E8924A" name="Voie du Soleil" location="Calanques" date="3 mai" tag={<Tag variant="a" style={css('font-size:10px;padding:3px 8px')}>Flash</Tag>} />
        <AscentRow grade="6c" gradeBoxStyle="background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.22)" gradeColor="#D4A030" name="Bloc du Chaos" location="Fontainebleau" date="28 avr." tag={<Tag variant="g" style={css('font-size:10px;padding:3px 8px')}>Onsight</Tag>} />
        <AscentRow grade="6a" gradeBoxStyle="background:rgba(100,180,80,.15);border:1px solid rgba(100,180,80,.25)" gradeColor="#88D880" name="La Directe" location="Céüse" date="20 avr." tag={<Tag variant="g" style={css('font-size:10px;padding:3px 8px')}>Onsight</Tag>} />
      </div>
      <div style={css('height:20px')} />
    </div>
  );
}
