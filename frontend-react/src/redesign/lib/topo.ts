import type { TopoPoint } from '@/types';

/** Couleurs des deux chaînes du topo (prises mains / pieds). */
export const TOPO_COLORS: Record<TopoPoint['color'], { stroke: string; fill: string; label: string }> = {
  hand: { stroke: '#E8B84B', fill: 'rgba(232,184,75,.92)', label: 'Mains' },
  foot: { stroke: '#5BB8E8', fill: 'rgba(91,184,232,.92)', label: 'Pieds' },
};
