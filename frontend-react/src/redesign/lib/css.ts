import type { CSSProperties } from 'react';

/**
 * Convertit une chaîne CSS inline ("prop:val;prop:val") en objet `CSSProperties`.
 *
 * But : copier VERBATIM les `style="..."` du prototype HTML Liquid Glass v2 dans les
 * composants TSX, sans erreur de transcription manuelle (camelCase, préfixes vendeur…).
 * « sans changer le visuel » = fidélité maximale.
 *
 * Détails gérés :
 *  - `-webkit-/-moz-/-o-` → `Webkit/Moz/O...` (capitalisé) ; `-ms-` → `ms...` (minuscule, cf React)
 *  - propriétés custom `--x` conservées telles quelles
 *  - valeurs (incl. `url(...)`, gradients avec `;`-free) conservées telles quelles
 */
export function css(text: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of splitDeclarations(text)) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    out[toCamel(prop)] = value;
  }
  return out as CSSProperties;
}

/** Découpe sur `;` en ignorant ceux à l'intérieur de parenthèses (ex: url(), gradients). */
function splitDeclarations(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

function toCamel(prop: string): string {
  if (prop.startsWith('--')) return prop; // propriété custom : telle quelle
  const vendor = /^-(webkit|moz|ms|o)-/i.exec(prop);
  let p = prop.replace(/^-/, '');
  p = p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  if (vendor && vendor[1].toLowerCase() !== 'ms') {
    p = p.charAt(0).toUpperCase() + p.slice(1);
  }
  return p;
}
