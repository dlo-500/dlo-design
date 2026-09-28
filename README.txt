DLO Kupwara PWA app and analytics update

Upload these files to the existing site repository:
- Replace index.html and analytics.html.
- Replace manifest.json.
- Add every file from icons/ at the same relative paths, including the new Department Login shortcut icon.

Before expecting dashboard counts to load, run dashboard-stats.sql once in the Supabase SQL Editor. It creates a summary-only RPC that respects existing case_diary table privileges and RLS. It does not change any policies and does not return case rows. If the current anonymous role cannot read the columns needed for these aggregates, the dashboard will show an unavailable message; review the existing permissions before changing them.

Keep the site's existing common.js, config.js, menu.css, styles.css, logo.png, emblem and service worker files in place. The app layout adapts to available viewport width, uses line icons with short hover/entrance motion, respects safe areas and reduced-motion preferences, and supports either orientation. The theme toggle uses the existing shared theme setting. Analytics panels and the department table can be scrolled horizontally on narrow screens.

The screenshot mentioned in the request was not attached, so these icons use a simple DLO navy and gold style rather than an exact screenshot match.
