DLO homepage updates — final files

Replace the matching index.html, common.js, and config.js files in the website repository with these files.

Google Sheets setup
1. Publish the updates worksheet as CSV.
2. In config.js, paste its published CSV URL into DLO_CONFIG.updates.sheetCsvUrl.
3. Use the headings Date, Heading, Body, Attachments (case-insensitive). Enter dates as YYYY-MM-DD. Attachments can be blank; add one public URL per line, or use Label|URL to set a link label.

The published CSV is public and read-only. The final files do not contain a sheet URL because none was supplied.

The homepage keeps its existing quote copy when no updates are available. Hero image paths use WebP, including the fallback files hero-entrance.webp and signage-detail.webp. Those image assets were not attached, so confirm they exist at the paths used in index.html before publishing.

The app-install action is in the site menu footer. The homepage controls are confined to the black editorial panel: a progress rail, smaller circular previous/next and pause controls, and a simple unbordered “+ MORE UPDATES →” link that opens the right-side updates drawer.

A dismissible website notice is centered over the hero photo. It appears one minute after page load and reappears one minute after each dismissal. Its wording is a plain-language draft and should be approved by the office before publication.
