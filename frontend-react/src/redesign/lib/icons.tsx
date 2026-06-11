import type { SVGProps, ReactNode } from 'react';

/**
 * Icônes = SVG inline copiés VERBATIM du prototype Liquid Glass v2 (mêmes `viewBox`,
 * `d`, `stroke-width`). NE PAS remapper vers lucide-react (risque de dérive de tracé).
 * Chaque icône accepte width/height/strokeWidth/stroke pour les variations de taille du proto.
 */
export type IconProps = SVGProps<SVGSVGElement>;

function Icon({ viewBox = '0 0 24 24', children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={2} {...rest}>
      {children}
    </svg>
  );
}

/* ── Chrome / navigation ── */
export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Icon>
);

export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </Icon>
);

export const ActivityIcon = (p: IconProps) => (
  <Icon {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Icon>
);

export const MessageSquareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </Icon>
);

export const BackChevronIcon = (p: IconProps) => (
  <Icon viewBox="0 0 9 15" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="8,1 1,7.5 8,14" />
  </Icon>
);

/* ── Contenu ── */
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </Icon>
);

export const FilterLinesIcon = (p: IconProps) => (
  <Icon strokeWidth={2.5} {...p}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </Icon>
);

export const MapPinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const BookOpenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon strokeWidth={2.5} {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </Icon>
);

export const BookmarkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Icon>
);

export const Share2Icon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Icon>
);

export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Icon>
);

export const ShareUploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </Icon>
);

/** Téléchargement hors-ligne : flèche vers le bas dans un plateau (cf. share tray inversé) */
export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <polyline points="8 12 12 16 16 12" />
    <line x1="12" y1="4" x2="12" y2="16" />
  </Icon>
);
