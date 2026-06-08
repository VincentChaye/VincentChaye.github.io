import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { Tag, Stars } from './primitives';
import { MapPinIcon, ArrowRightIcon, SendIcon, BookmarkIcon, Share2Icon } from '../lib/icons';

const GLASS_CIRCLE =
  'width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(18,12,6,.50);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.13);cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.09)';

/** Bottom-sheet d'aperçu de spot sur la carte (`.half-sheet` + extension de fond). */
export function SpotSheet({ goTo }: { goTo: (id: ScreenId) => void }) {
  return (
    <div style={css('position:absolute;bottom:0;left:0;right:0;z-index:30;padding:0 16px 95px')}>
      <div className="bg-ext bg-ext-sheet" style={css('bottom:20px;position:absolute;')} />
      <div
        onClick={() => goTo('spot-detail')}
        className="half-sheet sheet-open"
        style={css('border-radius:26px;padding:18px;background:rgba(14,9,4,.82);backdrop-filter:blur(40px) saturate(1.8);-webkit-backdrop-filter:blur(40px) saturate(1.8);border:1px solid rgba(212,160,48,.22);box-shadow:0 -4px 40px rgba(0,0,0,.5);cursor:pointer;position:relative;overflow:hidden')}
      >
        <div className="sheet-handle" />
        <div style={css('position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),rgba(212,160,48,.35),rgba(255,255,255,.22),transparent)')} />
        <div style={css('width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 16px')} />
        <div style={css('display:flex;gap:14px;align-items:flex-start')}>
          <div style={css('width:70px;height:70px;border-radius:16px;background:linear-gradient(160deg,rgba(60,100,40,.8),rgba(30,60,20,.9));border:1px solid rgba(212,160,48,.15);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0')} />
          <div style={css('flex:1')}>
            <div style={css('font-size:17px;font-weight:700;color:#f0ece6;letter-spacing:-.3px;margin-bottom:4px')}>Gorges du Verdon</div>
            <div style={css('font-size:12px;color:rgba(240,236,230,.50);margin-bottom:8px;display:flex;align-items:center;gap:5px')}>
              <MapPinIcon width={11} height={11} strokeWidth={2.5} />
              Alpes-de-Haute-Provence · 12 km
            </div>
            <div style={css('display:flex;flex-direction:column;gap:4px')}>
              <div style={css('display:flex;gap:6px')}>
                <Tag variant="a">Falaise</Tag>
                <Tag variant="g">4c→8b</Tag>
              </div>
              <Tag variant="b">
                <Stars size={10} /> 4.8
              </Tag>
            </div>
          </div>
        </div>
        <div style={css('display:flex;align-items:center;gap:12px;margin-top:16px')}>
          {/* CTA principal */}
          <div
            onClick={() => goTo('spot-detail')}
            style={css('flex:1;padding:13px 18px;border-radius:9999px;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid rgba(255,255,255,.26);color:#1a0f05;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28),inset 0 1px 0 rgba(255,255,255,.28)')}
          >
            Voir le spot
            <ArrowRightIcon width={13} height={13} stroke="#1a0f05" />
          </div>
          {/* Actions glass */}
          <div style={css('display:flex;gap:8px')}>
            <div style={css('display:flex;flex-direction:column;align-items:center')}>
              <div style={css(GLASS_CIRCLE)}>
                <SendIcon width={15} height={15} stroke="rgba(240,236,230,.82)" />
              </div>
              <span style={css('font-size:10px;color:rgba(240,236,230,.42);white-space:nowrap;margin-top:4px')}>GPS</span>
            </div>
            <div style={css('display:flex;flex-direction:column;align-items:center')}>
              <div style={css(GLASS_CIRCLE)}>
                <BookmarkIcon width={15} height={15} stroke="rgba(240,236,230,.82)" />
              </div>
              <span style={css('font-size:10px;color:rgba(240,236,230,.42);white-space:nowrap;margin-top:4px')}>Sauvegarder</span>
            </div>
            <div style={css('display:flex;flex-direction:column;align-items:center')}>
              <div style={css(GLASS_CIRCLE)}>
                <Share2Icon width={15} height={15} stroke="rgba(240,236,230,.82)" />
              </div>
              <span style={css('font-size:10px;color:rgba(240,236,230,.42);white-space:nowrap;margin-top:4px')}>Partager</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
