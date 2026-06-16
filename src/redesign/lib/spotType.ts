/**
 * Normalisation du `type` de spot. La base contient des valeurs héritées/sales
 * (`dif`, `falaise`, …) en plus de l'énum propre `crag|boulder|indoor|shop` du schéma.
 * Tous les écrans redesign passent par ici pour que libellés/couleurs/filtres soient corrects.
 */
export type SpotType = 'crag' | 'boulder' | 'indoor' | 'shop';

export function normalizeSpotType(raw?: string | null): SpotType {
  const t = (raw ?? '').toLowerCase().trim();
  if (t === 'boulder' || t === 'bloc') return 'boulder';
  if (t === 'indoor' || t === 'salle' || t === 'gym') return 'indoor';
  if (t === 'shop' || t === 'magasin' || t === 'store') return 'shop';
  // falaise, dif, diff, crag, voie, sport… → crag (escalade sur paroi)
  return 'crag';
}

export const SPOT_TYPE_LABEL: Record<SpotType, string> = {
  crag: 'Falaise', boulder: 'Bloc', indoor: 'Salle', shop: 'Magasin',
};
