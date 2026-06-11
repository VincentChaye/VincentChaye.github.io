export const STORY_TTL_MS = 24 * 3600 * 1000;
export const PURGE_DELAY_MS = 30 * 24 * 3600 * 1000;

/**
 * Règle de visibilité des stories d'un auteur.
 * Profil privé → amis uniquement ; profil public → amis + followers.
 */
export function canViewStories({ isPrivate }, { isSelf, isFriend, isFollower }) {
  if (isSelf) return true;
  if (isPrivate) return !!isFriend;
  return !!isFriend || !!isFollower;
}

/** Date de purge auto : +30j, ou null si la story est dans un highlight (jamais purgée). */
export function computePurgeAt(createdAt, highlighted) {
  return highlighted ? null : new Date(createdAt.getTime() + PURGE_DELAY_MS);
}
