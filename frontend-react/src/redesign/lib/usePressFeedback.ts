import { useEffect, type RefObject } from 'react';

/**
 * Feedback tactile uniforme « style iOS » sans toucher chaque page : un seul écouteur
 * délégué sur la racine `.lg-root`. Au `pointerdown`, on remonte jusqu'au plus proche
 * ancêtre cliquable (`cursor:pointer`) et on lui pose `.lg-pressable` + `.is-pressing`
 * (scale spring défini dans interactions.css). On retire `.is-pressing` au relâchement,
 * à l'annulation, au scroll, ou si le doigt glisse (> seuil) — donc le scroll/pan n'est
 * jamais bloqué (écouteurs passifs, aucun preventDefault).
 *
 * Garde-fou : on saute les éléments qui portent déjà un `transform` (rotate/translate,
 * marqueurs Leaflet, boutons centrés…) pour ne pas écraser leur transform existant.
 * Désactivé si l'utilisateur préfère moins d'animations (sinon le scale « claque »).
 */
const MOVE_CANCEL = 10; // px de glissement qui annulent l'appui (= intention de scroll)

export function usePressFeedback(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let pressed: HTMLElement | null = null;
    let sx = 0;
    let sy = 0;

    const clear = () => {
      if (pressed) {
        pressed.classList.remove('is-pressing');
        pressed = null;
      }
    };

    const onDown = (e: PointerEvent) => {
      let el = e.target as HTMLElement | null;
      let hit: HTMLElement | null = null;
      while (el && el !== root) {
        const cs = getComputedStyle(el);
        if (cs.cursor === 'pointer') {
          // ne pas écraser un transform déjà posé (rotation, centrage, Leaflet…)
          if (cs.transform === 'none') hit = el;
          break;
        }
        el = el.parentElement;
      }
      if (!hit) return;
      clear();
      pressed = hit;
      sx = e.clientX;
      sy = e.clientY;
      hit.classList.add('lg-pressable', 'is-pressing');
    };

    const onMove = (e: PointerEvent) => {
      if (!pressed) return;
      if (Math.abs(e.clientX - sx) > MOVE_CANCEL || Math.abs(e.clientY - sy) > MOVE_CANCEL) clear();
    };

    root.addEventListener('pointerdown', onDown, { passive: true });
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerup', clear, { passive: true });
    root.addEventListener('pointercancel', clear, { passive: true });
    root.addEventListener('pointerleave', clear, { passive: true });
    root.addEventListener('scroll', clear, { passive: true, capture: true });

    return () => {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', clear);
      root.removeEventListener('pointercancel', clear);
      root.removeEventListener('pointerleave', clear);
      root.removeEventListener('scroll', clear, true);
    };
  }, [rootRef]);
}
