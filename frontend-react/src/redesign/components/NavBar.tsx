import type { CSSProperties, ReactNode } from 'react';

/**
 * Coque de navbar sticky (`.nb` + `.nbb`). Chaque écran fournit son contenu interne
 * (le proto a des navbars très différentes selon l'écran : bell seul, back-btn + actions…).
 */
export function NavBar({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return (
    <nav className="nb" style={style}>
      <div className="nbb" />
      {children}
    </nav>
  );
}
