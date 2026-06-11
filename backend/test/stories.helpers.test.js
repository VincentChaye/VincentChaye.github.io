import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canViewStories,
  computePurgeAt,
  STORY_TTL_MS,
  PURGE_DELAY_MS,
} from "../src/stories.helpers.js";

test("constantes : 24h et 30 jours", () => {
  assert.equal(STORY_TTL_MS, 24 * 3600 * 1000);
  assert.equal(PURGE_DELAY_MS, 30 * 24 * 3600 * 1000);
});

test("soi-même voit toujours ses stories", () => {
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: true, isFriend: false, isFollower: false }), true);
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: true, isFriend: false, isFollower: false }), true);
});

test("profil privé : seuls les amis voient", () => {
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: false, isFriend: true, isFollower: false }), true);
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: false, isFriend: false, isFollower: true }), false);
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: false, isFriend: false, isFollower: false }), false);
});

test("profil public : amis et followers voient", () => {
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: false, isFriend: true, isFollower: false }), true);
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: false, isFriend: false, isFollower: true }), true);
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: false, isFriend: false, isFollower: false }), false);
});

test("computePurgeAt : +30j si non mise à la une, null sinon", () => {
  const created = new Date("2026-06-12T10:00:00Z");
  assert.deepEqual(computePurgeAt(created, false), new Date(created.getTime() + PURGE_DELAY_MS));
  assert.equal(computePurgeAt(created, true), null);
});
