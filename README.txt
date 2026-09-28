DLO Kupwara PWA app and analytics update

Upload these files to the existing site repository:
- Replace index.html, analytics.html, common.js, config.js, and menu.css.
- Replace manifest.json.
- Add every file from icons/ at the same relative paths, including the new Department Login shortcut icon.

The app dashboard uses the same shared case-data loader and statistics calculation as the website analytics. No additional SQL function or Supabase policy change is needed. Its public error message is deliberately simple and directs visitors to retry without exposing technical details.

Keep the site's existing styles.css, logo.png, emblem and service worker files in place. The shared toolbar now occupies its own top row on content pages so it cannot cover headings; in the installed app its search, language, text-size and theme controls sit in the branded app bar. The shared theme toggle works across pages, starts in dark mode and remembers the visitor's later choice. A new storage key resets an old saved light preference once.

Quick-access icons appear before the case overview on the app home screen. The app layout adapts to available viewport width, uses line icons with short hover/entrance motion, respects safe areas and reduced-motion preferences, and supports either orientation. Analytics panels and the department table scroll horizontally on narrow screens. The attached screenshots guided the spacing fix; the icon artwork remains in the site's DLO navy and gold style.
