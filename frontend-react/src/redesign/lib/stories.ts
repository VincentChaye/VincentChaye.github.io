import { apiFetch } from '@/lib/api';

export interface Story {
  _id: string;
  userId: string;
  media: { url: string; type: 'image' | 'video'; mimeType?: string };
  caption: string | null;
  spotId: string | null;
  spotName: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  myReaction: string | null;
  // présents uniquement pour l'auteur
  viewCount?: number;
  reactionCount?: number;
  highlighted?: boolean;
}

export interface StoryGroup {
  user: { uid: string; username: string | null; displayName: string | null; avatarUrl: string | null; isSelf: boolean };
  stories: Story[];
  allSeen: boolean;
}

export interface StoryViewEntry {
  uid: string;
  at: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  emoji: string | null;
}

export interface Highlight {
  _id: string;
  name: string;
  coverUrl: string | null;
  storyCount: number;
  stories: Story[];
}

export function fetchStoriesFeed(): Promise<{ groups: StoryGroup[] }> {
  return apiFetch('/api/stories/feed', { auth: true });
}

export function fetchUserStories(uid: string, archive = false): Promise<{ stories: Story[] }> {
  return apiFetch(`/api/stories/user/${uid}${archive ? '?archive=1' : ''}`, { auth: true });
}

export function createStory(file: File, caption: string, spotId: string | null): Promise<Story> {
  const fd = new FormData();
  fd.append('media', file);
  if (caption.trim()) fd.append('caption', caption.trim());
  if (spotId) fd.append('spotId', spotId);
  return apiFetch('/api/stories', { method: 'POST', body: fd, auth: true });
}

export function markStoryViewed(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/${id}/view`, { method: 'POST', auth: true });
}

export function fetchStoryViews(id: string): Promise<{ views: StoryViewEntry[] }> {
  return apiFetch(`/api/stories/${id}/views`, { auth: true });
}

export function reactToStory(id: string, emoji: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/${id}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
    auth: true,
  });
}

export function deleteStory(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/${id}`, { method: 'DELETE', auth: true });
}

export function fetchHighlights(uid: string): Promise<{ locked: boolean; highlights: Highlight[] }> {
  return apiFetch(`/api/stories/highlights/${uid}`, { auth: true });
}

export function createHighlight(name: string, storyIds: string[], coverUrl?: string): Promise<Highlight> {
  return apiFetch('/api/stories/highlights', {
    method: 'POST',
    body: JSON.stringify({ name, storyIds, ...(coverUrl ? { coverUrl } : {}) }),
    auth: true,
  });
}

export function deleteHighlight(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/highlights/${id}`, { method: 'DELETE', auth: true });
}
