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

  // ── Shared data fetch: case_diary → the row shape calculateStats() expects ─
  // Table/column names verified against causelist.html's own fetchSheetData().
  // Every page that needs case data should call this instead of writing its
  // own query — one place to fix if the schema ever changes.
  let _caseDiaryCache = null;
  async function fetchCaseDiary(force) {
    if (_caseDiaryCache && !force) return _caseDiaryCache;
    const sb = getSupabaseClient();
    if (!sb) return [];
    const { data, error } = await sb.from('case_diary').select('*');
    if (error) {
      console.error('[DLO] case_diary fetch failed:', error.message);
      return [];
    }
    _caseDiaryCache = (data || []).map(r => ({
      cnrCaseNo: r.cnr_case_no || '',
      caseTitle: r.case_title || '',
      subjectMatter: r.subject_matter || '',
      department: r.department || 'Unknown',
      court: r.court_name || 'Unknown',
      lastProceedings: r.last_proceedings || '',
      nextHearing: r.next_hearing_date || null,
      reply: r.reply_status || '',
      status: r.case_status || '',
      type: r.case_type || 'Other',
      advocateName: r.advocate_name || '',
      exparte: r.exparte_status || ''
    }));
    return _caseDiaryCache;
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
      // fetchCaseDiary maps the column to r.reply; also accept legacy aliases.
      const replyRaw = String(r.reply || r.replyStatus || r.Reply || '').trim();
      const reply = replyRaw.toLowerCase();
      const court = r.court || r.Court || 'Unknown';
      const type = r.caseType || r.Type || r.type || 'Other';
      const nextH = r.nextHearing || r.NextHearing || r.hearingDate;

      courts.add(court);
      byType[type] = (byType[type] || 0) + 1;
      byCourt[court] = (byCourt[court] || 0) + 1;

      if (status.includes('dispos') || status === 'closed') disposed++;
      else active++;

      // ── Reply logic ────────────────────────────────────────────────────────
      // IMPORTANT: test "not filed" / "not" BEFORE testing "filed" so that
      // "Reply Not Filed" is never counted as filed (substring 'filed' matches
      // inside 'not filed'). Only count as pending when there is an explicit
      // negative/empty signal — do NOT count every blank as pending.
      if (reply === '' || reply === 'not filed' || reply === 'no' ||
          reply.startsWith('not') || reply.includes('pending') || reply.includes('pend')) {
        replyPending++;
      } else if (reply === 'filed' || reply === 'yes' || reply === 'done' ||
                 reply === 'reply filed' || reply.startsWith('filed') ||
                 reply.includes('filed')) {
        replyFiled++;
      }
      // Any other value (e.g. 'N/A', custom text) is not counted in either bucket.

      // ── Ex-parte ────────────────────────────────────────────────────────────
      // fetchCaseDiary maps r.exparte_status → r.exparte.
      // The DB stores the string "Ex-parte" (confirmed from causelist/hearings).
      // Also accept 'yes', 'true', 'ex parte', 'exparte' for robustness.
      const exparteVal = String(r.exparte || r.isExparte || r.Exparte || '').toLowerCase().trim();
      if (!exparteVal.includes('not') &&
          (exparteVal.includes('ex-parte') || exparteVal.includes('exparte') ||
           exparteVal.includes('ex parte') || exparteVal === 'yes' ||
           exparteVal === 'true' || exparteVal === '1')) {
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

  // ── Local Hindi / Urdu translation engine ─────────────────────────────
  // Translation is performed in-place. No Google proxy, no page navigation,
  // and no RTL layout switch are used.
  const TRANSLATION_SCRIPT = 'translations.js';
  const LANGUAGE_KEY = 'dlo-language';
  let _translationPromise = null;

  const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ur', label: 'Urdu', native: 'اردو' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' }
  ];

  function currentLanguage() {
    try { const x = localStorage.getItem(LANGUAGE_KEY); return ['en','hi','ur'].includes(x) ? x : 'en'; }
    catch (e) { return 'en'; }
  }

  function translationPageKey() {
    const file = currentPageFile();
    const map = {
      'index.html':'index','404.html':'404','about-office.html':'about-office',
      'areas-of-practice.html':'areas-of-practice','search-filter-cases.html':'search-filter-cases',
      'statistics.html':'statistics','analytics.html':'analytics',
      'court-wise-distribution.html':'court-wise-distribution','history.html':'history',
      'causelist.html':'causelist','public-enquiries.html':'public-enquiries',
      'latest-updates.html':'latest-updates','contact.html':'contact',
      'our-officials.html':'our-officials','offline.html':'offline','operator.html':'operator',
      'department.html':'department','performance.html':'performance','hearings.html':'hearings'
    };
    return map[file] || file.replace(/\\.html?$/i,'');
  }

  function translationLookup(key, page) {
    if (!window.DLO_TRANSLATIONS) return null;
    const clean = String(key || '').trim();
    const variants = [clean, clean.replace(/[.!?]+$/,'').trim()];
    const pd = page && window.DLO_TRANSLATIONS.pages && window.DLO_TRANSLATIONS.pages[page];
    const cd = window.DLO_TRANSLATIONS.common || {};
    for (const v of variants) {
      if (pd && pd[v]) return pd[v];
      if (cd[v]) return cd[v];
    }
    return null;
  }

  function translateKey(key, lang, page) {
    if (lang === 'en') return key;
    const entry = translationLookup(key, page);
    return entry && entry[lang] ? entry[lang] : key;
  }

  function loadTranslations() {
    if (window.DLO_TRANSLATIONS) return Promise.resolve(true);
    if (_translationPromise) return _translationPromise;
    _translationPromise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = TRANSLATION_SCRIPT + '?v=20260926';
      s.onload = () => resolve(!!window.DLO_TRANSLATIONS);
      s.onerror = () => { console.error('[DLO] translations.js could not be loaded'); resolve(false); };
      document.head.appendChild(s);
    });
    return _translationPromise;
  }

  function restoreOriginalText(root) {
    root.querySelectorAll('[data-dlo-original-title-text]').forEach(el => {
      document.title = el.getAttribute('data-dlo-original-title-text');
      el.removeAttribute('data-dlo-original-title-text');
    });
    // Restore all saved attributes (stored as JSON map on the element)
    root.querySelectorAll('[data-dlo-original-attrs]').forEach(el => {
      try {
        const saved = JSON.parse(el.getAttribute('data-dlo-original-attrs'));
        Object.keys(saved).forEach(name => el.setAttribute(name, saved[name]));
      } catch (e) {}
      el.removeAttribute('data-dlo-original-attrs');
    });
    // Legacy single-attribute restore (backward compat)
    root.querySelectorAll('[data-dlo-original-attr]').forEach(el => {
      const name = el.getAttribute('data-dlo-original-attr-name');
      const value = el.getAttribute('data-dlo-original-attr');
      if (name) el.setAttribute(name, value);
      el.removeAttribute('data-dlo-original-attr');
      el.removeAttribute('data-dlo-original-attr-name');
    });
    root.querySelectorAll('*').forEach(el => {
      if (el.__dloOriginalTextNodes) {
        el.__dloOriginalTextNodes.forEach(pair => { if (pair[0]) pair[0].nodeValue = pair[1]; });
        el.__dloOriginalTextNodes = null;
      }
    });
  }

  function applyLanguage(lang, options) {
    if (!['en','hi','ur'].includes(lang)) lang = 'en';
    const root = document.body || document.documentElement;
    const page = translationPageKey();
    restoreOriginalText(root);

    // Always preserve the site's physical LTR layout, including Urdu.
    document.documentElement.dir = 'ltr';
    document.documentElement.style.direction = 'ltr';
    document.documentElement.style.writingMode = 'horizontal-tb';
    document.body.dir = 'ltr';
    document.body.style.direction = 'ltr';
    document.body.style.writingMode = 'horizontal-tb';

    if (lang !== 'en') {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CODE|PRE)$/.test(parent.tagName)) return;
        if (parent.closest('[data-dlo-no-translate], script, style, noscript, template, code, pre')) return;
        const source = node.nodeValue;
        if (!source || !source.trim()) return;
        const key = source.trim();
        const translated = translateKey(key, lang, page);
        if (translated !== key) {
          parent.__dloOriginalTextNodes = parent.__dloOriginalTextNodes || [];
          parent.__dloOriginalTextNodes.push([node, source]);
          node.nodeValue = source.replace(key, translated);
        }
      });

      // Save ALL translatable attributes per element in a single JSON blob,
      // so switching Urdu → Hindi → English restores correctly (no leakage).
      const ATTR_NAMES = ['title', 'placeholder', 'aria-label', 'alt', 'value', 'aria-description'];
      root.querySelectorAll(ATTR_NAMES.map(a => `[${a}]`).join(',')).forEach(el => {
        const saved = {};
        let anyTranslated = false;
        ATTR_NAMES.forEach(name => {
          if (!el.hasAttribute(name)) return;
          const source = el.getAttribute(name);
          if (!source || !source.trim()) return;
          const translated = translateKey(source.trim(), lang, page);
          if (translated !== source.trim()) {
            saved[name] = source;
            el.setAttribute(name, translated);
            anyTranslated = true;
          }
        });
        if (anyTranslated) {
          el.setAttribute('data-dlo-original-attrs', JSON.stringify(saved));
        }
      });

      const titleKey = document.title.trim();
      const titleTranslation = translateKey(titleKey, lang, page);
      if (titleTranslation !== titleKey) {
        document.documentElement.setAttribute('data-dlo-original-title-text', titleKey);
        document.title = titleTranslation;
      }
    }
    updateLanguageControls(lang);
    // Notify pages that language has been applied (e.g. carousel re-checks active slide)
    try { document.dispatchEvent(new CustomEvent('dlo:language-applied', { detail: { lang } })); } catch (e) {}
  }

  function updateLanguageControls(lang) {
    document.querySelectorAll('[data-dlo-language-option]').forEach(btn => {
      const active = btn.getAttribute('data-dlo-language-option') === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function setLanguage(lang) {
    return loadTranslations().then(ok => {
      if (!ok) return false;
      try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (e) {}
      applyLanguage(lang);
      return true;
    });
  }

  function initLanguage() {
    loadTranslations().then(ok => { if (ok) applyLanguage(currentLanguage(), {silent:true}); });
  }

  function initTranslationObserver() {
    const root = document.body;
    if (!root || root.__dloTranslationObserver) return;
    let running = false;
    const observer = new MutationObserver(() => {
      if (running || currentLanguage() === 'en') return;
      running = true;
      observer.disconnect();
      applyLanguage(currentLanguage(), {silent:true});
      observer.observe(root, {childList:true, subtree:true});
      running = false;
    });
    observer.observe(root, {childList:true, subtree:true});
    root.__dloTranslationObserver = observer;
  }

  const FONT_SIZES = [
    { key: 'small', label: 'Small', pct: 87.5 },
    { key: 'default', label: 'Default', pct: 100 },
    { key: 'medium', label: 'Medium', pct: 112.5 },
    { key: 'large', label: 'Large', pct: 125 }
  ];
  const FONT_SIZE_KEY = 'dlo-font-size';

  function getStoredFontSize() {
    try { return localStorage.getItem(FONT_SIZE_KEY) || 'default'; } catch (e) { return 'default'; }
  }
  function applyFontSize(key) {
    const entry = FONT_SIZES.find(s => s.key === key) || FONT_SIZES[1];
    document.documentElement.style.fontSize = entry.pct + '%';
    try { localStorage.setItem(FONT_SIZE_KEY, entry.key); } catch (e) {}
  }
  // Applied immediately (not gated behind DOMContentLoaded) so text doesn't
  // visibly jump size after first paint on a return visit.
  applyFontSize(getStoredFontSize());

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

  function themeIconSvg(isLight) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    if (isLight) {
      // Moon (switch TO dark)
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
      svg.appendChild(path);
    } else {
      // Sun (switch TO light)
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '4.2');
      svg.appendChild(c);
      [[12,2,12,4.5],[12,19.5,12,22],[2,12,4.5,12],[19.5,12,22,12],
       [4.9,4.9,6.6,6.6],[17.4,17.4,19.1,19.1],[4.9,19.1,6.6,17.4],[17.4,6.6,19.1,4.9]]
        .forEach(([x1,y1,x2,y2]) => {
          const l = document.createElementNS(ns, 'line');
          l.setAttribute('x1', x1); l.setAttribute('y1', y1);
          l.setAttribute('x2', x2); l.setAttribute('y2', y2);
          svg.appendChild(l);
        });
    }
    return svg;
  }

  function homeIconSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p1 = document.createElementNS(ns, 'path');
    p1.setAttribute('d', 'M3 11l9-8 9 8');
    const p2 = document.createElementNS(ns, 'path');
    p2.setAttribute('d', 'M5 10v10h5v-6h4v6h5V10');
    svg.appendChild(p1); svg.appendChild(p2);
    return svg;
  }

  function searchIconSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '11'); c.setAttribute('cy', '11'); c.setAttribute('r', '7');
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', '21'); l.setAttribute('y1', '21'); l.setAttribute('x2', '16.65'); l.setAttribute('y2', '16.65');
    svg.appendChild(c); svg.appendChild(l);
    return svg;
  }

  function globeIconSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '9');
    const e1 = document.createElementNS(ns, 'ellipse');
    e1.setAttribute('cx', '12'); e1.setAttribute('cy', '12'); e1.setAttribute('rx', '4'); e1.setAttribute('ry', '9');
    const l1 = document.createElementNS(ns, 'line');
    l1.setAttribute('x1', '3'); l1.setAttribute('y1', '12'); l1.setAttribute('x2', '21'); l1.setAttribute('y2', '12');
    svg.appendChild(c); svg.appendChild(e1); svg.appendChild(l1);
    return svg;
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
    // The menu is injected into <body>. If a page calls injectMenu() before
    // <body> exists, defer it until DOMContentLoaded instead of failing.
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', injectMenu, { once: true });
      return;
    }

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

    // ── Search button — links straight to the case-search page ──
    const searchBtn = el('a', {
      href: 'search-filter-cases.html', class: 'k-toolbar-btn',
      'aria-label': 'Search cases', title: 'Search cases'
    }, [searchIconSvg()]);

    // ── Theme toggle in toolbar ──
    const toolbarThemeBtn = el('button', {
      type: 'button', id: 'kToolbarTheme', class: 'k-toolbar-btn',
      'aria-label': 'Toggle light/dark theme', title: 'Toggle light/dark theme'
    }, [themeIconSvg(document.body.classList.contains('light-mode'))]);
    toolbarThemeBtn.addEventListener('click', () => {
      toggleTheme();
      toolbarThemeBtn.innerHTML = '';
      toolbarThemeBtn.appendChild(themeIconSvg(document.body.classList.contains('light-mode')));
    });

    // ── Generic small popover used by both Language and Size ──
    function buildPopoverButton(opts) {
      const btn = el('button', {
        type: 'button', class: 'k-toolbar-btn', 'aria-haspopup': 'true',
        'aria-expanded': 'false', 'aria-label': opts.label, title: opts.label
      }, [opts.icon()]);
      const pop = el('div', { class: 'k-popover', role: 'menu' });
      opts.items.forEach(item => {
        const optBtn = el('button', { type: 'button', class: 'k-popover-item', role: 'menuitem' }, [
          el('span', { class: 'k-popover-item-main', text: item.main }),
          item.sub ? el('span', { class: 'k-popover-item-sub', text: item.sub }) : el('span')
        ]);
        optBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          opts.onSelect(item);
          closePop();
        });
        pop.appendChild(optBtn);
      });
      function openPop() {
        document.querySelectorAll('.k-popover.open').forEach(p => { if (p !== pop) p.classList.remove('open'); });
        pop.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        // Pause carousel while popover is open
        if (typeof global.slideTimerPause === 'function') global.slideTimerPause();
      }
      function closePop() {
        pop.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        // Resume carousel when popover closes (only if menu is also closed)
        const curtainOpen = document.getElementById('kCurtain') &&
                            document.getElementById('kCurtain').classList.contains('open');
        if (!curtainOpen && typeof global.slideTimerResume === 'function') global.slideTimerResume();
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.classList.contains('open') ? closePop() : openPop();
      });
      document.addEventListener('click', (e) => {
        if (!pop.contains(e.target) && e.target !== btn) closePop();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
      return { btn, pop };
    }

    const langWidget = buildPopoverButton({
      label: 'Translate this page',
      icon: globeIconSvg,
      items: LANGUAGES.map(l => ({ main: l.native, sub: l.code === 'en' ? '' : l.label, code: l.code })),
      onSelect: (item) => { setLanguage(item.code); }
    });

    const sizeWidget = buildPopoverButton({
      label: 'Text size',
      icon: () => el('span', { class: 'k-size-icon', text: 'A' }),
      items: FONT_SIZES.map(s => ({ main: s.label, sub: '', key: s.key })),
      onSelect: (item) => applyFontSize(item.key)
    });

    const langWrap = el('div', { class: 'k-toolbar-item' }, [langWidget.btn, langWidget.pop]);
    const sizeWrap = el('div', { class: 'k-toolbar-item' }, [sizeWidget.btn, sizeWidget.pop]);

    // ── Home button — shown on every page except index.html ──
    const isHomePage = (currentFile === 'index.html' || currentFile === '');
    const homeBtn = el('a', {
      href: 'index.html', class: 'k-toolbar-btn',
      'aria-label': 'Home', title: 'Home'
    }, [homeIconSvg()]);

    // Order: [home?] search lang size theme menu
    const toolbarChildren = isHomePage
      ? [searchBtn, langWrap, sizeWrap, toolbarThemeBtn, trigger]
      : [homeBtn, searchBtn, langWrap, sizeWrap, toolbarThemeBtn, trigger];

    const toolbar = el('div', { class: 'k-toolbar' }, toolbarChildren);

    // ── Grouped menu links ──
    // Four groups: Casework | Performance & Data | Office & Public | Secure Access
    const NAV_GROUPS = [
      {
        label: 'Casework',
        items: [
          { href: 'search-filter-cases.html',  label: 'Search Cases' },
          { href: 'hearings.html',             label: 'Upcoming Hearings' },
          { href: 'causelist.html',            label: 'Daily Cause List' },
          { href: 'history.html',              label: 'Case History & Proceedings' },
          { href: 'latest-updates.html',       label: 'Latest Updates (Orders & Circulars)' }
        ]
      },
      {
        label: 'Performance & Data',
        items: [
          { href: 'performance.html',            label: 'Counsel Performance' },
          { href: 'statistics.html',             label: 'Live Statistics' },
          { href: 'analytics.html',              label: 'Analytics Dashboard' },
          { href: 'court-wise-distribution.html',label: 'Court-wise Distribution' }
        ]
      },
      {
        label: 'Office & Public Information',
        items: [
          { href: 'areas-of-practice.html',  label: 'Areas of Legal Practice' },
          { href: 'our-officials.html',       label: 'Our Officials' },
          { href: 'public-enquiries.html',    label: 'Public Enquiries' },
          { href: 'contact.html',             label: 'Contact Us' },
          { href: 'about-office.html',        label: 'About the Office' }
        ]
      },
      {
        label: 'Secure Access',
        items: [
          { href: 'department.html', label: 'Departmental Login' },
          { href: 'operator.html',   label: 'Staff Login (Official 2FA)' }
        ]
      }
    ];

    // Build body: grid of group columns
    const bodyChildren = [];
    NAV_GROUPS.forEach(group => {
      const list = el('ul', { class: 'k-curtain-list' });
      group.items.forEach(item => {
        const isCurrent = item.href === currentFile;
        const link = el('a', {
          class: 'k-curtain-link',
          href: item.href
        }, [el('span', { text: item.label })]);
        if (isCurrent) {
          link.setAttribute('aria-current', 'page');
          link.removeAttribute('href');
          link.setAttribute('role', 'link');
          link.setAttribute('aria-disabled', 'true');
          link.setAttribute('tabindex', '-1');
        }
        list.appendChild(el('li', { class: 'k-curtain-item' }, [link]));
      });

      // Fallback click handler for touch/PWA browsers
      list.addEventListener('click', (e) => {
        const link = e.target.closest('.k-curtain-link');
        if (!link || link.getAttribute('aria-disabled') === 'true') return;
        const href = link.getAttribute('href');
        if (!href) return;
        if (e.defaultPrevented) {
          e.stopPropagation();
          window.location.assign(href);
        }
      }, true);

      const groupEl = el('div', { class: 'k-nav-group' }, [
        el('span', { class: 'k-nav-group-label', text: group.label }),
        list
      ]);
      bodyChildren.push(groupEl);
    });

    const body = el('div', { class: 'k-curtain-body' }, bodyChildren);

    // ── Install App button (inside curtain footer) ──
    const installBtnIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 19h16"/></svg>`;
    const installBtn = el('button', {
      type: 'button', id: 'kMenuInstallBtn', class: 'k-curtain-install-btn',
      'aria-label': 'Install DLO Kupwara Web App'
    });
    installBtn.innerHTML = installBtnIcon + '<span id="kMenuInstallLabel">Install App</span>';

    // ── Developer info icon (in footer) ──
    const devIcon = el('button', {
      type: 'button', class: 'k-dev-icon', id: 'kDevIcon',
      'aria-label': 'About the developer', title: 'About the developer'
    }, [infoIconSvg()]);

    const footer = el('div', { class: 'k-curtain-footer' }, [devIcon, installBtn]);

    const closeBtn = el('button', {
      type: 'button', class: 'k-curtain-close', id: 'kCurtainClose'
    }, [document.createTextNode('Close')]);

    const themeBtn = el('button', {
      type: 'button', class: 'k-theme-toggle', id: 'kThemeToggle',
      'aria-label': 'Toggle light/dark theme', title: 'Toggle light/dark theme'
    }, [themeIconSvg(document.body.classList.contains('light-mode'))]);

    const topbar = el('div', { class: 'k-curtain-topbar' }, [
      el('span', { class: 'k-curtain-brand', text: 'DLO Kupwara' }),
      el('div', { class: 'k-curtain-topbar-actions' }, [themeBtn, closeBtn])
    ]);

    const curtain = el('div', {
      id: 'kCurtain', class: 'k-curtain', role: 'dialog',
      'aria-modal': 'true', 'aria-label': 'Site menu'
    }, [topbar, body, footer]);

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

    document.body.appendChild(toolbar);
    document.body.appendChild(curtain);
    document.body.appendChild(modal);

    // ── Curtain open/close with focus management and carousel pause ──
    function openCurtain() {
      curtain.classList.add('open');
      trigger.classList.add('is-active');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('menu-open');
      document.body.classList.add('menu-open');
      // Focus first link in curtain
      const firstLink = curtain.querySelector('.k-curtain-link:not([aria-disabled="true"])');
      if (firstLink) { setTimeout(() => firstLink.focus(), 60); }
      // Pause homepage carousel if present
      if (typeof global.slideTimerPause === 'function') global.slideTimerPause();
      document.dispatchEvent(new CustomEvent('dlo:menu-open'));
    }
    function closeCurtain() {
      curtain.classList.remove('open');
      trigger.classList.remove('is-active');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.documentElement.classList.remove('menu-open');
      document.body.classList.remove('menu-open');
      // Return focus to the trigger button
      trigger.focus();
      // Resume homepage carousel
      if (typeof global.slideTimerResume === 'function') global.slideTimerResume();
      document.dispatchEvent(new CustomEvent('dlo:menu-close'));
    }
    function toggleCurtainFn() {
      if (curtain.classList.contains('open')) closeCurtain(); else openCurtain();
    }
    function openDevModal() { modal.classList.add('open'); }
    function closeDevModal() { modal.classList.remove('open'); }

    trigger.addEventListener('click', toggleCurtainFn);
    closeBtn.addEventListener('click', closeCurtain);
    themeBtn.addEventListener('click', () => {
      toggleTheme();
      const isLight = document.body.classList.contains('light-mode');
      themeBtn.innerHTML = '';
      themeBtn.appendChild(themeIconSvg(isLight));
      // Keep toolbar theme button in sync
      if (toolbarThemeBtn) {
        toolbarThemeBtn.innerHTML = '';
        toolbarThemeBtn.appendChild(themeIconSvg(isLight));
      }
    });
    devIcon.addEventListener('click', openDevModal);
    modalClose.addEventListener('click', closeDevModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDevModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (modal.classList.contains('open')) closeDevModal();
      else if (curtain.classList.contains('open')) closeCurtain();
    });
    // Trap Tab inside curtain when open
    curtain.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !curtain.classList.contains('open')) return;
      const focusable = Array.from(curtain.querySelectorAll(
        'a[href]:not([aria-disabled="true"]), button:not([disabled]), [tabindex="0"]'
      )).filter(el => !el.closest('[aria-hidden="true"]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // ── PWA install button inside curtain ──
    (function wireInstallBtn() {
      function isStandalone() {
        try {
          if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
          if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
          if (navigator.standalone === true) return true;
        } catch(e) {}
        return false;
      }
      if (isStandalone()) return;

      const label = document.getElementById('kMenuInstallLabel');
      let deferredPrompt = null;
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

      function showInstallBtn(text) {
        if (text && label) label.textContent = text;
        installBtn.classList.add('k-install-visible');
      }

      if (isIOS) showInstallBtn('Add to Home Screen');

      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBtn('Install App');
      });
      window.addEventListener('appinstalled', function() {
        deferredPrompt = null;
        installBtn.classList.remove('k-install-visible');
      });

      installBtn.addEventListener('click', function() {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(choice) {
            if (choice && choice.outcome === 'accepted') {
              installBtn.classList.remove('k-install-visible');
            }
            deferredPrompt = null;
          }).catch(function() { deferredPrompt = null; });
          return;
        }
        if (isIOS) {
          if (window.DLO && DLO.showToast) DLO.showToast('Share → Add to Home Screen', 'info', 6000);
          return;
        }
        const isAndroid = /android/i.test(navigator.userAgent || '');
        const msg = isAndroid
          ? 'Open the Chrome menu (⋮) → "Install app" or "Add to Home screen".'
          : 'Open the browser menu → "Install app".';
        if (window.DLO && DLO.showToast) DLO.showToast(msg, 'info', 7000);
      });
    })();

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
    fetchCaseDiary,
    setLanguage,
    applyLanguage,
    currentLanguage,
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

  // Initialize saved language after the page has loaded its DOM.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { initLanguage(); initTranslationObserver(); }, { once:true });
  else { initLanguage(); initTranslationObserver(); }

})(window);

