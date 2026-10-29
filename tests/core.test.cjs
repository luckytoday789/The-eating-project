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
for (const mutate of [
  value => value.version = 2,
  value => value.days['2026-10-29'].weight = NaN,
  value => value.days['2026-10-29'].meals[0].type = 'unknown',
  value => value.days['2026-10-29'].meals[0].time = '25:01',
  value => value.days['2026-10-29'].activities[0].minutes = -5,
  value => value.days['2026-10-29'].meals.push(value.days['2026-10-29'].meals[0]),
]) {
  const invalid = JSON.parse(JSON.stringify(base)); mutate(invalid);
  assert.throws(() => C.validateStore(invalid));
}
assert.deepEqual(C.validateStore({ version: 1, days: { '2026-10-29': C.emptyDay() } }).days, {});
console.log('Data checks passed: dates, round-trip, range stats, idempotent merges, validation and duplicate IDs.');
