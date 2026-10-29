(function () {
  "use strict";
  if (window.JournalMotion) return;

  const STORAGE_KEY = "daily-traces:motion:v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const main = document.querySelector("#main");
  const dialog = document.querySelector("#editor");
  const nav = document.querySelector(".mobile-nav");
  const discreteDialogTransitions = Boolean(window.CSS?.supports?.("transition-behavior", "allow-discrete"));
  const nativeBridge = () => window.AndroidJournal;
  const preferences = { enabled: true, haptics: Boolean(nativeBridge()) };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved.enabled === "boolean") preferences.enabled = saved.enabled;
    if (saved && typeof saved.haptics === "boolean") preferences.haptics = saved.haptics;
  } catch { /* Motion preferences must never prevent the journal opening. */ }

  let indicator;
  let indicatorFrame = 0;
  let activeAnimation;
  let dialogAnimation;
  let viewportFrame = 0;
  let lastViewportHeight = 0;
  let pendingTransition = null;
  let lastHapticAt = 0;
  let previousView = view();
  let previousDate = selectedDate();
  let lastToast = "";
  let selectionTimer = 0;
  let swipeGesture = null;
  let suppressedSwipeClick = null;
  const activeTouchIds = new Set();
  const pointers = new Map();
  const tactileSelector = "button, a[data-view]";
  const rippleSelector = ".button,.round-add,.icon-button,.metric-card,.day-button,.calendar-day,.history-row,.meal-add,.meal-empty";

  function view() { return ["today", "trends", "history"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today"; }
  function selectedDate() { return document.querySelector("#selected-date")?.value || ""; }
  function motionAllowed() { return preferences.enabled && !reducedMotion.matches; }
  function savePreferences() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Optional preference only. */ }
  }
  function haptic(kind = "selection") {
    if (kind !== "selection") { clearTimeout(selectionTimer); selectionTimer = 0; }
    if (!preferences.haptics || document.hidden) return false;
    if (!["selection", "success", "error"].includes(kind)) kind = "selection";
    const time = performance.now();
    if (kind === "selection" && time - lastHapticAt < 65) return false;
    lastHapticAt = time;
    try {
      if (typeof nativeBridge()?.haptic === "function") {
        nativeBridge().haptic(kind);
        return true;
      }
      // Browser vibration is opt-in; native feedback uses the Android user setting.
      if (typeof navigator.vibrate === "function") return navigator.vibrate(kind === "success" ? [10, 35, 8] : kind === "error" ? [14, 30, 14] : 7);
    } catch { /* Some devices or system settings deliberately suppress haptics. */ }
    return false;
  }
  function queueSelectionHaptic() {
    clearTimeout(selectionTimer);
    // A save/error toast in the same action replaces the light tap with one result pulse.
    selectionTimer = setTimeout(() => { selectionTimer = 0; haptic("selection"); }, 40);
  }
  function suppressSwipeClick(event) {
    const pending = suppressedSwipeClick;
    if (!pending || performance.now() > pending.until) { suppressedSwipeClick = null; return false; }
    if (!event.isTrusted || event.detail === 0) return false;
    if (event.pointerId > 0 && event.pointerId !== pending.pointerId) return false;
    const { rect } = pending;
    if (event.clientX < rect.left - 8 || event.clientX > rect.right + 8 || event.clientY < rect.top - 8 || event.clientY > rect.bottom + 8) return false;
    suppressedSwipeClick = null;
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
  function decorate(root) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll(tactileSelector).forEach((element) => {
      element.classList.add("journal-tactile");
      if (element.matches(rippleSelector)) element.classList.add("journal-ripple-host");
    });
  }
  function syncPreferences() {
    document.body.classList.toggle("journal-motion-ready", motionAllowed());
    if (nativeBridge()) document.body.classList.add("android-app");
    if (!motionAllowed()) {
      activeAnimation?.cancel();
      dialogAnimation?.cancel();
      pointers.forEach((pointer) => pointer.element.classList.remove("is-pressed"));
      pointers.clear();
      document.querySelectorAll(".journal-ripple").forEach((element) => element.remove());
    }
    scheduleIndicator();
  }
  function updateViewport() {
    viewportFrame = 0;
    const height = Math.round(window.visualViewport?.height || window.innerHeight);
    if (height > 0 && height !== lastViewportHeight) {
      lastViewportHeight = height;
      document.documentElement.style.setProperty("--journal-viewport-height", `${height}px`);
    }
    scheduleIndicator();
  }
  function scheduleViewport() {
    if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
  }
  function suspendInteraction() {
    clearTimeout(selectionTimer); selectionTimer = 0;
    [...pointers.keys()].forEach(releasePointer);
    activeTouchIds.clear(); swipeGesture = null; suppressedSwipeClick = null;
    pendingTransition = null;
    activeAnimation?.cancel(); dialogAnimation?.cancel();
    document.querySelectorAll(".journal-ripple").forEach((element) => element.remove());
  }
  function updateIndicator() {
    indicatorFrame = 0;
    if (!nav || !indicator) return;
    const active = nav.querySelector("a.active");
    if (!active || !nav.getClientRects().length || !motionAllowed()) {
      indicator.classList.remove("is-visible"); return;
    }
    const bounds = nav.getBoundingClientRect();
    const current = active.getBoundingClientRect();
    const width = Math.min(59, Math.max(48, current.width - 8));
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translate3d(${(current.left - bounds.left + (current.width - width) / 2).toFixed(1)}px,0,0)`;
    indicator.classList.add("is-visible");
  }
  function scheduleIndicator() {
    if (!indicatorFrame) indicatorFrame = requestAnimationFrame(updateIndicator);
  }
  function beginTransition(kind, direction = 1) {
    pendingTransition = { kind, direction, at: performance.now() };
  }
  function animateMain() {
    if (!main) return;
    const currentView = view();
    const currentDate = selectedDate();
    let transition = pendingTransition && performance.now() - pendingTransition.at < 900 ? pendingTransition : null;
    if (currentView !== previousView) {
      const order = { today: 0, trends: 1, history: 2 };
      transition = { kind: "view", direction: order[currentView] >= order[previousView] ? 1 : -1 };
    } else if (!transition && currentDate && previousDate && currentDate !== previousDate) {
      transition = { kind: "date", direction: currentDate > previousDate ? 1 : -1 };
    }
    previousView = currentView;
    previousDate = currentDate;
    pendingTransition = null;
    decorate(main);
    scheduleIndicator();
    if (!motionAllowed() || document.hidden || !main.animate) return;
    activeAnimation?.cancel();
    const kind = transition?.kind || "refresh";
    const direction = transition?.direction || 1;
    let keyframes, duration;
    if (kind === "date") {
      keyframes = [
        { opacity: .65, transform: `perspective(1400px) translateX(${direction * 13}px) rotateY(${direction * -1.35}deg)` },
        { opacity: 1, transform: "perspective(1400px) translateX(0) rotateY(0)" },
      ];
      duration = 280;
    } else if (kind === "view") {
      keyframes = [{ opacity: .45, transform: `translateX(${direction * 15}px)` }, { opacity: 1, transform: "translateX(0)" }];
      duration = 240;
    } else {
      keyframes = [{ opacity: .88, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }];
      duration = 170;
    }
    activeAnimation = main.animate(keyframes, { duration, easing: "cubic-bezier(.2,.78,.2,1)" });
    activeAnimation.finished.catch(() => {});
  }
  function releasePointer(id) {
    const pointer = pointers.get(id);
    if (!pointer) return;
    pointer.element.classList.remove("is-pressed");
    pointers.delete(id);
  }
  document.addEventListener("pointerdown", (event) => {
    if (!motionAllowed() || (event.pointerType === "mouse" && event.button !== 0)) return;
    const element = event.target.closest(tactileSelector);
    if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return;
    pointers.set(event.pointerId, { element, x: event.clientX, y: event.clientY });
    element.classList.add("is-pressed");
    if (element.matches(rippleSelector)) {
      const bounds = element.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.min(460, Math.max(bounds.width, bounds.height) * 2.2);
      ripple.className = "journal-ripple";
      ripple.setAttribute("aria-hidden", "true");
      Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${event.clientX - bounds.left - size / 2}px`, top: `${event.clientY - bounds.top - size / 2}px` });
      // Bound the number of nodes even on long presses or repeated taps.
      element.querySelectorAll(".journal-ripple").forEach((existing) => existing.remove());
      element.append(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      setTimeout(() => ripple.remove(), 550);
    }
  }, { passive: true });
  document.addEventListener("pointermove", (event) => {
    const pointer = pointers.get(event.pointerId);
    if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) releasePointer(event.pointerId);
  }, { passive: true });
  document.addEventListener("pointerup", (event) => releasePointer(event.pointerId), { passive: true });
  document.addEventListener("pointercancel", (event) => releasePointer(event.pointerId), { passive: true });
  window.addEventListener("blur", suspendInteraction);
  window.addEventListener("pagehide", suspendInteraction);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspendInteraction(); else scheduleViewport();
  });
  window.addEventListener("journal:native-pause", suspendInteraction);
  window.addEventListener("journal:native-resume", scheduleViewport);
  // Horizontal paging is limited to the date strip/calendar; vertical scrolling stays native.
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    activeTouchIds.add(event.pointerId);
    if (activeTouchIds.size !== 1) { swipeGesture = null; return; }
    if (dialog?.open) return;
    const surface = event.target.closest(".week-strip,.calendar-grid");
    if (!surface) return;
    swipeGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), surface, rect: surface.getBoundingClientRect() };
  }, { passive: true });
  document.addEventListener("pointercancel", (event) => {
    activeTouchIds.delete(event.pointerId);
    if (swipeGesture?.pointerId === event.pointerId) swipeGesture = null;
  }, { passive: true });
  document.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch") return;
    activeTouchIds.delete(event.pointerId);
    const gesture = swipeGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    swipeGesture = null;
    if (dialog?.open || activeTouchIds.size || !gesture.surface.isConnected || performance.now() - gesture.at > 700) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.8) return;
    suppressedSwipeClick = { pointerId: event.pointerId, rect: gesture.rect, until: performance.now() + 350 };
    const prefix = dx < 0 ? "next" : "prev";
    const action = `${prefix}-${gesture.surface.matches(".calendar-grid") ? "month" : "day"}`;
    const button = main?.querySelector(`[data-action="${action}"]`);
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
    queueSelectionHaptic();
    button.click();
  }, { passive: true });
  document.addEventListener("click", (event) => {
    if (suppressSwipeClick(event)) return;
    const element = event.target.closest(tactileSelector);
    if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return;
    const action = element.dataset.action;
    if (element.dataset.date) beginTransition("date", element.dataset.date >= selectedDate() ? 1 : -1);
    else if (["prev-day", "prev-month", "next-day", "next-month", "today", "current-month"].includes(action)) beginTransition("date", action.startsWith("prev") ? -1 : 1);
    else if (element.dataset.view) beginTransition("view");
    else if (element.dataset.range) beginTransition("refresh");
    if (event.isTrusted) queueSelectionHaptic();
  }, true);

  if (main) new MutationObserver(animateMain).observe(main, { childList: true });
  if (dialog) {
    new MutationObserver((mutations) => {
      decorate(dialog);
      const open = dialog.open;
      document.body.classList.toggle("journal-dialog-open", open);
      scheduleViewport();
      // Modern WebViews use one CSS transition. WAAPI is only the older-engine fallback.
      if (open && !discreteDialogTransitions && motionAllowed() && !document.hidden && dialog.animate && mutations.some((mutation) => mutation.attributeName === "open")) {
        dialogAnimation?.cancel();
        dialogAnimation = dialog.animate([{ opacity: 0, transform: "translateY(14px) scale(.985)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 230, easing: "cubic-bezier(.2,.78,.2,1)" });
        dialogAnimation.finished.catch(() => {});
      }
    }).observe(dialog, { attributes: true, attributeFilter: ["open"], childList: true });
    // Editor content is replaced inside #dialog-content rather than on dialog itself.
    const content = dialog.querySelector("#dialog-content");
    if (content) new MutationObserver(() => decorate(content)).observe(content, { childList: true });
  }
  const toast = document.querySelector("#toast");
  if (toast) new MutationObserver(() => {
    const message = toast.textContent.trim();
    if (toast.hidden || !message || message === lastToast) return;
    lastToast = message;
    if (toast.classList.contains("error")) haptic("error");
    else if (/已保存|已合并|已删除|已更新/.test(message)) haptic("success");
    setTimeout(() => { if (lastToast === message) lastToast = ""; }, 600);
  }).observe(toast, { attributes: true, attributeFilter: ["hidden", "class"], childList: true, characterData: true });
  if (nav) {
    indicator = document.createElement("span");
    indicator.className = "journal-nav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.prepend(indicator);
    if (window.ResizeObserver) new ResizeObserver(scheduleIndicator).observe(nav);
  }
  window.addEventListener("resize", scheduleViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleViewport, { passive: true });
  document.addEventListener("focusin", scheduleViewport);
  document.addEventListener("focusout", scheduleViewport);
  window.addEventListener("hashchange", scheduleIndicator);
  reducedMotion.addEventListener("change", syncPreferences);
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const incoming = JSON.parse(event.newValue);
      if (typeof incoming.enabled === "boolean") preferences.enabled = incoming.enabled;
      if (typeof incoming.haptics === "boolean") preferences.haptics = incoming.haptics;
      syncPreferences();
    } catch { /* Ignore invalid optional preference records. */ }
  });
  window.JournalMotion = Object.freeze({
    getEnabled: () => preferences.enabled,
    setEnabled(value) { preferences.enabled = Boolean(value); savePreferences(); syncPreferences(); return preferences.enabled; },
    getHapticsEnabled: () => preferences.haptics,
    setHapticsEnabled(value) { preferences.haptics = Boolean(value); savePreferences(); return preferences.haptics; },
    getPreferences: () => ({ ...preferences, reducedMotion: reducedMotion.matches }),
    haptic,
  });
  decorate(document);
  syncPreferences();
  updateViewport();
})();
