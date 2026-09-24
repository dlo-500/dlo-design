/**
 * DLO Kupwara — Shared Utilities
 * Include after config.js on every page that needs helpers.
 */
(function (global) {
  'use strict';

  const CFG = global.DLO_CONFIG || {};

  // ── Supabase: single, memoized client factory ─────────────────────────────
  // Every page that needs Supabase should call DLO.getSupabaseClient() instead
  // of declaring its own SUPABASE_URL / SUPABASE_ANON_KEY / createClient().
  // config.js must be loaded synchronously (no `defer`) BEFORE this file and
  // before any code that calls this — see the <head> of causelist.html for
  // the pattern. Returns null (and logs why) rather than throwing, so a
  // misconfigured page degrades instead of taking down the whole script.
  let _sbClient = null;
  function getSupabaseClient() {
    if (_sbClient) return _sbClient;
    const cfg = CFG.supabase;
    if (!cfg || !cfg.url || !cfg.anonKey) {
      console.error('[DLO] Supabase is not configured — check window.DLO_CONFIG.supabase in config.js');
      return null;
    }
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      console.error('[DLO] supabase-js failed to load before common.js ran — check the <script src="…supabase-js…"> tag and CSP script-src.');
      return null;
    }
    _sbClient = global.supabase.createClient(cfg.url, cfg.anonKey);
    return _sbClient;
  }

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

  // ── Shared Navigation: menu trigger + curtain + developer modal ──────────
  // Single source of truth for every page's destinations. Edit here only —
  // never re-type this list on an individual page.
  const MENU_ITEMS = [
    { href: 'search-filter-cases.html',    label: 'Case Search & Filter Cases' },
    { href: 'hearings.html',               label: 'Upcoming Hearings' },
    { href: 'causelist.html',              label: 'Daily Cause List' },
    { href: 'history.html',                label: 'Case History & Proceedings' },
    { href: 'performance.html',            label: 'Counsel Performance' },
    { href: 'statistics.html',             label: 'Live Statistics' },
    { href: 'analytics.html',              label: 'Analytics Dashboard' },
    { href: 'court-wise-distribution.html',label: 'Court-wise Distribution' },
    { href: 'areas-of-practice.html',      label: 'Areas of Legal Practice' },
    { href: 'latest-updates.html',         label: 'Latest Updates (Orders & Circulars)' },
    { href: 'our-officials.html',          label: 'Our Officials' },
    { href: 'public-enquiries.html',       label: 'Public Enquiries' },
    { href: 'contact.html',                label: 'Contact Us' },
    { href: 'about-office.html',           label: 'About the Office' },
    { href: 'department.html',             label: 'Departmental Login' },
    { href: 'operator.html',               label: 'Staff Login (Official 2FA)' }
  ];

  const DEV_INFO = {
    name: 'Tariq Ahmad Lone',
    role: 'Official of District Litigation Office Kupwara',
    desc: 'Designed & Developed the Case Management and Litigation Tracking Portal for DLO Kupwara.'
  };

  function currentPageFile() {
    const path = window.location.pathname;
    const last = path.substring(path.lastIndexOf('/') + 1);
    return last === '' ? 'index.html' : last;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(c => node.appendChild(c));
    return node;
  }

  function infoIconSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '9');
    const line1 = document.createElementNS(ns, 'line');
    line1.setAttribute('x1', '12'); line1.setAttribute('y1', '11');
    line1.setAttribute('x2', '12'); line1.setAttribute('y2', '16');
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', '12'); dot.setAttribute('cy', '7.5'); dot.setAttribute('r', '0.6');
    dot.setAttribute('fill', 'currentColor');
    svg.appendChild(circle); svg.appendChild(line1); svg.appendChild(dot);
    return svg;
  }

  let menuInjected = false;

  function injectMenu() {
    // Opt-out for security-sensitive, distraction-free surfaces (e.g. the
    // staff 2FA login page) — set before common.js runs:
    //   <script>window.DLO_NO_MENU = true;</script>
    if (global.DLO_NO_MENU) return;
    if (menuInjected || document.getElementById('kCurtain')) return;
    menuInjected = true;

    const currentFile = currentPageFile();

    // ── Trigger button ──
    const lines = el('span', { class: 'k-menu-lines' }, [
      el('span'), el('span'), el('span')
    ]);
    const trigger = el('button', {
      type: 'button', id: 'kMenuTrigger', class: 'k-menu-trigger',
      'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'kCurtain',
      'aria-label': 'Open menu'
    }, [lines, el('span', { class: 'k-menu-label', text: 'Menu' })]);

    // ── Curtain list ──
    const list = el('ul', { class: 'k-curtain-list' });
    MENU_ITEMS.forEach((item, i) => {
      const num = String(i + 1).padStart(2, '0');
      const isCurrent = item.href === currentFile;
      const link = el('a', {
        class: 'k-curtain-link',
        href: item.href
      }, [
        el('span', { text: item.label }),
        el('span', { class: 'num', text: num })
      ]);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
        link.removeAttribute('href');
        link.setAttribute('role', 'link');
        link.setAttribute('aria-disabled', 'true');
      }
      list.appendChild(el('li', { class: 'k-curtain-item' }, [link]));
    });

    // ── Developer info icon (bottom-left of curtain) ──
    const devIcon = el('button', {
      type: 'button', class: 'k-dev-icon', id: 'kDevIcon',
      'aria-label': 'About the developer', title: 'About the developer'
    }, [infoIconSvg()]);

    const closeBtn = el('button', {
      type: 'button', class: 'k-curtain-close', id: 'kCurtainClose'
    }, [document.createTextNode('Close')]);

    const topbar = el('div', { class: 'k-curtain-topbar' }, [
      el('span', { class: 'k-curtain-brand', text: 'DLO Kupwara' }),
      closeBtn
    ]);

    const body = el('div', { class: 'k-curtain-body' }, [list]);

    const curtain = el('div', {
      id: 'kCurtain', class: 'k-curtain', role: 'dialog',
      'aria-modal': 'true', 'aria-label': 'Site menu'
    }, [topbar, body, devIcon]);

    // ── Developer modal ──
    const modalClose = el('button', { type: 'button', class: 'k-modal-close', 'aria-label': 'Close' }, [document.createTextNode('✕')]);
    const modalCard = el('div', { class: 'k-modal-card' }, [
      modalClose,
      el('div', { class: 'k-dev-eyebrow', text: 'Developer Information' }),
      el('h3', { class: 'k-dev-name', text: DEV_INFO.name }),
      el('p', { class: 'k-dev-role', text: DEV_INFO.role }),
      el('p', { class: 'k-dev-desc', text: DEV_INFO.desc })
    ]);
    const modal = el('div', {
      id: 'kDevModal', class: 'k-modal-overlay', role: 'dialog',
      'aria-modal': 'true', 'aria-label': 'About the developer'
    }, [modalCard]);

    document.body.appendChild(trigger);
    document.body.appendChild(curtain);
    document.body.appendChild(modal);

    // ── Behavior ──
    function openCurtain() {
      curtain.classList.add('open');
      trigger.classList.add('is-active');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeCurtain() {
      curtain.classList.remove('open');
      trigger.classList.remove('is-active');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    function toggleCurtainFn() {
      if (curtain.classList.contains('open')) closeCurtain(); else openCurtain();
    }
    function openDevModal() { modal.classList.add('open'); }
    function closeDevModal() { modal.classList.remove('open'); }

    trigger.addEventListener('click', toggleCurtainFn);
    closeBtn.addEventListener('click', closeCurtain);
    devIcon.addEventListener('click', openDevModal);
    modalClose.addEventListener('click', closeDevModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDevModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (modal.classList.contains('open')) closeDevModal();
      else if (curtain.classList.contains('open')) closeCurtain();
    });

    // Exposed for any legacy inline handlers left on a page during migration.
    global.toggleCurtain = toggleCurtainFn;
    global.openDeveloperModal = openDevModal;
    global.closeDeveloperModal = closeDevModal;
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
    injectMenu,
    getSupabaseClient,
    config: CFG
  };

  // Auto-init safe parts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTheme();
      initOfflineWatcher();
      injectMenu();
    });
  } else {
    initTheme();
    initOfflineWatcher();
    injectMenu();
  }

})(window);
