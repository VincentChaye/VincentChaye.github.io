import type { ReactNode } from 'react';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';
import type { ScreenId } from '../lib/nav';

/**
 * Cadre de téléphone (`.ph`) — ÉCHAFAUDAGE preview : notch, status bar, fond rocheux
 * animé (`.bgs`/`.bgg`/`.bgm`/`.gt1`), pages-wrapper (`.pw`) et tab bar flottante.
 *
 * NOTE swap : le `backdrop-filter` du glass se calcule contre ce fond animé. À l'étape de
 * remplacement, l'app réelle devra fournir une couche de fond équivalente derrière les écrans.
 */
export function PhoneFrame({
  active,
  goTo,
  children,
}: {
  active: ScreenId;
  goTo: (id: ScreenId) => void;
  children: ReactNode;
}) {
  return (
    <div className="ph">
      <div className="di">
        <div className="dic" />
        <div className="dis" />
      </div>
      <StatusBar />
      <div className="bgs">
        <div className="bgg" />
        <div className="bgm" />
        <div className="gt1" />
      </div>
      <div className="pw" id="pw">
        {children}
      </div>
      <TabBar active={active} goTo={goTo} />
    </div>
  );
}
