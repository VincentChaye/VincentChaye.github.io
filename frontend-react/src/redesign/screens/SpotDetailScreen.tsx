import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { GlassCard, IconButton, SectionHeader, Tag, Stars } from '../components/primitives';
import { RouteRow } from '../components/RouteRow';
import { ReviewCard } from '../components/ReviewCard';
import { BackChevronIcon, HeartIcon, ShareUploadIcon, MapPinIcon } from '../lib/icons';

const STAT_CELL = 'text-align:center;padding:14px 8px;position:relative';
const STAT_VALUE = 'font-size:18px;font-weight:800;color:#f0ece6;margin-bottom:2px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.45);text-transform:uppercase;letter-spacing:.5px';
const STAT_DIVIDER = 'position:absolute;right:0;top:20%;bottom:20%;width:1px;background:rgba(212,160,48,.15)';

/** SCREEN: SPOT DETAIL — port fidèle (proto l.473-558). */
export function SpotDetailScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'spot-detail' && 'active')} id="sc-spot-detail">
      {/* Navbar sticky */}
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('carte')}>
            <BackChevronIcon width={9} height={15} /> Carte
          </div>
          <div className="na">
            <IconButton style={css('cursor:pointer')}>
              <HeartIcon width={16} height={16} />
            </IconButton>
            <IconButton style={css('cursor:pointer')}>
              <ShareUploadIcon width={16} height={16} />
            </IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('position:relative')}>
        {/* Hero */}
        <div style={css('height:190px;background:linear-gradient(160deg,rgba(40,70,30,.9),rgba(20,45,15,.95)),repeating-linear-gradient(45deg,rgba(80,120,50,.2) 0,rgba(80,120,50,.2) 2px,transparent 2px,transparent 10px);display:flex;align-items:flex-end;padding:16px 20px 20px;position:relative')}>
          <div style={css('font-size:56px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)')} />
          <div>
            <div style={css('display:flex;gap:6px;margin-bottom:10px')}>
              <Tag variant="a">Falaise</Tag>
              <Tag variant="g">4c → 8b</Tag>
            </div>
            <div style={css('font-size:22px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:4px')}>Gorges du Verdon</div>
            <div style={css('font-size:13px;color:rgba(240,236,230,.60);display:flex;align-items:center;gap:5px')}>
              <MapPinIcon width={12} height={12} />
              Alpes-de-Haute-Provence · 04120 La Palud-sur-Verdon
            </div>
          </div>
        </div>

        {/* Stats row */}
        <GlassCard style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:16px 20px;border-radius:20px;overflow:hidden')}>
          <div style={css(STAT_CELL)}>
            <div style={css(STAT_VALUE)}>247</div>
            <div style={css(STAT_LABEL)}>Voies</div>
            <div style={css(STAT_DIVIDER)} />
          </div>
          <div style={css(STAT_CELL)}>
            <div style={css('font-size:18px;font-weight:800;color:#f0ece6;margin-bottom:4px')}> 4.8</div>
            <div style={css('margin-bottom:3px')}>
              <Stars size={11} />
            </div>
            <div style={css(STAT_LABEL)}>Note</div>
            <div style={css(STAT_DIVIDER)} />
          </div>
          <div style={css(STAT_CELL)}>
            <div style={css(STAT_VALUE)}>SW</div>
            <div style={css(STAT_LABEL)}>Orientation</div>
            <div style={css(STAT_DIVIDER)} />
          </div>
          <div style={css('text-align:center;padding:14px 8px')}>
            <div style={css(STAT_VALUE)}>12km</div>
            <div style={css(STAT_LABEL)}>Distance</div>
          </div>
        </GlassCard>

        {/* Description */}
        <div style={css('padding:0 20px')}>
          <GlassCard style={css('border-radius:20px;padding:18px')}>
            <div style={css('position:relative;z-index:2;font-size:14px;line-height:1.6;color:rgba(240,236,230,.70)')}>
              Site d'escalade mondialement connu, les Gorges du Verdon offrent des voies de tous niveaux sur des parois calcaires spectaculaires. Accès par La Palud-sur-Verdon, nombreux secteurs.
            </div>
          </GlassCard>
        </div>

        {/* Voies */}
        <SectionHeader small>Voies d'escalade</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:8px')}>
          <RouteRow
            grade="6a"
            gradeBg="rgba(100,180,80,.15)"
            gradeBorder="rgba(100,180,80,.25)"
            gradeColor="#88D880"
            name="La Directe du Soleil"
            meta="25m · 8 pts · Sport"
            tag={<Tag variant="g" style={css('font-size:10px')}>OS possible</Tag>}
          />
          <RouteRow
            grade="7a"
            gradeBg="rgba(212,160,48,.12)"
            gradeBorder="rgba(212,160,48,.22)"
            gradeColor="#D4A030"
            name="La Surplombante"
            meta="32m · 11 pts · Sport"
            tag={<Tag variant="a" style={css('font-size:10px')}>Classique</Tag>}
          />
          <RouteRow
            grade="7c"
            gradeBg="rgba(200,120,60,.14)"
            gradeBorder="rgba(200,120,60,.25)"
            gradeColor="#E8924A"
            name="Pichenibule"
            meta="45m · 16 pts · Sport"
            tag={<Tag style={css('background:rgba(200,120,60,.12);border:1px solid rgba(200,120,60,.22);color:#E8924A;font-size:10px')}>Expert</Tag>}
          />
          <RouteRow
            grade="8b"
            gradeBg="rgba(180,80,80,.14)"
            gradeBorder="rgba(180,80,80,.25)"
            gradeColor="#E88080"
            name="La Rage de Vivre"
            meta="38m · 14 pts · Sport"
            tag={<Tag variant="r" style={css('font-size:10px')}>Elite</Tag>}
          />
        </div>

        {/* Reviews */}
        <SectionHeader small>Avis récents</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
          <ReviewCard
            avatarBg="rgba(212,160,48,.18)"
            name="Alex_grimpe"
            time="il y a 3 jours"
            text="Spot incroyable, les voies du secteur Escalès sont exceptionnelles. Conditions parfaites en mai."
          />
          <ReviewCard
            avatarBg="rgba(80,160,80,.15)"
            name="MarieFalaise"
            time="il y a 1 semaine"
            text="Superbe site, mais beaucoup de monde en week-end. Préférer la semaine pour profiter pleinement."
          />
        </div>

        {/* CTA bottom */}
        <div style={css('padding:20px')}>
          <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
            <div style={css('padding:14px;border-radius:9999px;font-size:14px;font-weight:700;text-align:center;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid rgba(255,255,255,.26);color:#1a0f05;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28),inset 0 1px 0 rgba(255,255,255,.28)')}>
              Itinéraire GPS
            </div>
            <div
              onClick={() => goTo('carnet')}
              style={css('padding:14px;border-radius:9999px;font-size:14px;font-weight:700;text-align:center;background:rgba(18,12,6,.50);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.13);color:#f0ece6;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.09)')}
            >
              Logger une voie
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
