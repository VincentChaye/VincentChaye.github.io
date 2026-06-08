import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import { SIDE_NAV, type ScreenId } from '../lib/nav';

/**
 * Panneau latéral de la vitrine desktop (`.si`) — ÉCHAFAUDAGE preview uniquement.
 * Liste les 19 écrans groupés ; clic = navigation. Jetable à l'étape de remplacement.
 */
export function SidePanel({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className="si">
      <div className="sibadge">ZoneDeGrimpe</div>
      <div className="sit">Liquid Glass</div>
      <div className="sit" style={css('color:#D4A030')}>
        Redesign
      </div>
      <div className="sis" style={css('margin-top:6px')}>
        Prototype iOS mobile — 20 écrans interactifs
      </div>
      <div className="snav" id="side-nav">
        {SIDE_NAV.map((group) => (
          <Fragment key={group.title}>
            <div className="snv-t">{group.title}</div>
            {group.items.map((it) => (
              <button
                key={it.id}
                className={cn('snb', active === it.id && 'active')}
                data-s={it.id}
                onClick={() => goTo(it.id)}
              >
                {it.label}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
