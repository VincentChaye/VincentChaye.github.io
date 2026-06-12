import { toast } from 'sonner';

/** Base publique du site web — utilisée comme origine des liens partagés
 *  car dans l'app Capacitor `window.location.origin` vaut `https://localhost`. */
const PUBLIC_BASE = 'https://vincentchaye.github.io/ZoneDeGrimpe';

export function publicUrl(path: string): string {
  if (import.meta.env.MODE === 'capacitor') return `${PUBLIC_BASE}${path}`;
  return `${window.location.origin}/ZoneDeGrimpe${path}`;
}

function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* non supporté */ }
  document.body.removeChild(ta);
  return ok;
}

/** Partage natif si dispo, sinon copie dans le presse-papier avec toast. */
export async function shareUrl(url: string, title?: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // annulé par l'utilisateur
      // navigator.share présent mais en échec (WebView…) → fallback copie
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  } catch {
    if (legacyCopy(url)) toast.success('Lien copié');
    else toast.error('Impossible de copier le lien');
  }
}
