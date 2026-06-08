import { useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Primitives glass partagées du design Liquid Glass v2.
 * Reproduisent les classes utilitaires abrégées du prototype (`.g`, `.ib`, `.tag`, `.sh`, `.stars`).
 * Le visuel vient du CSS (redesign/styles/liquid-glass.css) ; ici on ne fait qu'appliquer les classes.
 */

/** `.g` — surface glass de base (bg + blur + bord + ombre + liserés ::before/::after). */
export function GlassCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('g', className)} {...rest}>
      {children}
    </div>
  );
}

/** `.ib` — pastille glass ronde pour bouton-icône (navbar / actions). */
export function IconButton({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ib', className)} {...rest}>
      {children}
    </div>
  );
}

export type TagVariant = 'a' | 'g' | 'b' | 'r';

/** `.tag` (+ `.tag-a/g/b/r`) — étiquette texte fine. */
export function Tag({
  variant,
  className,
  children,
  ...rest
}: { variant?: TagVariant } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('tag', variant && `tag-${variant}`, className)} {...rest}>
      {children}
    </span>
  );
}

/** `.sh` / `.sh-sm` — titre de section. */
export function SectionHeader({
  small,
  className,
  children,
  ...rest
}: { small?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(small ? 'sh-sm' : 'sh', className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * `.stars` — note Google-style : 4 étoiles pleines + 1 demie (motif 4.8 du prototype).
 * `id` du dégradé rendu unique via useId (évite les ids dupliqués des instances multiples).
 */
const STAR_POINTS =
  '12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26';

export function Stars({ size = 11 }: { size?: number }): ReactNode {
  const gid = useId();
  return (
    <span className="stars">
      {[0, 1, 2, 3].map((i) => (
        <svg key={i} className="star-svg" width={size} height={size} viewBox="0 0 24 24">
          <polygon points={STAR_POINTS} fill="#FBBC04" stroke="none" />
        </svg>
      ))}
      <svg className="star-svg" width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id={gid}>
            <stop offset="50%" stopColor="#FBBC04" />
            <stop offset="50%" stopColor="rgba(255,255,255,.15)" />
          </linearGradient>
        </defs>
        <polygon points={STAR_POINTS} fill={`url(#${gid})`} stroke="none" />
      </svg>
    </span>
  );
}
