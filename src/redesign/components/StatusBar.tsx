import { useEffect, useState } from 'react';
import { css } from '../lib/css';

/** Barre d'état iOS (`.sb`) : heure (live) + signal + wifi + batterie. */
export function StatusBar() {
  const [time, setTime] = useState(formatNow());
  useEffect(() => {
    const tick = () => setTime(formatNow());
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sb">
      <span className="sb-time" style={css('letter-spacing:-.3px;font-weight:600')}>
        {time}
      </span>
      <div className="sbi">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="rgba(240,236,230,.85)">
          <rect x="0" y="7" width="3" height="5" rx="1" />
          <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" />
          <rect x="9" y="2" width="3" height="10" rx="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="rgba(240,236,230,.85)" strokeWidth="1.5">
          <path d="M1 4.5C3.8 1.5 12.2 1.5 15 4.5" strokeLinecap="round" />
          <path d="M3.5 7C5.2 5.2 10.8 5.2 12.5 7" strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="1.5" fill="rgba(240,236,230,.85)" stroke="none" />
        </svg>
        <div className="bat">
          <div className="batf" />
        </div>
      </div>
    </div>
  );
}

function formatNow(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}
