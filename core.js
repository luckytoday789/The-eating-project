/* Data-only helpers, shared by the app and its durability checks. */
(function (root) {
  "use strict";
  const VERSION = 1;
  const MEALS = ["breakfast", "lunch", "dinner", "snack"];
  const ACTIVITIES = ["walk", "run", "cycle", "strength", "yoga", "other"];
  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function isDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && localDate(date) === value && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
  }
  function addDays(day, amount) {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return localDate(date);
  }
  function emptyDay() { return { weight: null, meals: [], activities: [], note: "", updatedAt: "" }; }
  function emptyStore() { return { version: VERSION, days: {} }; }
  function hasData(day) { return day && (day.weight !== null || day.meals.length > 0 || day.activities.length > 0 || day.note.trim().length > 0); }
  function text(value, label, max = 500, required = false) {
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error(`${label}格式不正确`);
    return value.trim();
  }
  function number(value, label, min, max) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}超出允许范围`);
    return value;
  }
  function stamp(value) {
    if (typeof value !== "string" || value.length > 40 || (value && !Number.isFinite(Date.parse(value)))) throw new Error("记录时间格式不正确");
    return value;
  }
  function validateStore(input) {
    if (!input || typeof input !== "object" || input.version !== VERSION || !input.days || typeof input.days !== "object" || Array.isArray(input.days)) throw new Error("请选择由日常有迹导出的 JSON 备份");
    const result = emptyStore();
    const entries = Object.entries(input.days);
    if (entries.length > 36600) throw new Error("备份包含的日期过多");
    for (const [date, day] of entries) {
      if (!isDate(date) || !day || typeof day !== "object" || !Array.isArray(day.meals) || !Array.isArray(day.activities)) throw new Error("备份中的日期或记录格式不正确");
      if (day.meals.length > 200 || day.activities.length > 200) throw new Error("单日记录数量过多");
      const ids = new Set();
      function id(value) {
        const valid = text(value, "记录编号", 100, true);
        if (ids.has(valid)) throw new Error("备份中存在重复的记录编号");
        ids.add(valid); return valid;
      }
      const clean = {
        weight: day.weight === null ? null : number(day.weight, "体重", 1, 500),
        note: text(day.note ?? "", "当日备注", 1000),
        updatedAt: stamp(day.updatedAt ?? ""),
        meals: day.meals.map((meal) => {
          if (!meal || !MEALS.includes(meal.type)) throw new Error("饮食类型不正确");
          if (typeof meal.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time)) throw new Error("用餐时间不正确");
          return { id: id(meal.id), type: meal.type, content: text(meal.content, "饮食内容", 500, true), portion: text(meal.portion ?? "", "分量", 100), time: meal.time, updatedAt: stamp(meal.updatedAt ?? "") };
        }),
        activities: day.activities.map((activity) => {
          if (!activity || !ACTIVITIES.includes(activity.type) || !["easy", "moderate", "hard"].includes(activity.intensity)) throw new Error("运动类型或强度不正确");
          return { id: id(activity.id), type: activity.type, minutes: number(activity.minutes, "运动时长", 1, 1440), distance: activity.distance === null || activity.distance === undefined ? null : number(activity.distance, "运动距离", 0.01, 999), intensity: activity.intensity, note: text(activity.note ?? "", "运动备注", 500), updatedAt: stamp(activity.updatedAt ?? "") };
        }),
      };
      if (hasData(clean)) result.days[date] = clean;
    }
    return result;
  }
  function mergeStores(current, incoming) {
    const merged = validateStore(current);
    const clean = validateStore(incoming);
    for (const [date, added] of Object.entries(clean.days)) {
      if (!merged.days[date]) { merged.days[date] = added; continue; }
      const existing = merged.days[date];
      for (const key of ["meals", "activities"]) {
        const items = new Map(existing[key].map((item) => [item.id, item]));
        for (const item of added[key]) {
          const previous = items.get(item.id);
          if (!previous || item.updatedAt > previous.updatedAt) items.set(item.id, item);
        }
        existing[key] = [...items.values()];
      }
      // Preserve values already on this device; imports only fill blank daily fields.
      if (existing.weight === null) existing.weight = added.weight;
      if (!existing.note) existing.note = added.note;
      existing.updatedAt = [existing.updatedAt, added.updatedAt].sort().at(-1);
    }
    return validateStore(merged);
  }
  function stats(store, end, length) {
    const start = addDays(end, 1 - length);
    const entries = Object.entries(store.days).filter(([date]) => date >= start && date <= end).sort(([a], [b]) => a.localeCompare(b));
    const weights = entries.filter(([, day]) => day.weight !== null).map(([date, day]) => ({ date, value: day.weight }));
    return {
      start, end, entries, weights,
      days: entries.filter(([, day]) => hasData(day)).length,
      meals: entries.reduce((sum, [, day]) => sum + day.meals.length, 0),
      minutes: entries.reduce((sum, [, day]) => sum + day.activities.reduce((n, item) => n + item.minutes, 0), 0),
      sessions: entries.reduce((sum, [, day]) => sum + day.activities.length, 0),
    };
  }
  root.JournalCore = Object.freeze({ VERSION, MEALS, ACTIVITIES, localDate, isDate, addDays, emptyDay, emptyStore, hasData, validateStore, mergeStores, stats });
})(globalThis);
