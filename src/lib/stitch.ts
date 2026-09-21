export type StitchPath =
  | 'home'
  | 'contacts'
  | 'card-scanner'
  | 'groups'
  | 'settings'
  | 'favorites'
  | 'contact-details'
  | 'scan-processing'
  | 'scan-review'
  | 'import-export';

/** One HTML file per Stitch screen — exact UI from your designs */
export const STITCH_SCREENS: Record<StitchPath, number> = {
  home: require('../../assets/stitch/home.html'),
  contacts: require('../../assets/stitch/contacts.html'),
  'card-scanner': require('../../assets/stitch/card-scanner.html'),
  groups: require('../../assets/stitch/groups.html'),
  settings: require('../../assets/stitch/settings.html'),
  favorites: require('../../assets/stitch/favorites.html'),
  'contact-details': require('../../assets/stitch/contact-details.html'),
  'scan-processing': require('../../assets/stitch/scan-processing.html'),
  'scan-review': require('../../assets/stitch/scan-review.html'),
  'import-export': require('../../assets/stitch/import-export.html'),
};

export const DEFAULT_STITCH_PATH: StitchPath = 'home';

/** Wires existing `data-path` links in Stitch HTML */
export const STITCH_NAV_INJECT = `
(function () {
  function go(path) {
    var msg = JSON.stringify({ type: 'navigate', path: path });
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }
  document.querySelectorAll('[data-path]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var path = link.getAttribute('data-path');
      if (path) go(path);
    }, true);
  });
  true;
})();
`;
