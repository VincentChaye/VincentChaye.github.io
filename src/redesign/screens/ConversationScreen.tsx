import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';

const RECV_ROW = 'display:flex;align-items:flex-end;gap:8px;max-width:78%';
const RECV_BUBBLE = 'background:rgba(255,255,255,.08);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.10);border-radius:18px 18px 18px 4px;padding:10px 14px';
const RECV_TEXT = 'font-size:14px;color:#f0ece6;line-height:1.4';
const SENT_ROW = 'display:flex;justify-content:flex-end;max-width:78%;align-self:flex-end';
const SENT_BUBBLE = 'background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.90));border:1px solid rgba(255,255,255,.20);border-radius:18px 18px 4px 18px;padding:10px 14px;box-shadow:0 2px 12px rgba(212,160,48,.20)';
const SENT_TEXT = 'font-size:14px;color:#1a0f05;font-weight:500;line-height:1.4';
const AVATAR = 'width:28px;height:28px;border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3));display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;font-size:11px;flex-shrink:0';
const SEP = 'font-size:11px;color:rgba(240,236,230,.6);font-weight:500';

/** SCREEN: CONVERSATION — port fidèle (proto l.1087-1204). */
export function ConversationScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'conversation' && 'active')} id="sc-conversation">
      <div style={css('display:flex;flex-direction:column;min-height:100%')}>
        {/* Navbar */}
        <NavBar style={css('height:102px;flex-shrink:0')}>
          <div className="nbi">
            <div className="back-btn" onClick={() => goTo('messagerie')}>
              <BackChevronIcon width={9} height={15} /> Messages
            </div>
            <div style={css('position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none')}>
              <div style={css('width:32px;height:32px;border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3));display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;font-size:13px')}>A</div>
              <span style={css('font-size:12px;font-weight:600;color:#f0ece6;letter-spacing:-.2px')}>Alex Fontaine</span>
            </div>
            <div className="na">
              <IconButton style={css('cursor:pointer')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.13 6.13l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" /></svg>
              </IconButton>
              <IconButton style={css('cursor:pointer')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </IconButton>
            </div>
          </div>
        </NavBar>

        {/* Messages */}
        <div style={css('flex:1;padding:8px 16px 16px;display:flex;flex-direction:column;gap:6px')}>
          <div style={css('text-align:center;margin:8px 0 4px')}><span style={css(SEP)}>Aujourd'hui 10:28</span></div>

          <div style={css(RECV_ROW)}>
            <div style={css(AVATAR)}>A</div>
            <div style={css(RECV_BUBBLE)}><span style={css(RECV_TEXT)}>Salut ! Tu grimpes ce week-end au Verdon ?</span></div>
          </div>

          <div style={css(RECV_ROW)}>
            <div style={css('width:28px;height:28px;flex-shrink:0')} />
            <div style={css(RECV_BUBBLE)}><span style={css(RECV_TEXT)}>Tu as essayé la voie 6b+ à droite du secteur Escoffier ?</span></div>
          </div>

          <div style={css(SENT_ROW)}>
            <div style={css(SENT_BUBBLE)}><span style={css(SENT_TEXT)}>Oui prévu samedi ! Je connais pas trop ce secteur</span></div>
          </div>

          <div style={css(SENT_ROW)}>
            <div style={css(SENT_BUBBLE)}><span style={css(SENT_TEXT)}>C'est quoi ton niveau en ce moment ?</span></div>
          </div>

          <div style={css(RECV_ROW)}>
            <div style={css(AVATAR)}>A</div>
            <div style={css(RECV_BUBBLE)}><span style={css(RECV_TEXT)}>7a en falaise, j'essaie de passer le 7b depuis quelques semaines 😅</span></div>
          </div>

          <div style={css('text-align:center;margin:10px 0 4px')}><span style={css(SEP)}>10:41</span></div>

          {/* Received with spot share */}
          <div style={css('display:flex;align-items:flex-end;gap:8px;max-width:85%')}>
            <div style={css(AVATAR)}>A</div>
            <div style={css('background:rgba(255,255,255,.08);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:10px 12px;display:flex;flex-direction:column;gap:8px')}>
              <span style={css(RECV_TEXT)}>Je t'envoie le spot !</span>
              <div onClick={() => goTo('spot-detail')} style={css('border-radius:12px;background:rgba(212,160,48,.10);border:1px solid rgba(212,160,48,.20);padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:10px')}>
                <div style={css('width:36px;height:36px;border-radius:10px;background:linear-gradient(160deg,rgba(60,100,40,.8),rgba(30,60,20,.9));display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px')} />
                <div>
                  <div style={css('font-size:13px;font-weight:700;color:#f0ece6;margin-bottom:2px')}>Gorges du Verdon</div>
                  <div style={css('font-size:11px;color:rgba(240,236,230,.50)')}>Falaise · 4c → 8b · 12 km</div>
                </div>
                <svg style={css('margin-left:auto;flex-shrink:0')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,48,.7)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>
          </div>

          <div style={css(SENT_ROW)}>
            <div style={css(SENT_BUBBLE)}><span style={css(SENT_TEXT)}>Top merci ! On se retrouve à 9h à l'entrée ?</span></div>
          </div>

          <div style={css('display:flex;justify-content:flex-end;padding-right:2px')}>
            <span style={css('font-size:11px;color:rgba(240,236,230,.6)')}>Lu · 10:43</span>
          </div>
        </div>

        {/* Input bar */}
        <div style={css('position:sticky;bottom:0;padding:10px 16px 14px;background:linear-gradient(to top,rgba(10,7,4,.95) 60%,transparent);flex-shrink:0')}>
          <div style={css('display:flex;align-items:center;gap:10px')}>
            <div style={css('flex:1;display:flex;align-items:center;background:rgba(255,255,255,.07);backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);border:1px solid rgba(255,255,255,.11);border-radius:9999px;padding:10px 16px;gap:8px;position:relative;overflow:hidden')}>
              <div style={css('position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)')} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.6)" strokeWidth="2" style={css('flex-shrink:0')}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" /></svg>
              <span style={css('font-size:15px;color:rgba(240,236,230,.6);flex:1')}>Message…</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,.6)" strokeWidth="2" style={css('flex-shrink:0')}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            </div>
            <div style={css('width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;box-shadow:0 3px 12px rgba(212,160,48,.30);border:1px solid rgba(255,255,255,.22)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a0f05" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
