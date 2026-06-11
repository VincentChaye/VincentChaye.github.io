import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { BackChevronIcon, Share2Icon, ActivityIcon, MapPinIcon } from '../lib/icons';

const STAT = 'border-radius:16px;padding:14px 10px;text-align:center';
const STAT_VALUE = 'font-size:20px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.6);text-transform:uppercase;letter-spacing:.5px';
const ACT_CARD = 'border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start';
const ACT_ICON = 'width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:2';

/** SCREEN: PROFIL PUBLIC — port fidèle (proto l.1351-1386). */
export function PublicProfileScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'profil-public' && 'active')} id="sc-profil-public">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('notifications')}>
            <BackChevronIcon width={9} height={15} /> Retour
          </div>
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton style={css('cursor:pointer')}>
              <Share2Icon width={16} height={16} />
            </IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('text-align:center;padding:20px 20px 0')}>
        <div style={css('width:88px;height:88px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(145deg,rgba(80,130,200,.25),rgba(50,90,160,.35));border:2.5px solid rgba(80,130,200,.35);display:flex;align-items:center;justify-content:center;font-size:38px;box-shadow:0 0 30px rgba(80,130,200,.18),0 4px 20px rgba(0,0,0,.4);position:relative')}>
          <div style={css('position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(80,130,200,.2)')} />
        </div>
        <div style={css('font-size:22px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:4px')}>Thomas R.</div>
        <div style={css('font-size:14px;color:rgba(240,236,230,.6);margin-bottom:16px')}>@thomasr · Grenoble </div>
        <div style={css('display:flex;flex-direction:column;gap:2px;margin-bottom:20px')}>
          <span style={css('font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:rgba(212,160,48,.65);font-weight:600')}>Grimpeur expert</span>
          <span style={css('font-size:15px;font-weight:700;color:rgba(240,236,230,.80);letter-spacing:-.3px')}>Max 8a</span>
        </div>

        {/* Follow / Ami buttons */}
        <div style={css('display:flex;gap:10px;justify-content:center;margin-bottom:24px')}>
          <div style={css('flex:1;max-width:160px;padding:11px;border-radius:14px;font-size:14px;font-weight:700;text-align:center;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.9),rgba(232,184,75,.95));color:#1a0f05;box-shadow:0 3px 14px rgba(212,160,48,.3)')}>Ajouter ami</div>
          <div className="g" style={css('flex:1;max-width:160px;padding:11px;border-radius:14px;font-size:14px;font-weight:600;text-align:center;cursor:pointer;color:rgba(240,236,230,.7)')}>Message</div>
        </div>

        <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px')}>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>134</div><div style={css(STAT_LABEL)}>Ascensions</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>28</div><div style={css(STAT_LABEL)}>Spots</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>21</div><div style={css(STAT_LABEL)}>Amis</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>9</div><div style={css(STAT_LABEL)}>Contribs</div></div></div>
        </div>
      </div>

      {/* Activité récente */}
      <div style={css('padding:0 20px')}>
        <div style={css('font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);padding:0 4px 12px')}>Activité récente</div>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          <div className="g" style={css(ACT_CARD)}>
            <div style={css(`${ACT_ICON};background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2)`)}><ActivityIcon width={15} height={15} stroke="#D4A030" /></div>
            <div style={css('flex:1;position:relative;z-index:2')}>
              <div style={css('font-size:14px;font-weight:600;color:#f0ece6;margin-bottom:3px')}>Flash de <span style={css('color:#D4A030')}>L'Égypte 7b+</span></div>
              <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>Gorges du Verdon · il y a 2j</div>
            </div>
          </div>
          <div className="g" style={css(ACT_CARD)}>
            <div style={css(`${ACT_ICON};background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.2)`)}><MapPinIcon width={15} height={15} stroke="#80D880" /></div>
            <div style={css('flex:1;position:relative;z-index:2')}>
              <div style={css('font-size:14px;font-weight:600;color:#f0ece6;margin-bottom:3px')}>Spot proposé : <span style={css('color:#80D880')}>Belvédère de Sisteron</span></div>
              <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>Sisteron, 04 · il y a 5j</div>
            </div>
          </div>
        </div>
        <div style={css('height:20px')} />
      </div>
    </div>
  );
}
