(function () {
  "use strict";
  const C = window.JournalCore;
  const STORAGE_KEY = "daily-traces:v1";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m10 6 6 6-6 6"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    shield: '<path d="m12 3 8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    journal: '<rect x="5" y="3" width="15" height="18" rx="3"/><path d="M9 3v18M2 7h5M2 12h5M2 17h5m6-10h4m-4 4h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
    chart: '<path d="M4 3v17h17M8 14l4-5 4 3 5-7"/>',
    bowl: '<path d="M3 11h18c0 6-4 10-9 10S3 17 3 11Zm4-4c-2-3 2-3 0-5m5 5c-2-3 2-3 0-5m5 5c-2-3 2-3 0-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    lunch: '<path d="M3 14h18M5 14a7 7 0 0 1 14 0M12 5V3m-3 0h6M4 18h16"/>',
    moon: '<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z"/>',
    snack: '<path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 1 1 0 6h-2M8 4V2m5 2V2"/>',
    scale: '<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M8 8a6 6 0 0 1 8 0m-4-1 2 3"/>',
    move: '<path d="m3 16 5-4 4 2 2-8 4 3h3M8 12l-2-5 4-4 5 3m-4 8 5 6m-8-5-4 6"/><circle cx="17" cy="3" r="1.5"/>',
    leaf: '<path d="M5 20c0-9 4-16 15-16 0 12-5 17-12 13M5 20 16 9"/>',
    edit: '<path d="m14 5 5 5M4 20l5-1L21 7l-4-4L5 15l-1 5Z"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3m-10 0 1 15h12l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    note: '<path d="M13 3H5v18h14v-9m-10 0 9-9 3 3-9 9-4 1 1-4Z"/>',
    cycle: '<circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 5-9 5 9H5m5-9h6l3 9M8 4h4m3-1h3l2 3"/>',
    strength: '<path d="m6 8 10 10M3 7l4-4m-5 9 10-10m0 20 10-10m-5 9 4-4"/>',
    yoga: '<circle cx="12" cy="4" r="2"/><path d="M8 9h8m-4-3v9m-5 5 5-5 5 5M4 13l4-4m8 0 4 4M4 20h16"/>',
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.move}</svg>`;
  const mealTypes = { breakfast: ["早餐", "BREAKFAST", "sun"], lunch: ["午餐", "LUNCH", "lunch"], dinner: ["晚餐", "DINNER", "moon"], snack: ["加餐", "SNACK", "snack"] };
  const activityTypes = { walk: ["散步 / 快走", "move"], run: ["跑步", "move"], cycle: ["骑行", "cycle"], strength: ["力量训练", "strength"], yoga: ["瑜伽 / 拉伸", "yoga"], other: ["其他运动", "move"] };
  const intensities = { easy: "轻松", moderate: "适中", hard: "较累" };
  const today = () => C.localDate();
  const main = $("#main");
  const dialog = $("#editor");
  const state = { store: C.emptyStore(), demo: null, date: today(), view: "today", range: 30, month: today().slice(0, 7), storageError: "", pendingImport: null };
  let toastTimer;

  function readStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? C.emptyStore() : C.validateStore(JSON.parse(raw));
  }
  try { state.store = readStorage(); } catch (error) {
    state.storageError = "无法读取记录，现有数据未被覆盖。请导出原始备份并检查存储权限。";
  }
  const store = () => state.demo ?? state.store;
  const day = () => store().days[state.date] ?? C.emptyDay();
  function hydrateIcons() { document.querySelectorAll("[data-icon]").forEach((element) => { element.innerHTML = icon(element.dataset.icon); element.removeAttribute("data-icon"); }); }
  function dateLabel(date, weekday = false) {
    return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", ...(weekday ? { weekday: "long" } : {}) }).format(new Date(`${date}T12:00:00`));
  }
  const pretty = (value) => Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  const uid = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const now = () => new Date().toISOString();
  function toast(message, error = false) {
    const element = $("#toast");
    clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.toggle("error", error);
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, error ? 6500 : 3000);
  }
  function persist(next) {
    try {
      const clean = C.validateStore(next);
      if (state.demo) state.demo = clean;
      else { localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); state.store = clean; }
      return true;
    } catch (error) {
      toast("保存失败：存储已满或不可用。请先备份，再检查存储权限。", true);
      return false;
    }
  }
  function changeDay(change, message = "已保存") {
    if (state.storageError && !state.demo) { toast("请先在「数据与备份」中处理存储问题。", true); return false; }
    let next;
    try { next = state.demo ? clone(state.demo) : readStorage(); }
    catch { toast("无法读取现有记录，本次未保存。", true); return false; }
    const record = next.days[state.date] ?? C.emptyDay();
    change(record);
    record.updatedAt = now();
    if (C.hasData(record)) next.days[state.date] = record;
    else delete next.days[state.date];
    if (!persist(next)) return false;
    dialog.close();
    render();
    toast(state.demo ? "示例已更新" : message);
    return true;
  }
  function heroArt() {
    return `<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 300 205"><ellipse cx="162" cy="181" rx="116" ry="16" fill="#dce5cb"/><path d="M191 167c-18-32-16-70 7-101" fill="none" stroke="#79916a" stroke-width="3"/><path d="M192 123c-30-1-42-17-46-35 25-2 42 11 46 35Z" fill="#a4bb8c"/><path d="M188 100c-3-28 7-47 26-56 11 23 2 45-26 56Z" fill="#7f9d6e"/><path d="M194 146c24-23 47-22 62-12-13 22-34 29-62 12Z" fill="#b2c49b"/><path d="M172 151h39l-6 35h-27Z" fill="#f7f9ee"/><path d="M78 119h99c0 37-20 62-49 62s-50-25-50-62Z" fill="#6a8562"/><ellipse cx="127" cy="119" rx="49" ry="15" fill="#829d72"/><ellipse cx="127" cy="116" rx="37" ry="11" fill="#e0e9c5"/><path d="M105 106c-12-16 4-20-2-34m26 31c-12-16 5-20-1-34" fill="none" stroke="#f9fcf1" stroke-width="4" stroke-linecap="round"/><circle cx="71" cy="159" r="19" fill="#e3af89"/><path d="M71 140c-3-9 3-13 10-14" fill="none" stroke="#78946a" stroke-width="3"/><circle cx="236" cy="70" r="3" fill="#afbc99"/><path d="M58 70h8m-4-4v8m167 29h6m-3-3v6" stroke="#b0bd9b" stroke-width="2" stroke-linecap="round"/></svg></div>`;
  }
  function header(title, subtitle, eyebrow, actions = "", extraClass = "") {
    return `<section class="intro ${extraClass}"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="intro-actions">${actions}</div>` : ""}</section>`;
  }
  function render() {
    const view = location.hash.slice(1);
    state.view = ["today", "trends", "history"].includes(view) ? view : "today";
    document.querySelectorAll("[data-view]").forEach((element) => {
      const active = element.dataset.view === state.view;
      element.classList.toggle("active", active);
      if (active) element.setAttribute("aria-current", "page"); else element.removeAttribute("aria-current");
    });
    $("#demo-banner").hidden = !state.demo;
    const warning = state.storageError ? `<div class="storage-warning" role="alert">${esc(state.storageError)} <button data-action="raw-backup">导出原始备份</button></div>` : "";
    main.innerHTML = warning + (state.view === "trends" ? renderTrends() : state.view === "history" ? renderHistory() : renderToday());
    hydrateIcons();
  }
  function weekStrip() {
    const mondayOffset = (new Date(`${state.date}T12:00:00`).getDay() + 6) % 7;
    const start = C.addDays(state.date, -mondayOffset);
    return `<div class="week-strip" aria-label="本周日期">${Array.from({ length: 7 }, (_, index) => {
      const date = C.addDays(start, index);
      return `<button class="day-button${date === state.date ? " active" : ""}${date === today() ? " is-today" : ""}" type="button" data-date="${date}" aria-label="${esc(dateLabel(date, true))}${C.hasData(store().days[date]) ? "，有记录" : "，暂无记录"}" aria-pressed="${date === state.date}" ${date > today() ? "disabled" : ""}><small>周${"一二三四五六日"[index]}</small><b>${Number(date.slice(-2))}</b>${C.hasData(store().days[date]) ? "<i></i>" : ""}</button>`;
    }).join("")}</div>`;
  }
  function renderToday() {
    const record = day();
    const week = C.stats(store(), state.date, 7);
    const minutes = record.activities.reduce((total, item) => total + item.minutes, 0);
    const actions = `${state.demo ? "" : `<button class="text-button" data-action="demo">看看示例${icon("arrow")}</button>`}<div class="quick-actions" aria-label="快捷记录"><button class="button primary" data-action="add-meal">${icon("plus")}饮食</button><button class="button" data-action="weight">${icon("scale")}体重</button><button class="button" data-action="add-activity">${icon("move")}运动</button></div>`;
    return header('日常<em>记录</em>', "饮食、体重、运动，一处记录。", "SMALL MOMENTS, EVERY DAY", actions) + `
      <section class="hero"><div class="hero-copy"><h2>${dateLabel(state.date, true)}${state.date === today() ? '<span class="hero-today">今天</span>' : ''}</h2><div class="hero-stats"><div class="hero-metric"><span>饮食记录</span><b>${record.meals.length}<small>条</small></b></div><div class="hero-metric"><span>运动时长</span><b>${pretty(minutes)}<small>分钟</small></b></div><div class="hero-metric"><span>体重</span><b>${record.weight === null ? '—' : pretty(record.weight)}<small>kg</small></b></div></div></div>${heroArt()}</section>
      <div class="date-toolbar"><div class="date-control"><button class="icon-button" data-action="prev-day" aria-label="前一天">${icon("left")}</button><label class="date-input-wrap">${icon("calendar")}<input class="date-input" id="selected-date" type="date" value="${state.date}" min="1900-01-01" max="${today()}" aria-label="选择记录日期"></label><button class="icon-button" data-action="next-day" aria-label="后一天" ${state.date >= today() ? "disabled" : ""}>${icon("right")}</button><button class="today-tag" data-action="today">今天</button></div><span class="local-note">${icon("shield")}${state.demo ? "示例数据" : "仅保存在此浏览器"}</span></div>
      ${weekStrip()}
      <div class="dashboard"><div class="column"><section class="panel meals-panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon">${icon("bowl")}</span><div><h2>饮食记录</h2><p>三餐与加餐</p></div></div><span class="local-note">${record.meals.length} 条记录</span></div>${renderMeals(record)}<div class="panel-footnote">${icon("leaf")}支持补记、编辑与删除</div></section><section class="panel note-panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon">${icon("note")}</span><div><h2>当日备注</h2><p></p></div></div><button class="tiny-button" data-action="note" aria-label="编辑当日备注">${icon("edit")}</button></div>${record.note ? `<p class="daily-note">${esc(record.note)}</p>` : '<p class="empty-note">点击右上角添加备注</p>'}</section></div>
      <div class="column">${renderWeight(record)}<section class="panel activity-panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon orange">${icon("move")}</span><div><h2>运动记录</h2><p></p></div></div><button class="round-add" data-action="add-activity" aria-label="记录运动">${icon("plus")}</button></div><div class="activity-summary"><strong>${pretty(minutes)}</strong><span>分钟 · ${record.activities.length} 次活动</span></div>${record.activities.length ? record.activities.map(activityEntry).join("") : `<div class="activity-empty"><span class="section-icon orange">${icon("move")}</span><p>暂无运动记录<br>点击下方添加</p></div>`}<button class="text-button" data-action="add-activity" style="margin-top:16px">${icon("plus")}添加运动</button></section></div></div>
      <div class="section-label">最近 7 天 · 截至 ${dateLabel(state.date)}</div><section class="week-overview" aria-label="最近七天统计">${summaryCard(icon("journal"), week.days, "天", "记录天数")}${summaryCard(icon("bowl"), week.meals, "条", "用餐记录")}${summaryCard(icon("move"), pretty(week.minutes), "分钟", "累计运动时长")}</section>`;
  }
  function summaryCard(symbol, value, unit, label) {
    return `<div class="overview-card"><span class="section-icon">${symbol}</span><div><b>${value}<small>${unit}</small></b><p>${label}</p></div></div>`;
  }
  function renderMeals(record) {
    return Object.entries(mealTypes).map(([type, [name, english, symbol]]) => {
      const entries = record.meals.filter((meal) => meal.type === type).sort((a, b) => a.time.localeCompare(b.time));
      return `<div class="meal-section"><span class="meal-badge ${type}">${icon(symbol)}</span><div><div class="meal-heading"><h3>${name}<small>${english}</small></h3><button class="meal-add" data-action="add-meal" data-type="${type}" aria-label="添加${name}">${icon("plus")}记一笔</button></div>${entries.length ? entries.map((meal) => `<article class="meal-entry"><div class="entry-content"><p class="entry-title">${esc(meal.content)}</p><div class="entry-meta"><span>${esc(meal.time)}</span>${meal.portion ? `<span>${esc(meal.portion)}</span>` : ""}</div></div><div class="entry-actions"><button class="tiny-button" data-action="edit-meal" data-id="${esc(meal.id)}" aria-label="编辑${esc(name)}：${esc(meal.content)}">${icon("edit")}</button><button class="tiny-button" data-action="delete-meal" data-id="${esc(meal.id)}" aria-label="删除${esc(name)}：${esc(meal.content)}">${icon("trash")}</button></div></article>`).join("") : `<button class="meal-empty" data-action="add-meal" data-type="${type}">${type === "snack" ? "点击添加加餐" : `点击添加${name}`}</button>`}</div></div>`;
    }).join("");
  }
  function renderWeight(record) {
    const previous = Object.entries(store().days).filter(([date, entry]) => date < state.date && entry.weight !== null).sort(([a], [b]) => b.localeCompare(a))[0];
    const difference = record.weight !== null && previous ? record.weight - previous[1].weight : null;
    const comparison = record.weight === null ? "尚未记录" : difference === null ? "首次记录" : `较 ${dateLabel(previous[0])} ${difference === 0 ? "持平" : `${difference > 0 ? "+" : ""}${pretty(difference)} kg`}`;
    const points = C.stats(store(), state.date, 30).weights;
    return `<section class="panel weight-panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon">${icon("scale")}</span><div><h2>体重记录</h2><p></p></div></div>${record.weight !== null ? `<button class="tiny-button" data-action="delete-weight" aria-label="删除当天体重">${icon("trash")}</button>` : ""}</div><p class="weight-main"><span class="weight-number">${record.weight === null ? "— —" : pretty(record.weight)}</span><span class="weight-unit">kg</span></p><p class="weight-comparison">${esc(comparison)}</p><button class="button" data-action="weight">${icon(record.weight === null ? "plus" : "edit")}${record.weight === null ? "记录体重" : "修改体重"}</button><div class="mini-chart">${points.length > 1 ? weightChart(points, C.addDays(state.date, -29), state.date, true) : '<div class="mini-chart-empty">记录 2 次后，<br>显示变化趋势</div>'}</div></section>`;
  }
  function activityEntry(activity) {
    return `<article class="activity-entry"><span class="activity-icon">${icon(activityTypes[activity.type][1])}</span><div class="entry-content"><p class="entry-title">${activityTypes[activity.type][0]}</p><div class="entry-meta"><span>${pretty(activity.minutes)} 分钟</span><span>${intensities[activity.intensity]}</span>${activity.distance !== null ? `<span>${pretty(activity.distance)} km</span>` : ""}</div>${activity.note ? `<p class="entry-title" style="color:#8b9880;font-weight:400;font-size:10px;margin-top:7px">${esc(activity.note)}</p>` : ""}</div><div class="entry-actions"><button class="tiny-button" data-action="edit-activity" data-id="${esc(activity.id)}" aria-label="编辑${activityTypes[activity.type][0]}记录">${icon("edit")}</button><button class="tiny-button" data-action="delete-activity" data-id="${esc(activity.id)}" aria-label="删除${activityTypes[activity.type][0]}记录">${icon("trash")}</button></div></article>`;
  }
  function weightChart(points, start, end, small = false) {
    const width = small || window.matchMedia("(max-width: 720px)").matches ? 320 : 1000, height = small ? 90 : 240;
    const left = small ? 4 : 44, right = small ? 4 : 20, top = small ? 8 : 25, bottom = small ? 5 : 34;
    const values = points.map((point) => point.value), low = Math.min(...values), high = Math.max(...values);
    const padding = Math.max(.4, (high - low) * .25), min = low - padding, max = high + padding;
    const total = Math.max(1, Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`));
    const coords = points.map((point) => ({ ...point, x: left + (Date.parse(`${point.date}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / total * (width - left - right), y: top + (max - point.value) / (max - min) * (height - top - bottom) }));
    const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const floor = height - bottom;
    const area = `${path} L${coords.at(-1).x},${floor} L${coords[0].x},${floor} Z`;
    const grid = small ? "" : [0, 1, 2, 3].map((i) => { const y = top + i / 3 * (height - top - bottom); return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" stroke="#e9eee2" stroke-dasharray="3 5"/><text x="0" y="${y + 4}" class="chart-label">${(max - (max - min) * i / 3).toFixed(1)}</text>`; }).join("");
    const labels = small ? "" : `<text x="${left}" y="${height - 5}" class="chart-label">${start.slice(5).replace("-", "/")}</text><text x="${width - right}" y="${height - 5}" text-anchor="end" class="chart-label">${end.slice(5).replace("-", "/")}</text>`;
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${points.length} 次体重记录，从 ${points[0].value} 到 ${points.at(-1).value} 千克；仅连接实际记录点"><defs><linearGradient id="weight-fill-${small ? "mini" : "full"}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c7d8b3" stop-opacity=".5"/><stop offset="1" stop-color="#eaf1df" stop-opacity=".05"/></linearGradient></defs>${grid}${coords.length > 1 ? `<path d="${area}" fill="url(#weight-fill-${small ? "mini" : "full"})"/><path d="${path}" fill="none" stroke="#849e6c" stroke-width="${small ? 2.5 : 2.7}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` : ""}${coords.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${small ? 3 : 4}" fill="#7d9964" stroke="white" stroke-width="2"><title>${point.date}：${point.value} kg</title></circle>`).join("")}${labels}</svg>`;
  }
  function renderTrends() {
    const stats = C.stats(store(), state.date, state.range);
    const weights = stats.weights;
    const delta = weights.length > 1 ? weights.at(-1).value - weights[0].value : null;
    const controls = `<div class="view-controls" role="group" aria-label="趋势时间范围">${[7, 30, 90].map((range) => `<button type="button" data-range="${range}" class="${state.range === range ? "active" : ""}" aria-pressed="${state.range === range}">${range} 天</button>`).join("")}</div>`;
    const countByMeal = Object.fromEntries(C.MEALS.map((type) => [type, stats.entries.reduce((total, [, entry]) => total + entry.meals.filter((meal) => meal.type === type).length, 0)]));
    const maxMeal = Math.max(1, ...Object.values(countByMeal));
    // Display daily bars for 7 days; aggregate by seven-day blocks in longer ranges.
    const bucketSize = state.range === 7 ? 1 : 7;
    const bars = [];
    for (let offset = 0; offset < state.range; offset += bucketSize) {
      const start = C.addDays(stats.start, offset), end = C.addDays(start, Math.min(bucketSize, state.range - offset) - 1);
      const value = stats.entries.filter(([date]) => date >= start && date <= end).reduce((sum, [, entry]) => sum + entry.activities.reduce((n, activity) => n + activity.minutes, 0), 0);
      bars.push({ start, end, value });
    }
    const maxMinutes = Math.max(10, ...bars.map((bar) => bar.value));
    return header('记录<em>趋势</em>', `回看 ${dateLabel(stats.start)} 至 ${dateLabel(state.date)} 的生活记录。`, "LOOK BACK, AT YOUR OWN PACE", controls, "trends-intro") + `
      <section class="trend-summary">${summaryCard("", stats.days, "天", "有记录的日子")}${summaryCard("", stats.meals, "条", "饮食记录")}${summaryCard("", pretty(stats.minutes), "分钟", "累计运动")}${summaryCard("", weights.length, "次", "体重记录")}</section>
      <section class="panel chart-panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon">${icon("scale")}</span><div><h2>体重趋势</h2><p></p></div></div><button class="text-button" data-action="weight">记体重 ${icon("plus")}</button></div>${weights.length ? `<p class="chart-title-value">${pretty(weights.at(-1).value)} <small>kg · 区间最新</small><span>${delta === null ? "记录 2 次后可比较" : `区间变化 ${delta > 0 ? "+" : ""}${pretty(delta)} kg`}</span></p><div class="chart-area">${weightChart(weights, stats.start, state.date)}</div><details class="chart-data"><summary>查看体重明细 · ${weights.length} 次</summary><table><thead><tr><th scope="col">日期</th><th scope="col">体重（kg）</th></tr></thead><tbody>${weights.map((point) => `<tr><td>${point.date}</td><td>${pretty(point.value)}</td></tr>`).join("")}</tbody></table></details>` : `<div class="chart-empty">${icon("chart")}<p>暂无体重记录</p><button class="button soft" data-action="weight">${icon("plus")}记录体重</button></div>`}</section>
      <div class="trends-grid"><section class="panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon orange">${icon("move")}</span><div><h2>运动时长</h2><p>${state.range === 7 ? "每日运动时长" : "按 7 天分组，最后一组可能不足 7 天"}</p></div></div><span class="local-note">分钟</span></div><div class="bar-chart movement-chart" role="img" aria-label="${esc(bars.map((bar) => `${bar.start} 至 ${bar.end}：${pretty(bar.value)} 分钟`).join("；"))}">${bars.map((bar, index) => `<div class="bar-item" title="${bar.start} 至 ${bar.end}：${pretty(bar.value)} 分钟">${bar.value ? `<b>${pretty(bar.value)}</b>` : ""}<i style="height:${bar.value / maxMinutes * 75}%"></i><span>${state.range === 90 && index % 2 ? "" : bar.start.slice(5).replace("-", "/")}</span></div>`).join("")}</div><p class="range-note">共 ${stats.sessions} 次活动，累计 ${pretty(stats.minutes)} 分钟。</p></section>
      <section class="panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon">${icon("bowl")}</span><div><h2>饮食记录分布</h2><p>次数统计，非摄入比例</p></div></div></div><div class="meal-breakdown">${C.MEALS.map((type) => `<div class="breakdown-row"><span>${mealTypes[type][0]}</span><div class="breakdown-track"><i style="width:${countByMeal[type] / maxMeal * 100}%"></i></div><span>${countByMeal[type]} 条</span></div>`).join("")}</div></section></div><p class="range-note">统计截至 ${state.date}。要查看其他日期，请在「每日记录」中选择日期。没有记录的体重日期不会自动补值。</p>`;
  }
  function renderHistory() {
    const start = `${state.month}-01`;
    const leading = (new Date(`${start}T12:00:00`).getDay() + 6) % 7;
    const last = new Date(Number(state.month.slice(0, 4)), Number(state.month.slice(5)), 0).getDate();
    const entries = Object.entries(store().days).filter(([date, entry]) => date.startsWith(state.month) && C.hasData(entry)).sort(([a], [b]) => b.localeCompare(a));
    return header('记录<em>日历</em>', "选择日期，查看或补记。", "EVERY DAY TELLS A STORY") + `
      <div class="history-layout"><section class="panel"><div class="calendar-controls"><button class="icon-button" data-action="prev-month" aria-label="上个月" ${state.month <= "1900-01" ? "disabled" : ""}>${icon("left")}</button><h2>${state.month.slice(0, 4)} 年 ${Number(state.month.slice(5))} 月</h2><button class="icon-button" data-action="next-month" aria-label="下个月" ${state.month >= today().slice(0, 7) ? "disabled" : ""}>${icon("right")}</button><button class="text-button" data-action="current-month" style="margin-left:auto">本月</button></div><div class="calendar-weekdays">${[..."一二三四五六日"].map((label) => `<span>${label}</span>`).join("")}</div><div class="calendar-grid">${"<span></span>".repeat(leading)}${Array.from({ length: last }, (_, index) => {
        const date = `${state.month}-${String(index + 1).padStart(2, "0")}`, has = C.hasData(store().days[date]);
        return `<button class="calendar-day${has ? " has-data" : ""}${date === today() ? " is-today" : ""}${date === state.date ? " active" : ""}" data-date="${date}" data-open-day="true" aria-label="${dateLabel(date)}，${has ? "有记录" : "暂无记录"}" ${date > today() ? "disabled" : ""}>${index + 1}${has ? "<span></span>" : ""}</button>`;
      }).join("")}</div><p class="calendar-legend"><i></i>有记录的日子 <span style="margin-left:auto">本月 ${entries.length} 天</span></p></section>
      <section class="panel"><div class="panel-head"><div class="panel-heading"><span class="section-icon">${icon("journal")}</span><div><h2>本月记录</h2><p></p></div></div></div><div class="history-list">${entries.length ? entries.map(([date, entry]) => `<button class="history-row" data-date="${date}" data-open-day="true"><span><strong>${dateLabel(date, true)}</strong><small>饮食 ${entry.meals.length} 条 · 运动 ${pretty(entry.activities.reduce((sum, activity) => sum + activity.minutes, 0))} 分钟${entry.weight !== null ? ` · ${pretty(entry.weight)} kg` : ""}${!entry.meals.length && !entry.activities.length && entry.weight === null ? " · 有当日备注" : ""}</small></span>${icon("right")}</button>`).join("") : '<div class="empty-history">本月暂无记录<br>选择日期添加</div>'}</div></section></div>`;
  }

  function showDialog(title, description, body) {
    $("#dialog-content").innerHTML = `<div class="dialog-inner"><div class="dialog-heading"><div><h2 id="dialog-title">${title}</h2><p>${description}</p></div><button class="icon-button" data-action="close-dialog" aria-label="关闭">${icon("close")}</button></div>${body}</div>`;
    if (!dialog.open) dialog.showModal();
    // Use autofocus on the first text field while leaving focus restoration to the browser.
    const input = $("[autofocus]", dialog);
    if (input) input.focus({ preventScroll: true });
  }
  function options(entries, selected) { return entries.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join(""); }
  const formActions = (label = "保存记录") => `<p class="form-error" id="form-error" role="alert" hidden></p><div class="form-actions"><button class="button" type="button" data-action="close-dialog">取消</button><button class="button primary" type="submit">${label}${icon("arrow")}</button></div>`;
  function mealEditor(type, id) {
    const existing = id ? day().meals.find((item) => item.id === id) : null;
    const hour = new Date().getHours();
    const inferred = hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snack";
    const meal = existing ?? { type: type || inferred, content: "", portion: "", time: state.date === today() ? new Date().toTimeString().slice(0, 5) : ({ breakfast: "08:00", lunch: "12:00", dinner: "18:00", snack: "15:00" }[type || inferred]) };
    showDialog(existing ? "编辑饮食" : "添加饮食", `${dateLabel(state.date, true)}`, `<form id="record-form" data-kind="meal" data-id="${esc(existing?.id || "")}"><div class="field-row"><label class="field">餐次<select name="type">${options(Object.entries(mealTypes).map(([key, value]) => [key, value[0]]), meal.type)}</select></label><label class="field">用餐时间<input type="time" name="time" value="${esc(meal.time)}" required></label></div><label class="field">吃了什么<textarea name="content" maxlength="500" placeholder="比如：番茄鸡蛋面、一杯牛奶" required autofocus>${esc(meal.content)}</textarea></label><label class="field">分量<small>选填</small><input name="portion" maxlength="100" placeholder="比如：一碗、两个、小份" value="${esc(meal.portion)}"></label>${formActions()}</form>`);
  }
  function weightEditor() {
    showDialog("记录体重", `${dateLabel(state.date, true)} · 每天一个数值`, `<form id="record-form" data-kind="weight"><label class="field">体重 <small>kg / 千克</small><input class="weight-input" type="number" name="weight" min="1" max="500" step="0.01" inputmode="decimal" placeholder="例如 55.2" value="${day().weight ?? ""}" required autofocus></label><p class="field-help">尽量在相近时间、相似状态下称重。</p>${formActions("保存体重")}</form>`);
  }
  function activityEditor(id) {
    const existing = id ? day().activities.find((item) => item.id === id) : null;
    const activity = existing ?? { type: "walk", minutes: "", intensity: "easy", distance: null, note: "" };
    showDialog(existing ? "编辑运动" : "添加运动", `${dateLabel(state.date, true)}`, `<form id="record-form" data-kind="activity" data-id="${esc(existing?.id || "")}"><label class="field">活动类型<select name="type">${options(Object.entries(activityTypes).map(([key, value]) => [key, value[0]]), activity.type)}</select></label><div class="field-row"><label class="field">时长<small>分钟</small><input name="minutes" type="number" min="1" max="1440" step="1" inputmode="numeric" placeholder="例如 30" value="${activity.minutes}" required autofocus></label><label class="field">身体感觉<select name="intensity">${options(Object.entries(intensities), activity.intensity)}</select></label></div><label class="field">距离<small>km · 选填</small><input type="number" name="distance" min="0.01" max="999" step="0.01" inputmode="decimal" placeholder="步行、跑步、骑行等" value="${activity.distance ?? ""}"></label><label class="field">备注<small>选填</small><textarea name="note" maxlength="500" placeholder="比如：晚饭后绕操场走了几圈">${esc(activity.note)}</textarea></label>${formActions()}</form>`);
  }
  function noteEditor() {
    showDialog("当日备注", `${dateLabel(state.date, true)}`, `<form id="record-form" data-kind="note"><label class="field">备注<textarea name="note" maxlength="1000" rows="5" placeholder="心情、身体感受或其他…" autofocus>${esc(day().note)}</textarea></label>${formActions()}</form>`);
  }
  function deleteEditor(kind, id) {
    const record = day();
    let preview = "", label = "";
    if (kind === "meal") { const item = record.meals.find((entry) => entry.id === id); if (!item) return; preview = item.content; label = "饮食记录"; }
    if (kind === "activity") { const item = record.activities.find((entry) => entry.id === id); if (!item) return; preview = `${activityTypes[item.type][0]} · ${item.minutes} 分钟`; label = "运动记录"; }
    if (kind === "weight") { preview = `${record.weight} kg`; label = "当天体重"; }
    showDialog(`删除这条${label}？`, `${dateLabel(state.date)} · 删除后无法从当前设备撤销`, `<p class="delete-preview">${esc(preview)}</p><div class="form-actions"><button class="button" data-action="close-dialog">保留记录</button><button class="button danger" data-action="confirm-delete" data-kind="${kind}" data-id="${esc(id || "")}">确认删除</button></div>`);
  }
  function dataDialog() {
    if (state.demo) { showDialog("你正在查看示例", "示例中的数据独立存放，不会进入你的日常记录。", '<p class="notice">返回自己的记录后，即可导出或恢复个人备份。</p><div class="form-actions"><button class="button primary" data-action="exit-demo">返回我的记录</button></div>'); return; }
    const entries = Object.values(state.store.days);
    const total = entries.reduce((sum, entry) => sum + entry.meals.length + entry.activities.length + (entry.weight !== null ? 1 : 0), 0);
    showDialog("数据与备份", "", `<p class="notice">你的饮食、体重和运动数据仅保存在当前浏览器，不会上传到网站或 GitHub。不同手机、浏览器之间不会自动同步；清理浏览器数据或使用无痕模式可能丢失记录。</p><div class="data-stats"><span><strong>${entries.length}</strong> 天记录</span><span><strong>${total}</strong> 条饮食 / 运动 / 体重</span></div><section class="data-card"><h3>导出备份</h3><p>导出 JSON 文件，可在其他设备恢复。</p><button class="button soft" data-action="export">${icon("download")}导出我的记录</button></section><section class="data-card"><h3>导入备份</h3><p>重复记录会合并，保留本机已有的体重与备注，不清空记录。</p><label class="button" for="import-file">${icon("upload")}选择 JSON 备份</label><input id="import-file" class="data-native-input" type="file" accept="application/json,.json" aria-label="选择日常有迹备份文件"></section>${state.storageError ? '<button class="text-button" data-action="raw-backup">导出无法读取的原始数据</button>' : ""}<p class="notice">公开的是网站，个人记录只在本机。</p>`);
  }
  function download(content, filename) {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportRecords() {
    try {
      const current = readStorage();
      download(JSON.stringify({ ...current, exportedAt: now(), app: "日常有迹" }, null, 2), `日常有迹-备份-${today()}.json`);
      toast("已开始下载备份");
    } catch { toast("当前记录读取失败，请先导出原始数据。", true); }
  }
  async function importRecords(file) {
    if (!file) return;
    try {
      if (state.storageError) throw new Error("请先保存原始备份，当前异常数据不能直接合并");
      if (file.size > 5 * 1024 * 1024) throw new Error("备份不能大于 5MB");
      const imported = C.validateStore(JSON.parse(await file.text()));
      const count = Object.keys(imported.days).length;
      if (!count) throw new Error("这份备份里还没有记录");
      state.pendingImport = imported;
      showDialog("导入备份", "合并到当前浏览器", `<div class="import-confirm">这份文件包含 <strong>${count} 天</strong>的记录。<br>相同编号会合并，同一天已有的体重和备注会保留。</div><div class="form-actions"><button class="button" data-action="close-dialog">暂不恢复</button><button class="button primary" data-action="confirm-import">确认合并</button></div>`);
    } catch (error) { toast(`无法导入：${error instanceof SyntaxError ? "文件不是有效的 JSON 备份" : error.message}`, true); }
  }
  function demoStore() {
    const result = C.emptyStore();
    const foods = [["燕麦、牛奶和香蕉", "米饭、番茄炒蛋、青菜", "菌菇鸡汤面"], ["全麦面包、鸡蛋", "鸡肉沙拉和玉米", "番茄牛肉盖饭"], ["豆浆、小笼包", "食堂一荤两素", "小馄饨和青菜"]];
    for (let index = 13; index >= 0; index--) {
      const date = C.addDays(today(), -index), entry = C.emptyDay(), food = foods[index % foods.length];
      entry.meals = ["breakfast", "lunch", "dinner"].slice(0, index === 0 ? 2 : 3).map((type, i) => ({ id: `demo-meal-${index}-${i}`, type, content: food[i], portion: ["一份", "一碗", "一份"][i], time: ["08:10", "12:20", "18:30"][i], updatedAt: now() }));
      if (index % 2 === 0) entry.weight = Number((55.4 + Math.sin(index * 1.3) * .35).toFixed(1));
      if (index % 3 !== 1) entry.activities = [{ id: `demo-move-${index}`, type: index % 3 === 0 ? "walk" : "yoga", minutes: index % 3 === 0 ? 30 : 20, intensity: "easy", distance: index % 3 === 0 ? 2.1 : null, note: index === 0 ? "晚饭后，给自己一点散步时间" : "", updatedAt: now() }];
      if (index === 0) entry.note = "今天有好好吃饭，也给自己留了一点放空的时间。";
      entry.updatedAt = now(); result.days[date] = entry;
    }
    return result;
  }
  function chooseDate(date, open = false) {
    if (!C.isDate(date) || date > today()) return;
    state.date = date; state.month = date.slice(0, 7);
    if (open && location.hash !== "#today") location.hash = "today";
    else render();
  }
  function shiftMonth(delta) {
    const date = new Date(`${state.month}-01T12:00:00`);
    date.setMonth(date.getMonth() + delta);
    state.month = C.localDate(date).slice(0, 7); render();
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, a, [data-date]");
    if (!button || button.disabled) return;
    if (button.dataset.date) { chooseDate(button.dataset.date, button.dataset.openDay === "true"); return; }
    if (button.dataset.range) { state.range = Number(button.dataset.range); render(); return; }
    const action = button.dataset.action, id = button.dataset.id;
    switch (action) {
      case "add-meal": mealEditor(button.dataset.type); break;
      case "edit-meal": mealEditor(null, id); break;
      case "weight": weightEditor(); break;
      case "add-activity": activityEditor(); break;
      case "edit-activity": activityEditor(id); break;
      case "note": noteEditor(); break;
      case "delete-meal": deleteEditor("meal", id); break;
      case "delete-activity": deleteEditor("activity", id); break;
      case "delete-weight": deleteEditor("weight"); break;
      case "confirm-delete": {
        const kind = button.dataset.kind;
        changeDay((entry) => { if (kind === "weight") entry.weight = null; else { const key = kind === "meal" ? "meals" : "activities"; entry[key] = entry[key].filter((item) => item.id !== id); } }, "这条记录已删除"); break;
      }
      case "prev-day": chooseDate(C.addDays(state.date, -1)); break;
      case "next-day": chooseDate(C.addDays(state.date, 1)); break;
      case "today": chooseDate(today()); break;
      case "prev-month": shiftMonth(-1); break;
      case "next-month": shiftMonth(1); break;
      case "current-month": state.month = today().slice(0, 7); render(); break;
      case "close-dialog": dialog.close(); state.pendingImport = null; break;
      case "data": dataDialog(); break;
      case "export": exportRecords(); break;
      case "raw-backup": {
        try { download(localStorage.getItem(STORAGE_KEY) ?? "{}", `日常有迹-原始数据-${today()}.json`); } catch { toast("浏览器拒绝读取存储，请检查浏览器的存储权限。", true); }
        break;
      }
      case "confirm-import": {
        if (!state.pendingImport) return;
        try {
          const next = C.mergeStores(readStorage(), state.pendingImport);
          if (persist(next)) { state.pendingImport = null; dialog.close(); render(); toast("备份已合并到你的记录"); }
        } catch (error) { toast(`合并失败：${error.message}`, true); }
        break;
      }
      case "demo": state.demo = demoStore(); state.date = today(); state.month = today().slice(0, 7); render(); toast("示例模式，不影响个人记录"); break;
      case "exit-demo": state.demo = null; state.date = today(); state.month = today().slice(0, 7); dialog.close(); render(); break;
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "selected-date") { const valid = C.isDate(event.target.value) && event.target.value <= today(); if (valid) chooseDate(event.target.value); else { toast("请选择今天或之前的有效日期。", true); render(); } }
    if (event.target.id === "import-file") importRecords(event.target.files[0]);
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id !== "record-form") return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const kind = form.dataset.kind;
    const error = $("#form-error", form);
    const fail = (message) => { error.textContent = message; error.hidden = false; };
    if (kind === "meal") {
      if (!values.content.trim()) { fail("请填写饮食内容。"); return; }
      const meal = { id: form.dataset.id || uid(), type: values.type, time: values.time, content: values.content.trim(), portion: values.portion.trim(), updatedAt: now() };
      changeDay((entry) => { const index = entry.meals.findIndex((item) => item.id === meal.id); if (index < 0) entry.meals.push(meal); else entry.meals[index] = meal; });
    }
    if (kind === "weight") {
      const weight = Number(values.weight);
      if (!values.weight.trim() || !Number.isFinite(weight) || weight < 1 || weight > 500) { fail("请输入有效体重，单位为 kg。"); return; }
      changeDay((entry) => { entry.weight = weight; }, "体重已保存");
    }
    if (kind === "activity") {
      const minutes = Number(values.minutes), distance = values.distance.trim() ? Number(values.distance) : null;
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || (distance !== null && (!Number.isFinite(distance) || distance <= 0 || distance > 999))) { fail("请检查运动时长和距离。时长按整分钟记录，距离选填。"); return; }
      const activity = { id: form.dataset.id || uid(), type: values.type, minutes, distance, intensity: values.intensity, note: values.note.trim(), updatedAt: now() };
      changeDay((entry) => { const index = entry.activities.findIndex((item) => item.id === activity.id); if (index < 0) entry.activities.push(activity); else entry.activities[index] = activity; });
    }
    if (kind === "note") changeDay((entry) => { entry.note = values.note.trim(); });
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener("close", () => { state.pendingImport = null; });
  window.addEventListener("hashchange", () => {
    render();
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  });
  window.matchMedia("(max-width: 720px)").addEventListener("change", () => {
    if (!dialog.open) render();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try { state.store = readStorage(); state.storageError = ""; if (!dialog.open) render(); else toast("另一个页面更新了记录，保存时会读取最新内容。"); }
    catch { state.storageError = "另一个页面写入的数据暂时无法读取，请先导出原始备份。"; render(); }
  });
  render();
})();
