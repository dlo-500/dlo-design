DLO Kupwara app dashboard update

The app home screen follows the supplied dashboard reference: a branded header, greeting and daily glance, a prominent My Cases card, and compact grouped action cards. It uses responsive sizing and motion that respects the visitor's reduced-motion setting. Dark mode remains the default; the theme control keeps the visitor's choice across app pages.

The supplied DLO Kupwara artwork is the app icon. The bottom bar follows the reference with Home, Cases, Hearings, History, and More; More opens the site menu. Home and Cases taps navigate directly, with larger touch targets. Internal app pages retain app mode and are prefetched when supported. Shared case records are cached for the current browser tab and shown immediately on return while older data refreshes quietly.

Upload or replace these files in the existing repository:
- index.html
- analytics.html
- search-filter-cases.html
- common.js
- config.js
- menu.css
- manifest.json
- all files under icons/, including the supplied app icon artwork

Keep the site's other page files, stylesheets, logo, and existing service worker in place. After changing the manifest icon, reinstall the PWA if the device continues showing its previously cached icon. This package does not include a live site deployment. First-time page visits still need a network response; subsequent visits can reuse browser and tab-session caches.
