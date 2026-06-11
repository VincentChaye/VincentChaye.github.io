import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { ConversationRow } from '../components/ConversationRow';

/** SCREEN: MESSAGERIE — port fidèle (proto l.861-929). */
export function MessagesScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'messagerie' && 'active')} id="sc-messagerie">
      <NavBar>
        <div className="nbi">
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton style={css('cursor:pointer')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </IconButton>
            <IconButton style={css('cursor:pointer')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </IconButton>
          </div>
        </div>
      </NavBar>

      {/* Conversations list */}
      <div style={css('padding:0 16px')}>
        <ConversationRow onClick={() => goTo('conversation')} avatarStyle="border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3))" avatarColor="#E8B84B" avatarFontSize="16px" initials="A" name="Alex Fontaine" time="10:32" preview="Tu as essaye la voie 6b+ a droite ?" unread />
        <ConversationRow onClick={() => goTo('conversation')} avatarStyle="border-radius:50%;background:linear-gradient(145deg,rgba(60,120,80,.4),rgba(30,74,42,.3))" avatarColor="#6dbf8a" avatarFontSize="16px" initials="M" name="Marie Dupont" time="Hier" preview="Super session hier au Verdon !" />
        <ConversationRow avatarStyle="border-radius:50%;background:linear-gradient(145deg,rgba(90,60,160,.4),rgba(60,30,120,.3))" avatarColor="#a88fe0" avatarFontSize="16px" initials="T" name="Thomas Roc" time="Lun." preview="On part grimper samedi ? Fontainebleau" />

        {/* Groupes */}
        <div style={css('margin-top:6px;margin-bottom:8px;padding:0 4px;font-size:12px;font-weight:600;color:rgba(240,236,230,.6);letter-spacing:.6px;text-transform:uppercase')}>Groupes</div>

        <ConversationRow avatarStyle="border-radius:14px;background:linear-gradient(145deg,rgba(212,160,48,.25),rgba(180,100,20,.2))" avatarColor="#E8B84B" avatarFontSize="13px" initials="CES" name="Club Escalade Sud" time="Mar." preview="Lucas : Sortie dimanche confirmee !" unread />
      </div>
    </div>
  );
}
