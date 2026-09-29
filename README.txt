DLO Kupwara app dashboard update

The app home screen is reorganised into a daily glance, Main Actions, Case Management, Office & Updates, and Administration. It uses responsive cards and motion that respects the visitor's reduced-motion setting. Dark mode remains the default; the theme control keeps the visitor's choice across app pages.

The shared app navigation keeps Home and Contact available on app pages. Internal app links retain app mode and warm their page cache before a tap when the browser supports prefetch. Shared case records are cached for the current browser tab and shown immediately on a return visit while older data refreshes quietly.

Upload or replace these files in the existing repository:
- index.html
- analytics.html
- common.js
- config.js
- menu.css
- manifest.json
- all files under icons/

Keep the site's other page files, stylesheets, logo, and existing service worker in place. This package does not include a live site deployment. First-time page visits still need a network response; subsequent visits can reuse browser and tab-session caches.
