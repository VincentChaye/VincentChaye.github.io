import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton, Tag } from '../components/primitives';
import { StoryItem } from '../components/StoryItem';
import { UsersIcon } from '../lib/icons';

const FOOTER = 'border-top:1px solid rgba(255,255,255,.06);padding:12px 16px;display:flex;gap:20px';
const FOOTER_ITEM = 'display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(240,236,230,.50);cursor:pointer';

/** SCREEN: SOCIAL — port fidèle (proto l.561-653). */
export function FeedScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'fil' && 'active')} id="sc-fil">
      <NavBar>
        <div className="nbi">
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton>
              <UsersIcon width={16} height={16} />
            </IconButton>
          </div>
        </div>
      </NavBar>

      {/* Stories */}
      <div style={css('padding:16px 20px;display:flex;gap:12px;overflow-x:auto;scrollbar-width:none')}>
        <StoryItem circleStyle="background:rgba(255,255,255,.06);border:2px dashed rgba(255,255,255,.15);color:rgba(240,236,230,.6)" label="Ajouter" labelColor="rgba(240,236,230,.6)">+</StoryItem>
        <StoryItem circleStyle="background:linear-gradient(145deg,rgba(212,160,48,.3),rgba(184,134,30,.4));border:2px solid rgba(212,160,48,.5);box-shadow:0 0 16px rgba(212,160,48,.2)" label="Alex" labelColor="rgba(240,236,230,.6)" />
        <StoryItem circleStyle="background:linear-gradient(145deg,rgba(80,160,80,.25),rgba(60,130,60,.3));border:2px solid rgba(80,160,80,.4)" label="Marie" labelColor="rgba(240,236,230,.6)" />
        <StoryItem circleStyle="background:linear-gradient(145deg,rgba(100,130,200,.25),rgba(70,100,180,.3));border:2px solid rgba(100,130,200,.4)" label="Pierre" labelColor="rgba(240,236,230,.6)" />
        <StoryItem circleStyle="background:linear-gradient(145deg,rgba(180,80,80,.25),rgba(150,60,60,.3));border:2px solid rgba(180,80,80,.35)" label="Lucie" labelColor="rgba(240,236,230,.6)" />
      </div>

      {/* Feed cards */}
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:14px')}>
        {/* Card 1: ascension */}
        <div className="g" style={css('border-radius:22px;overflow:hidden')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('padding:16px 16px 12px;display:flex;align-items:center;gap:10px')}>
              <div style={css('width:38px;height:38px;border-radius:50%;background:rgba(212,160,48,.18);border:1.5px solid rgba(212,160,48,.3);display:flex;align-items:center;justify-content:center;font-size:17px')} />
              <div style={css('flex:1')}>
                <div style={css('font-size:14px;font-weight:700;color:#f0ece6')}>Alex_grimpe</div>
                <div style={css('font-size:11px;color:rgba(240,236,230,.6)')}>il y a 2h · Gorges du Verdon</div>
              </div>
              <div style={css('font-size:11px;color:rgba(240,236,230,.6)')}>···</div>
            </div>
            <div style={css('padding:0 16px 14px')}>
              <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
                <div style={css('width:38px;height:38px;border-radius:11px;background:rgba(200,120,60,.14);border:1px solid rgba(200,120,60,.25);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#E8924A')}>7c</div>
                <div>
                  <div style={css('font-size:15px;font-weight:700;color:#f0ece6')}>Pichenibule</div>
                  <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>Redpoint · 3ème essai</div>
                </div>
                <div style={css('margin-left:auto')}><Tag style={css('background:rgba(150,120,200,.12);border:1px solid rgba(150,120,200,.2);color:#B8A0E8;font-size:11px')}>{' '}RP</Tag></div>
              </div>
              <div style={css('font-size:13px;color:rgba(240,236,230,.60);line-height:1.5')}>Enfin ! 3 semaines de travail pour cette voie. Les mouvements de crux commencent vraiment à rentrer </div>
            </div>
            <div style={css(FOOTER)}>
              <div style={css(FOOTER_ITEM)}>{' '}<span>24</span></div>
              <div style={css(FOOTER_ITEM)}>{' '}<span>8</span></div>
              <div style={css(`${FOOTER_ITEM};margin-left:auto`)}>⬆</div>
            </div>
          </div>
        </div>

        {/* Card 2: spot proposé */}
        <div className="g" style={css('border-radius:22px;overflow:hidden')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('padding:16px 16px 12px;display:flex;align-items:center;gap:10px')}>
              <div style={css('width:38px;height:38px;border-radius:50%;background:rgba(80,160,80,.15);border:1.5px solid rgba(80,160,80,.25);display:flex;align-items:center;justify-content:center;font-size:17px')} />
              <div style={css('flex:1')}>
                <div style={css('font-size:14px;font-weight:700;color:#f0ece6')}>MarieFalaise</div>
                <div style={css('font-size:11px;color:rgba(240,236,230,.6)')}>il y a 5h · Chamonix</div>
              </div>
            </div>
            <div style={css('padding:0 16px 14px')}>
              <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:8px')}><Tag variant="g">{' '}Nouveau spot</Tag></div>
              <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:4px')}>Aiguille de la République</div>
              <div style={css('font-size:13px;color:rgba(240,236,230,.60);line-height:1.5')}>Falaise granit découverte lors d'une rando. Voies de 5c à 7a, excellent rocher. Je propose l'ajout !</div>
              <div onClick={() => goTo('proposer')} style={css('margin-top:12px;padding:10px;border-radius:12px;font-size:13px;font-weight:600;text-align:center;background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.22);color:#88D088;cursor:pointer')}>Voir la proposition →</div>
            </div>
            <div style={css(FOOTER)}>
              <div style={css(FOOTER_ITEM)}>{' '}<span>12</span></div>
              <div style={css(FOOTER_ITEM)}>{' '}<span>3</span></div>
            </div>
          </div>
        </div>

        {/* Card 3: flash */}
        <div className="g" style={css('border-radius:22px;overflow:hidden')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('padding:16px 16px 12px;display:flex;align-items:center;gap:10px')}>
              <div style={css('width:38px;height:38px;border-radius:50%;background:rgba(100,130,200,.18);border:1.5px solid rgba(100,130,200,.28);display:flex;align-items:center;justify-content:center;font-size:17px')} />
              <div style={css('flex:1')}>
                <div style={css('font-size:14px;font-weight:700;color:#f0ece6')}>Pierre_bloc</div>
                <div style={css('font-size:11px;color:rgba(240,236,230,.6)')}>hier · Fontainebleau</div>
              </div>
            </div>
            <div style={css('padding:0 16px 14px')}>
              <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
                <div style={css('width:38px;height:38px;border-radius:11px;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.22);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#D4A030')}>7A</div>
                <div>
                  <div style={css('font-size:15px;font-weight:700;color:#f0ece6')}>L'Éléphant</div>
                  <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>Flash · Bloc</div>
                </div>
                <div style={css('margin-left:auto')}><Tag variant="a" style={css('font-size:11px')}>{' '}Flash</Tag></div>
              </div>
            </div>
            <div style={css(FOOTER)}>
              <div style={css(FOOTER_ITEM)}>{' '}<span>31</span></div>
              <div style={css(FOOTER_ITEM)}>{' '}<span>5</span></div>
            </div>
          </div>
        </div>
      </div>
      <div style={css('height:20px')} />
    </div>
  );
}
