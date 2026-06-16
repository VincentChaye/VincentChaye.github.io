import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { SectionHeader, Tag } from '../components/primitives';
import { AdminUserRow } from '../components/AdminUserRow';
import { BackChevronIcon } from '../lib/icons';

/** Carte de statistique de l'admin (label coloré + grand nombre + sous-texte). */
function StatBox({ label, labelColor, value, sub }: { label: string; labelColor: string; value: string; sub: string }) {
  return (
    <div className="g" style={css('border-radius:18px;padding:18px 16px')}>
      <div style={css('position:relative;z-index:2')}>
        <div style={css(`font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:${labelColor};margin-bottom:8px`)}>{label}</div>
        <div style={css('font-size:30px;font-weight:800;letter-spacing:-1px;color:#f0ece6;margin-bottom:2px')}>{value}</div>
        <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>{sub}</div>
      </div>
    </div>
  );
}

const APPROVE = 'flex:1;padding:11px;border-radius:12px;font-size:13px;font-weight:700;text-align:center;background:rgba(80,160,80,.18);border:1px solid rgba(80,160,80,.28);color:#88D088;cursor:pointer';
const REJECT = 'flex:1;padding:11px;border-radius:12px;font-size:13px;font-weight:700;text-align:center;background:rgba(200,80,80,.14);border:1px solid rgba(200,80,80,.24);color:#E88080;cursor:pointer';

/** SCREEN: ADMIN — port fidèle (proto l.1014-1083). */
export function AdminScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'admin' && 'active')} id="sc-admin">
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => goTo('profil')}>
            <BackChevronIcon width={9} height={15} /> Profil
          </div>
        </div>
      </NavBar>

      {/* Admin stats */}
      <div style={css('padding:0 20px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:4px')}>
        <StatBox label="En attente" labelColor="rgba(212,160,48,.7)" value="7" sub="Spots à modérer" />
        <StatBox label="Approuvés" labelColor="rgba(80,160,80,.7)" value="5 711" sub="Spots total" />
        <StatBox label="Utilisateurs" labelColor="rgba(100,130,200,.7)" value="9" sub="Inscrits" />
        <StatBox label="Modifs" labelColor="rgba(200,120,60,.7)" value="3" sub="En révision" />
      </div>

      {/* Spots en attente */}
      <SectionHeader small>Spots en attente de modération</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        <div className="g" style={css('border-radius:20px;padding:16px')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('display:flex;align-items:flex-start;gap:12px;margin-bottom:14px')}>
              <div style={css('width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,rgba(40,65,30,.8),rgba(20,45,15,.9));display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:1px solid rgba(80,160,80,.2)')} />
              <div style={css('flex:1')}>
                <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>Aiguille de la République</div>
                <div style={css('font-size:12px;color:rgba(240,236,230,.6);margin-bottom:6px;display:flex;align-items:center;gap:5px')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>Chamonix · par MarieFalaise
                </div>
                <div style={css('display:flex;gap:6px')}><Tag variant="a">Falaise</Tag><Tag variant="g">5c→7a</Tag></div>
              </div>
            </div>
            <div style={css('font-size:13px;color:rgba(240,236,230,.55);line-height:1.4;margin-bottom:14px')}>Falaise granit découverte lors d'une randonnée. Voies de qualité, rocher sain. À valider.</div>
            <div style={css('display:flex;gap:10px')}>
              <div style={css(APPROVE)}>{' '}Approuver</div>
              <div style={css(REJECT)}>{' '}Rejeter</div>
            </div>
          </div>
        </div>
        <div className="g" style={css('border-radius:20px;padding:16px')}>
          <div style={css('position:relative;z-index:2')}>
            <div style={css('display:flex;align-items:flex-start;gap:12px;margin-bottom:14px')}>
              <div style={css('width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,rgba(30,55,20,.8),rgba(15,35,10,.9));display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:1px solid rgba(100,150,60,.2)')} />
              <div style={css('flex:1')}>
                <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>Chaos des Trois Fontaines</div>
                <div style={css('font-size:12px;color:rgba(240,236,230,.6);margin-bottom:6px')}>Fontainebleau · par Pierre_bloc</div>
                <div style={css('display:flex;gap:6px')}><Tag variant="g">Bloc</Tag><Tag variant="a">3A→7B</Tag></div>
              </div>
            </div>
            <div style={css('display:flex;gap:10px')}>
              <div style={css(APPROVE)}>{' '}Approuver</div>
              <div style={css(REJECT)}>{' '}Rejeter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modifications en attente */}
      <SectionHeader small>Modifications en révision</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        <div className="g" style={css('border-radius:18px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px')}>
          <div style={css('width:36px;height:36px;border-radius:11px;background:rgba(200,120,60,.14);border:1px solid rgba(200,120,60,.22);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;position:relative;z-index:2')} />
          <div style={css('flex:1;position:relative;z-index:2')}>
            <div style={css('font-size:14px;font-weight:600;color:#f0ece6;margin-bottom:2px')}>Modification: Gorges du Verdon</div>
            <div style={css('font-size:12px;color:rgba(240,236,230,.6);margin-bottom:8px')}>MarieFalaise · ajout 2 voies</div>
            <div style={css('display:flex;gap:8px')}>
              <div style={css('padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:rgba(80,160,80,.15);border:1px solid rgba(80,160,80,.25);color:#88D088;cursor:pointer')}>{' '}OK</div>
              <div style={css('padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.65);cursor:pointer')}>Voir diff</div>
              <div style={css('padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);color:#E88080;cursor:pointer')} />
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <SectionHeader small>Utilisateurs récents</SectionHeader>
      <div style={css('padding:0 20px 24px')}>
        <div className="g" style={css('border-radius:20px;overflow:hidden')}>
          <div style={css('position:relative;z-index:2')}>
            <AdminUserRow border avatarBg="background:rgba(212,160,48,.18)" name="Alex_grimpe" meta="47 ascensions · actif hier" badge="Actif" badgeVariant="g" />
            <AdminUserRow border avatarBg="background:rgba(80,160,80,.15)" name="MarieFalaise" meta="23 ascensions · 2 contributions" badge="Contrib" badgeVariant="a" />
            <AdminUserRow avatarBg="background:rgba(100,130,200,.15)" name="Pierre_bloc" meta="31 ascensions · actif aujourd'hui" badge="Actif" badgeVariant="g" />
          </div>
        </div>
      </div>
    </div>
  );
}
