/**
 * DLO Kupwara — Central Configuration
 * Single source of truth for office details, team, courts, and app version.
 * Update this file only when office information changes.
 */
window.DLO_CONFIG = {
  version: '2.1.0',
  buildDate: '2026-09-21',

  office: {
    fullName: 'District Litigation Office Kupwara',
    shortName: 'DLO Kupwara',
    department: 'Department of Law, Justice & Parliamentary Affairs',
    government: 'Government of Jammu & Kashmir',
    address: 'District Court Complex, Kupwara, Jammu & Kashmir – 193222',
    phone: '+91-1955-XXXXXX',
    email: 'dlo.kupwara@jk.gov.in',
    website: 'https://dlokupwara.in',
    workingHours: 'Mon–Sat 10:00 AM – 4:30 PM (IST)'
  },

  // Officials (update names/designations as required)
  officials: [
    { role: 'District Litigation Officer', name: '—', order: 1 },
    { role: 'Superintendent', name: '—', order: 2 },
    { role: 'Standing Counsel', name: '—', order: 3 },
    { role: 'Junior Assistant', name: '—', order: 4 }
  ],

  // Courts commonly handled (used by filters & distribution)
  courts: [
    'District Court Kupwara',
    'Additional District Court Kupwara',
    'Chief Judicial Magistrate Kupwara',
    'Munsiff Court Kupwara',
    'Special Mobile Magistrate',
    'High Court of J&K and Ladakh (Srinagar Wing)'
  ],

  // Case status vocabulary used across filters & analytics
  statuses: ['Pending', 'Disposed', 'Transferred', 'Stayed', 'Ex-parte'],

  // Departments
  departments: [
    'Revenue', 'Police', 'Forest', 'PWD', 'Education',
    'Health', 'Irrigation', 'Social Welfare', 'Others'
  ],

  // Theme defaults
  theme: {
    defaultMode: 'dark',          // 'dark' | 'light'
    storageKey: 'dlo-theme-mode'
  },

  // Feature flags (client-side)
  features: {
    skeletons: true,
    toasts: true,
    offlineToast: true,
    themeToggle: true
  }
};
