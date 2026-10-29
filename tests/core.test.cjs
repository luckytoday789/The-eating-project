const { strict: assert } = require('node:assert');
require('../core.js');
const C = globalThis.JournalCore;
assert.equal(C.isDate('2026-02-30'), false);
assert.equal(C.isDate('2024-02-29'), true);
assert.equal(C.isDate('2026-02-29'), false);
assert.equal(C.addDays('2026-01-01', -1), '2025-12-31');
assert.equal(C.addDays('2024-02-28', 1), '2024-02-29');
const base = C.emptyStore();
const day = C.emptyDay();
day.weight = 55.2;
day.meals.push({ id: 'm1', type: 'lunch', content: '饭 <script>', portion: '一碗', time: '12:30', updatedAt: '2026-10-29T04:30:00.000Z' });
day.activities.push({ id: 'a1', type: 'walk', minutes: 30, distance: null, intensity: 'easy', note: '', updatedAt: '2026-10-29T05:00:00.000Z' });
base.days['2026-10-29'] = day;
assert.equal(C.validateStore(JSON.parse(JSON.stringify(base))).days['2026-10-29'].weight, 55.2);
const stats = C.stats(base, '2026-10-29', 7);
assert.equal(stats.days, 1);
assert.equal(stats.minutes, 30);
assert.equal(stats.meals, 1);
assert.equal(C.stats(base, '2026-10-28', 7).days, 0);
const backup = JSON.parse(JSON.stringify(base));
backup.days['2026-10-29'].weight = 60;
backup.days['2026-10-29'].meals[0].content = 'updated';
backup.days['2026-10-29'].meals[0].updatedAt = '2026-10-29T06:00:00.000Z';
backup.days['2026-10-28'] = { ...C.emptyDay(), weight: 55.4 };
const merged = C.mergeStores(base, backup);
assert.equal(merged.days['2026-10-29'].weight, 55.2);
assert.equal(merged.days['2026-10-29'].meals[0].content, 'updated');
assert.equal(merged.days['2026-10-29'].meals.length, 1);
assert.equal(merged.days['2026-10-28'].weight, 55.4);
assert.deepEqual(C.mergeStores(merged, backup), merged);
// Imported timestamps with offsets must be compared as instants, not raw text.
const olderOffset = JSON.parse(JSON.stringify(base));
olderOffset.days['2026-10-29'].meals[0].content = 'older offset record';
olderOffset.days['2026-10-29'].meals[0].updatedAt = '2026-10-29T11:00:00+08:00';
assert.equal(C.mergeStores(base, olderOffset).days['2026-10-29'].meals[0].content, '饭 <script>');
const newerOffset = JSON.parse(JSON.stringify(base));
newerOffset.days['2026-10-29'].meals[0].content = 'newer offset record';
newerOffset.days['2026-10-29'].meals[0].updatedAt = '2026-10-29T01:00:00-08:00';
assert.equal(C.mergeStores(base, newerOffset).days['2026-10-29'].meals[0].content, 'newer offset record');
assert.equal(C.validateStore(newerOffset).days['2026-10-29'].meals[0].updatedAt, '2026-10-29T09:00:00.000Z');
for (const mutate of [
  value => value.version = 2,
  value => value.days['2026-10-29'].weight = NaN,
  value => value.days['2026-10-29'].meals[0].type = 'unknown',
  value => value.days['2026-10-29'].meals[0].time = '25:01',
  value => value.days['2026-10-29'].activities[0].minutes = -5,
  value => value.days['2026-10-29'].activities[0].minutes = 1.5,
  value => value.days['2026-10-29'].meals.push(value.days['2026-10-29'].meals[0]),
]) {
  const invalid = JSON.parse(JSON.stringify(base)); mutate(invalid);
  assert.throws(() => C.validateStore(invalid));
}
assert.deepEqual(C.validateStore({ version: 1, days: { '2026-10-29': C.emptyDay() } }).days, {});
// Pre-feature exports must remain readable, without altering their daily records.
const legacy = { version: 1, days: { '2026-10-29': day } };
const migrated = C.validateStore(legacy);
assert.deepEqual(migrated.preferences, { allergens: [], avoid: [] });
assert.deepEqual(migrated.favorites, []);
assert.deepEqual(migrated.days, C.validateStore(base).days);

const personalized = JSON.parse(JSON.stringify(base));
personalized.preferences = { allergens: [' 牛奶 ', '牛奶'], avoid: ['香菜'] };
personalized.favorites = [
  { type: 'lunch', content: '番茄鸡蛋面', portion: '一碗', updatedAt: '2026-10-29T10:00:00+08:00' },
  { type: 'lunch', content: ' 番茄鸡蛋面 ', portion: '一碗', updatedAt: '2026-10-29T10:01:00+08:00' },
];
const cleanPersonalized = C.validateStore(personalized);
assert.deepEqual(cleanPersonalized.preferences, { allergens: ['牛奶'], avoid: ['香菜'] });
assert.equal(cleanPersonalized.favorites.length, 1);
assert.equal(cleanPersonalized.favorites[0].updatedAt, '2026-10-29T02:00:00.000Z');
assert.deepEqual(C.validateStore(JSON.parse(JSON.stringify(cleanPersonalized))), cleanPersonalized);
assert.equal(C.favoriteKey({ type: 'lunch', content: ' Rice ', portion: 'One Bowl' }), C.favoriteKey({ type: 'lunch', content: 'rice', portion: 'one bowl' }));

const importedPersonalized = C.emptyStore();
importedPersonalized.preferences = { allergens: ['牛奶', '花生'], avoid: [' 香菜 ', '芹菜'] };
importedPersonalized.favorites = [
  { type: 'lunch', content: '番茄鸡蛋面', portion: '一碗', updatedAt: '2026-10-29T20:00:00Z' },
  { type: 'dinner', content: '菌菇面', portion: '', updatedAt: '2026-10-29T20:00:00Z' },
];
const mergedPersonalized = C.mergeStores(cleanPersonalized, importedPersonalized);
assert.deepEqual(mergedPersonalized.preferences, { allergens: ['牛奶', '花生'], avoid: ['香菜', '芹菜'] });
assert.equal(mergedPersonalized.favorites.length, 2);
assert.equal(mergedPersonalized.favorites[0].updatedAt, cleanPersonalized.favorites[0].updatedAt);
assert.deepEqual(C.mergeStores(mergedPersonalized, importedPersonalized), mergedPersonalized);
const full = C.emptyStore();
full.preferences.allergens = Array.from({ length: 30 }, (_, i) => `过敏词${i}`);
full.favorites = Array.from({ length: 40 }, (_, i) => ({ type: 'lunch', content: `常吃${i}`, portion: '', updatedAt: '' }));
const extra = C.emptyStore();
extra.preferences.allergens = ['新词'];
extra.favorites = [{ type: 'dinner', content: '新餐食', portion: '', updatedAt: '' }];
assert.deepEqual(C.mergeStores(full, extra).preferences.allergens, full.preferences.allergens);
assert.deepEqual(C.mergeStores(full, extra).favorites, full.favorites);
const removedFavorite = JSON.parse(JSON.stringify(mergedPersonalized));
removedFavorite.favorites = removedFavorite.favorites.filter(item => C.favoriteKey(item) !== C.favoriteKey({ type: 'dinner', content: '菌菇面', portion: '' }));
assert.equal(C.validateStore(removedFavorite).favorites.length, 1);

for (const mutate of [
  data => data.preferences = null,
  data => data.preferences.allergens = '牛奶',
  data => data.preferences.allergens = [' '],
  data => data.preferences.avoid = ['a'.repeat(41)],
  data => data.preferences.avoid = Array.from({ length: 31 }, (_, i) => `词${i}`),
  data => data.favorites = {},
  data => data.favorites = Array.from({ length: 41 }, (_, i) => ({ type: 'lunch', content: `餐食${i}`, portion: '' })),
  data => data.favorites = [{ type: 'unknown', content: '面', portion: '' }],
  data => data.favorites = [{ type: 'lunch', content: ' ', portion: '' }],
  data => data.favorites = [{ type: 'lunch', content: '面', portion: '', updatedAt: 'not a timestamp' }],
]) {
  const invalid = JSON.parse(JSON.stringify(base)); mutate(invalid);
  assert.throws(() => C.validateStore(invalid));
}
console.log('Data checks passed: dates, round-trip, preferences, favorites, bounded validation and idempotent merges.');
