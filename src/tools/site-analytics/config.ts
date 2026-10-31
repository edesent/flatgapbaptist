// Site Analytics — per-church configuration.
//
// The key is a read-only analytics key (sak_…) minted by elijahdesent.com for
// THIS site's domains. It can only read this site's visitor counts, so it is
// fine to keep here in the repo. Mint one per site — see the README.

export const analyticsConfig = {
  // The analytics API. Leave as-is.
  apiBase: "https://www.elijahdesent.com/api/site-stats",

  // This site's analytics key: flatgapbaptist.org + flatgapbaptist.elijahdesent.com.
  key: "sak_eyJoIjpbImZsYXRnYXBiYXB0aXN0LmVsaWphaGRlc2VudC5jb20iLCJmbGF0Z2FwYmFwdGlzdC5vcmciXX0.SOhFuW7tN8BGGRt5EcxjoJ_B",

  // Shown in the page heading.
  siteName: "Flat Gap Baptist Church",

  // The church's time zone: "today" and each day's midnight are counted here.
  timeZone: "America/New_York",
};
