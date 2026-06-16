import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { TABS, type ScreenId, type TabIcon } from '../lib/nav';
import { HomeIcon, LayersIcon, ActivityIcon, MessageSquareIcon, UserIcon, type IconProps } from '../lib/icons';

const ICONS: Record<TabIcon, (p: IconProps) => ReactElement> = {
  home: HomeIcon,
  map: LayersIcon,
  feed: ActivityIcon,
  messages: MessageSquareIcon,
  user: UserIcon,
};

/** Tab bar flottante (`.tbw` / `.tb`) — 5 onglets, état actif ambre. */
export function TabBar({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className="tbw">
      <div className="tb">
        {TABS.map((t) => {
          const Ico = ICONS[t.icon];
          return (
            <div
              key={t.id}
              className={cn('ti', active === t.id && 'active')}
              data-s={t.id}
              onClick={() => goTo(t.id)}
            >
              <div className="tii">
                <Ico width={20} height={20} />
              </div>
              <div className="til">{t.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
