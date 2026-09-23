/**
 * DLO Kupwara — Shared Utilities
 * Include after config.js on every page that needs helpers.
 */
(function (global) {
  'use strict';

  const CFG = global.DLO_CONFIG || {};

  // ── Security: HTML escaping ──────────────────────────────────────────────
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Date helpers (IST) ───────────────────────────────────────────────────
  function nowIST() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  }

  function formatDDMMYYYY(d) {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const day = String(dt.getDate()).padStart(2, '0');
    const mon = String(dt.getMonth() + 1).padStart(2, '0');
    const yr = dt.getFullYear();
    return `${day}-${mon}-${yr}`;
  }

  function formatDateTimeIST(d) {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  // ── Toast system ─────────────────────────────────────────────────────────
  let toastContainer = null;
  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'dlo-toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'true');
    Object.assign(toastContainer.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '99999',
      display: 'flex', flexDirection: 'column', gap: '10px',
      maxWidth: '360px', pointerEvents: 'none'
    });
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message, type = 'info', duration = 3800) {
    if (!(CFG.features && CFG.features.toasts)) return;
    const box = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'dlo-toast dlo-toast--' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="dlo-toast__msg">${escapeHtml(message)}</span>`;
    Object.assign(el.style, {
      pointerEvents: 'auto', padding: '12px 16px', borderRadius: '10px',
      fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      background: type === 'success' ? '#065f46' : type === 'error' ? '#7f1d1d' : type === 'warn' ? '#78350f' : '#1e293b',
      color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)',
      opacity: '0', transform: 'translateY(12px)', transition: 'opacity .25s, transform .25s'
    });
    box.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 280);
    }, duration);
  }

  // ── Theme persistence ────────────────────────────────────────────────────
  function getStoredTheme() {
    try {
      return localStorage.getItem((CFG.theme && CFG.theme.storageKey) || 'dlo-theme-mode');
    } catch (e) { return null; }
  }

  function setStoredTheme(mode) {
    try {
      localStorage.setItem((CFG.theme && CFG.theme.storageKey) || 'dlo-theme-mode', mode);
    } catch (e) {}
  }

  function applyTheme(mode) {
    const isLight = mode === 'light';
    document.body.classList.toggle('light-mode', isLight);
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isLight ? '#f8fafc' : '#020408';
    setStoredTheme(isLight ? 'light' : 'dark');
  }

  function initTheme() {
    if (!(CFG.features && CFG.features.themeToggle)) return;
    const stored = getStoredTheme();
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const mode = stored || (prefersLight ? 'light' : (CFG.theme && CFG.theme.defaultMode) || 'dark');
    applyTheme(mode);
  }

  function toggleTheme() {
    const next = document.body.classList.contains('light-mode') ? 'dark' : 'light';
    applyTheme(next);
    showToast(next === 'light' ? 'Light theme activated' : 'Dark theme activated', 'info', 2000);
  }

  // ── Offline detection ────────────────────────────────────────────────────
  function initOfflineWatcher() {
    if (!(CFG.features && CFG.features.offlineToast)) return;
    window.addEventListener('offline', () => showToast('You are offline. Cached data may be shown.', 'warn', 5000));
    window.addEventListener('online', () => showToast('Back online. Refreshing data…', 'success', 3000));
  }

  // ── Skeleton helpers ─────────────────────────────────────────────────────
  function showSkeleton(container, rows = 6) {
    if (!container || !(CFG.features && CFG.features.skeletons)) return;
    container.setAttribute('aria-busy', 'true');
    let html = '<div class="dlo-skeleton-wrap">';
    for (let i = 0; i < rows; i++) {
      html += `<div class="dlo-skeleton-row"><div class="dlo-skeleton-bar" style="width:${70 + (i % 3) * 10}%"></div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function hideSkeleton(container) {
    if (!container) return;
    container.removeAttribute('aria-busy');
  }

  // ── Stats calculator (single source of truth for counters) ───────────────
  /**
   * @param {Array} rows – array of case objects
   * Expected fields (flexible): status, replyStatus, isExparte, nextHearing, court
   */
  function calculateStats(rows) {
    if (!Array.isArray(rows)) rows = [];
    const today = nowIST();
    today.setHours(0, 0, 0, 0);

    let total = rows.length;
    let active = 0, disposed = 0, replyFiled = 0, replyPending = 0, exparte = 0;
    let overdue = 0, hearingSoon = 0;
    const courts = new Set();
    const byType = {};
    const byCourt = {};

    rows.forEach(r => {
      const status = String(r.status || r.Status || '').toLowerCase();
      const reply = String(r.replyStatus || r.Reply || r.reply || '').toLowerCase();
      const court = r.court || r.Court || 'Unknown';
      const type = r.caseType || r.Type || r.type || 'Other';
      const nextH = r.nextHearing || r.NextHearing || r.hearingDate;

      courts.add(court);
      byType[type] = (byType[type] || 0) + 1;
      byCourt[court] = (byCourt[court] || 0) + 1;

      if (status.includes('dispos') || status === 'closed') disposed++;
      else active++;

      if (reply.includes('filed') || reply === 'yes' || reply === 'done') replyFiled++;
      else if (reply.includes('pend') || reply === 'no' || reply === '') replyPending++;

      if (String(r.isExparte || r.exparte || r.Exparte || '').toLowerCase() === 'yes' ||
          status.includes('ex-parte') || status.includes('exparte')) {
        exparte++;
      }

      if (nextH) {
        const hd = new Date(nextH);
        if (!isNaN(hd.getTime())) {
          hd.setHours(0, 0, 0, 0);
          const diff = (hd - today) / 86400000;
          if (diff < 0 && !status.includes('dispos')) overdue++;
          else if (diff >= 0 && diff <= 7) hearingSoon++;
        }
      }
    });

    return {
      total, active, disposed,
      replyFiled, replyPending, exparte,
      overdue, hearingSoon,
      courtsCovered: courts.size,
      byType, byCourt,
      disposalRate: total ? Math.round((disposed / total) * 100) : 0
    };
  }

  // ── Service Worker registration helper ───────────────────────────────────
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        // Optional: listen for updates
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Update available — refresh to apply', 'info', 6000);
            }
          });
        });
      }).catch(() => {});
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────
  global.DLO = {
    escapeHtml,
    nowIST,
    formatDDMMYYYY,
    formatDateTimeIST,
    showToast,
    initTheme,
    toggleTheme,
    applyTheme,
    initOfflineWatcher,
    showSkeleton,
    hideSkeleton,
    calculateStats,
    registerSW,
    config: CFG
  };

  // Auto-init safe parts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTheme();
      initOfflineWatcher();
    });
  } else {
    initTheme();
    initOfflineWatcher();
  }

})(window);
