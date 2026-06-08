import { css } from '../lib/css';

/** Interrupteur on/off des Paramètres (proto l.986-994). `onClick` optionnel → interactif au swap. */
export function Toggle({ on, onClick }: { on?: boolean; onClick?: () => void }) {
  if (on) {
    return (
      <div onClick={onClick} style={css('width:44px;height:26px;border-radius:13px;background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.9));border:1px solid rgba(255,255,255,.2);position:relative;cursor:pointer;box-shadow:0 0 12px rgba(212,160,48,.25)')}>
        <div style={css('position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,.3)')} />
      </div>
    );
  }
  return (
    <div onClick={onClick} style={css('width:44px;height:26px;border-radius:13px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12);position:relative;cursor:pointer')}>
      <div style={css('position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:rgba(240,236,230,.5);box-shadow:0 1px 4px rgba(0,0,0,.3)')} />
    </div>
  );
}
