import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { SectionHeader } from '../components/primitives';
import { TypeCard } from '../components/TypeCard';

const FIELD = 'border-radius:16px;overflow:hidden';
const FIELD_LABEL = 'padding:12px 16px 2px;font-size:11px;font-weight:600;color:rgba(212,160,48,.8);letter-spacing:.3px';
const FIELD_VALUE = 'padding:0 16px 12px;font-size:16px;color:rgba(240,236,230,.6)';

/** SCREEN: PROPOSER UN SPOT — port fidèle (proto l.796-858). */
export function ProposeScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'proposer' && 'active')} id="sc-proposer">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('carte')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>Annuler
          </div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Proposer un spot</span>
          <div style={css('font-size:13px;color:#D4A030;font-weight:600;cursor:pointer')}>Suivant</div>
        </div>
      </NavBar>

      {/* Progress steps */}
      <div style={css('padding:0 20px 20px;display:flex;align-items:center;gap:8px')}>
        <div style={css('flex:1;height:3px;border-radius:2px;background:rgba(212,160,48,.85);box-shadow:0 0 8px rgba(212,160,48,.3)')} />
        <div style={css('flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.12)')} />
        <div style={css('flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.12)')} />
        <div style={css('flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.12)')} />
      </div>
      <div style={css('padding:0 20px 6px;font-size:12px;color:rgba(240,236,230,.6);font-weight:500')}>Étape 1 sur 4 — Type de spot</div>
      <SectionHeader small style={css('padding-top:4px')}>Quel type de spot ?</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        <TypeCard selected iconStyle="background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.3)" title="Falaise" desc="Escalade sur paroi naturelle en extérieur" />
        <TypeCard iconStyle="background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.20)" title="Bloc" desc="Bloc de rocher, escalade sans corde" />
        <TypeCard iconStyle="background:rgba(100,130,200,.12);border:1px solid rgba(100,130,200,.20)" title="Salle indoor" desc="Structure artificielle d'escalade" />
        <TypeCard iconStyle="background:rgba(212,160,48,.10);border:1px solid rgba(212,160,48,.18)" title="Magasin" desc="Magasin d'escalade, équipement" />
      </div>

      {/* Step 2 preview */}
      <SectionHeader small>Informations générales</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:12px')}>
        <div className="g" style={css(FIELD)}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css(FIELD_LABEL)}>Nom du spot *</div>
            <div style={css(FIELD_VALUE)}>Ex: Falaise des Trois Pics</div>
          </div>
        </div>
        <div className="g" style={css(FIELD)}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css(FIELD_LABEL)}>Description</div>
            <div style={css('padding:0 16px 18px;font-size:16px;color:rgba(240,236,230,.6);min-height:60px')}>Décris le spot...</div>
          </div>
        </div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          <div className="g" style={css(FIELD)}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Grade min</div>
              <div style={css(FIELD_VALUE)}>4a</div>
            </div>
          </div>
          <div className="g" style={css(FIELD)}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Grade max</div>
              <div style={css(FIELD_VALUE)}>8b</div>
            </div>
          </div>
        </div>
      </div>

      {/* Location picker */}
      <SectionHeader small>Localisation</SectionHeader>
      <div style={css('padding:0 20px 24px')}>
        <div className="g" style={css('border-radius:20px;overflow:hidden;height:130px;background:radial-gradient(circle at 50% 60%,rgba(40,65,30,.8),rgba(20,45,15,.95));position:relative')}>
          <div style={css('position:absolute;inset:0;background-image:linear-gradient(rgba(60,90,40,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(60,90,40,.2) 1px,transparent 1px);background-size:30px 30px')} />
          <div style={css('position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center')}>
            <div style={css('width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:rgba(212,160,48,.85);border:2px solid rgba(255,255,255,.3);box-shadow:0 0 16px rgba(212,160,48,.5)')} />
            <div style={css('width:8px;height:4px;background:rgba(0,0,0,.3);border-radius:50%;margin-top:-2px;filter:blur(1px)')} />
          </div>
          <div style={css('position:absolute;bottom:12px;left:12px;right:12px;border-radius:9999px;padding:10px 14px;background:rgba(10,7,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);font-size:13px;color:rgba(240,236,230,.7);display:flex;align-items:center;gap:8px;z-index:2')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4A030" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>Appuyer pour placer un marqueur
          </div>
        </div>
      </div>
    </div>
  );
}
