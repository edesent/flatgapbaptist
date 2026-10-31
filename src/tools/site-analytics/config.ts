// Site Analytics — per-church configuration. Safe for the browser: no key here.

export const analyticsConfig = {
  // Shown in the page heading.
  siteName: "Flat Gap Baptist Church",

  // The church's time zone: "today" and each day's midnight are counted here.
  timeZone: "America/New_York",

  // true  → the page asks for the site editor's emailed sign-in link (same
  //         EDIT_EMAILS as /edit) and loads the numbers through the site's own
  //         /api/edit/analytics route. The key stays on the server (key.ts).
  //         Needs the DFD editor installed (src/edit).
  // false → anyone with the page's address sees the numbers; the browser calls
  //         elijahdesent.com directly with `publicKey`. For demos without the editor.
  signIn: true,

  // Only when signIn is false: the site's analytics key (sak_…).
  publicKey: "",
};
