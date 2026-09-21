/**
 * Stitch screens are authored as standalone HTML. We never redesign them here —
 * `prepareStitchHtml` only repairs assets/spacing and tags elements so the
 * bridge can attach native behaviour, and `STITCH_BRIDGE_INJECT` wires taps to
 * React Native.
 */

import { STITCH_HTML } from '@/stitch/html-bundle';

const svgDataUri = (markup: string) =>
  'data:image/svg+xml,' + encodeURIComponent(markup.replace(/\s+/g, ' ').trim());

/** App logo — replaces the expired Stitch CDN URLs. */
export const CARDFLOW_LOGO_DATA_URI = svgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#2563EB"/>
    <rect x="28" y="36" width="72" height="48" rx="8" fill="#fff" opacity="0.95"/>
    <rect x="36" y="46" width="40" height="6" rx="3" fill="#2563EB"/>
    <rect x="36" y="58" width="28" height="5" rx="2.5" fill="#93C5FD"/>
    <circle cx="86" cy="60" r="10" fill="#10B981"/>
  </svg>
`);

/** Neutral person placeholder for the contact portraits Stitch pulled from a CDN. */
export const CARDFLOW_AVATAR_DATA_URI = svgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" fill="#DDE3F7"/>
    <circle cx="48" cy="37" r="16" fill="#9AACD4"/>
    <path d="M16 96c0-17.7 14.3-32 32-32s32 14.3 32 32z" fill="#9AACD4"/>
  </svg>
`);

/** Neutral business-card placeholder for card/scan preview images. */
export const CARDFLOW_CARD_DATA_URI = svgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
    <rect width="320" height="200" rx="14" fill="#1E293B"/>
    <rect x="24" y="30" width="30" height="30" rx="7" fill="#2563EB"/>
    <rect x="24" y="86" width="150" height="14" rx="7" fill="#F1F5F9"/>
    <rect x="24" y="110" width="104" height="10" rx="5" fill="#7C8CA8"/>
    <rect x="24" y="140" width="130" height="8" rx="4" fill="#57657F"/>
    <rect x="24" y="156" width="96" height="8" rx="4" fill="#57657F"/>
  </svg>
`);

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

export type StitchSource = number | string;

/**
 * Prefer embedded HTML strings so release APKs always load screens
 * without Asset/FileSystem (production failure point).
 */
export const STITCH_SCREENS: Record<StitchPath, StitchSource> = {
  home: STITCH_HTML.home,
  contacts: STITCH_HTML.contacts,
  'card-scanner': STITCH_HTML['card-scanner'],
  groups: STITCH_HTML.groups,
  settings: STITCH_HTML.settings,
  favorites: STITCH_HTML.favorites,
  'contact-details': STITCH_HTML['contact-details'],
  'scan-processing': STITCH_HTML['scan-processing'],
  'scan-review': STITCH_HTML['scan-review'],
  'import-export': STITCH_HTML['import-export'],
};

export const DEFAULT_STITCH_PATH: StitchPath = 'home';

export function isStitchPath(value: string): value is StitchPath {
  return Object.prototype.hasOwnProperty.call(STITCH_SCREENS, value);
}

export type StitchMessage =
  | { type: 'ready'; path?: string }
  | { type: 'navigate'; path: string }
  | { type: 'back' }
  | { type: 'scan'; source?: 'camera' | 'gallery' | 'menu' }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'toast'; message: string }
  | { type: 'save-contact' }
  | { type: 'call'; value?: string }
  | { type: 'email'; value?: string };

const HEADER_RIGHT_OPEN = '<div class="flex items-center gap-space-xs shrink-0">';

const SETTINGS_GEAR =
  '<button id="cf-settings-btn" type="button" aria-label="Settings" data-action="settings" ' +
  'class="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant ' +
  'hover:text-on-surface hover:bg-surface-container-low active:scale-95 transition-all">' +
  '<span class="material-symbols-outlined text-[22px]">settings</span></button>';

/** Stitch mislabels the favorites header as "Card Details". */
const TITLE_OVERRIDES: Partial<Record<StitchPath, string>> = {
  favorites: 'Favorites',
};

function attr(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(tag);
  return match ? match[1] : '';
}

/** Append attributes to a tag's attribute string, keeping any self-closing slash last. */
function addAttrs(attrs: string, extra: string): string {
  const selfClosing = /\/\s*$/.test(attrs);
  const body = selfClosing ? attrs.replace(/\/\s*$/, '') : attrs;
  return `${body.replace(/\s+$/, '')} ${extra}${selfClosing ? '/' : ''}`;
}

/** Every remote image in the Stitch export is an expired CDN link. */
function localImageFor(tag: string): string {
  const alt = `${attr(tag, 'alt')} ${attr(tag, 'data-alt')}`;
  if (/cardflow/i.test(alt) && /logo/i.test(alt)) return CARDFLOW_LOGO_DATA_URI;
  if (/\bcard\b|emblem|insignia|monogram|typography|letterhead|thumbnail/i.test(alt)) {
    return CARDFLOW_CARD_DATA_URI;
  }
  return CARDFLOW_AVATAR_DATA_URI;
}

/** Layout + asset repairs. `path` lets us fix per-screen chrome. */
export function prepareStitchHtml(html: string, path?: StitchPath): string {
  let out = html;

  // 1. Swap every remote <img> for bundled artwork so nothing depends on network.
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, 'src');
    if (!/^https?:/i.test(src)) return tag;
    return tag.replace(/\bsrc="[^"]*"/i, `src="${localImageFor(tag)}"`);
  });

  // 2. Inline `onclick="history.back()"` can't work in a WebView — make it an action.
  out = out.replace(/\s?onclick="history\.back\(\)"/gi, ' data-action="back"');

  // 3. Mark elements that keep their own inline handler so the bridge leaves them alone.
  out = out.replace(
    /<(a|button|div|span|li|img|input)\b([^>]*\bonclick="[^"]*"[^>]*)>/gi,
    (tag, name: string, attrs: string) =>
      /data-cf-native/.test(attrs) ? tag : `<${name}${addAttrs(attrs, 'data-cf-native="1"')}>`
  );

  // 4. Header: the avatar must open the profile sheet, and every screen needs a gear.
  out = out.replace(/<header[\s\S]*?<\/header>/i, (header) => {
    let h = header;

    // Stitch points the header avatar at the settings screen.
    h = h.replace(/\sdata-path="settings"/g, ' data-action="profile"');
    h = h.replace(/<img\b([^>]*\balt="Profile"[^>]*)>/gi, (tag, attrs: string) =>
      /data-action=/.test(attrs)
        ? tag
        : `<img${addAttrs(attrs, 'data-action="profile" role="button" tabindex="0"')}>`
    );

    if (path !== 'settings' && !h.includes('cf-settings-btn') && h.includes(HEADER_RIGHT_OPEN)) {
      h = h.replace(HEADER_RIGHT_OPEN, HEADER_RIGHT_OPEN + SETTINGS_GEAR);
    }

    const title = path ? TITLE_OVERRIDES[path] : undefined;
    if (title) h = h.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${title}$2`);

    return h;
  });

  // 5. Bottom-nav screens need clearance under the nav; sub-screens must not have it.
  const hasBottomNav = /<nav\b[^>]*fixed[^>]*bottom-0/i.test(out);
  const bottomPad = hasBottomNav ? '4.5rem' : '1.25rem';
  out = out.replace(
    /\.pb-safe\{[^}]*\}/g,
    `.pb-safe{padding-bottom:calc(env(safe-area-inset-bottom,0px) + ${bottomPad});}`
  );

  // 6. Let the bridge know which screen it is running on.
  if (!/\bdata-cf-path=/.test(out)) {
    out = out.replace(/<body\b/i, `<body data-cf-path="${path ?? ''}"`);
  }

  const fixes = `<style id="cf-fixes">
*{-webkit-tap-highlight-color:transparent;}
html,body{max-width:100%;overflow-x:hidden;}
body{overscroll-behavior-y:contain;-webkit-text-size-adjust:100%;}
main{padding-bottom:calc(env(safe-area-inset-bottom,0px) + ${bottomPad});}
img{background-color:#eaedff;}
[data-action],[data-path],[data-cf-contact]{cursor:pointer;}
[data-action]:active,[data-path]:active,[data-cf-contact]:active{opacity:.82;}
[data-cf-contact]{transition:opacity .12s ease;}
</style>`;

  if (!out.includes('id="cf-fixes"')) {
    out = out.includes('</head>')
      ? out.replace('</head>', `${fixes}</head>`)
      : `${fixes}${out}`;
  }

  return out;
}

/**
 * One delegated listener owns every tap. Per-element listeners were the source
 * of the double-fire bugs, so the bridge resolves the nearest meaningful target
 * instead and refuses to touch controls the page already handles.
 */
export const STITCH_BRIDGE_INJECT = `
(function () {
  if (window.__cfBridge) return;
  window.__cfBridge = true;

  var PATH = (document.body && document.body.getAttribute('data-cf-path')) || '';
  var lastMsg = '';
  var lastAt = 0;

  function send(payload) {
    var msg = JSON.stringify(payload);
    var now = Date.now();
    // Same message twice in a row is always a double-fire, never intent.
    if (msg === lastMsg && now - lastAt < 700) return;
    lastMsg = msg;
    lastAt = now;
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    } catch (err) {}
  }

  function toast(message) {
    send({ type: 'toast', message: message });
  }

  function stop(e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  // Anything still calling history.back() (page scripts, injected markup).
  try {
    window.history.back = function () { send({ type: 'back' }); };
    window.history.go = function () { send({ type: 'back' }); };
  } catch (err) {}

  /** Visible label, with Material ligature text and counters stripped out. */
  function labelOf(el) {
    var clone = el.cloneNode(true);
    var icons = clone.querySelectorAll ? clone.querySelectorAll('.material-symbols-outlined') : [];
    for (var i = icons.length - 1; i >= 0; i--) {
      if (icons[i].parentNode) icons[i].parentNode.removeChild(icons[i]);
    }
    return (clone.textContent || '').replace(/[0-9,]/g, ' ').replace(/\\s+/g, ' ').trim();
  }

  var SCAN_LABELS = /^(scan|scan card|single card|scan single card|new scan|capture|batch scan)$/i;
  var GALLERY_LABELS = /^(roll|photo roll|gallery|from gallery|choose photo|upload photo)$/i;
  var LABEL_PATHS = [
    [/^favorites$/i, 'favorites'],
    [/^(import|export|import \\/ export|import and export)$/i, 'import-export'],
    [/^(groups|my groups)$/i, 'groups'],
    [/^(contacts|directory|all contacts)$/i, 'contacts'],
    [/^(home|dashboard)$/i, 'home'],
    [/^settings$/i, 'settings'],
    [/^(review|review cards|review scans)$/i, 'scan-review']
  ];

  function handlePath(p) {
    if (!p) return;
    if (p === 'card-scanner') {
      send({ type: 'scan', source: 'menu' });
      return;
    }
    send({ type: 'navigate', path: p });
  }

  function handleAction(a) {
    if (a === 'profile') send({ type: 'profile' });
    else if (a === 'settings') send({ type: 'settings' });
    else if (a === 'back') send({ type: 'back' });
    else if (a === 'scan') send({ type: 'scan', source: 'menu' });
    else if (a === 'scan-camera') send({ type: 'scan', source: 'camera' });
    else if (a === 'scan-gallery') send({ type: 'scan', source: 'gallery' });
  }

  // Screens whose cards are not people (or are already a detail view).
  var NO_CONTACT_CARDS = ['contact-details', 'scan-review', 'scan-processing', 'card-scanner', 'import-export', 'settings', 'groups'];

  /** Tag the outermost contact-looking card so taps open the detail screen once. */
  function markContactCards() {
    if (NO_CONTACT_CARDS.indexOf(PATH) !== -1) return;
    var main = document.querySelector('main');
    if (!main) return;

    var found = [];
    var nodes = main.querySelectorAll('div[class*="rounded-xl"], div[class*="rounded-2xl"], div[class*="rounded-3xl"], article');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.querySelector('h3, h4, h5')) continue;
      if (!n.querySelector('img')) continue;
      found.push(n);
    }
    for (var j = 0; j < found.length; j++) {
      var nested = false;
      for (var k = 0; k < found.length; k++) {
        if (k !== j && found[k] !== found[j] && found[k].contains(found[j])) { nested = true; break; }
      }
      if (!nested) found[j].setAttribute('data-cf-contact', '1');
    }
  }

  function onClick(e) {
    var node = e.target;
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    if (!el || !el.closest) return;

    // Typing, toggles and pickers stay untouched.
    if (el.closest('input, textarea, select, label, [contenteditable="true"]')) return;

    var link = el.closest('a[href]');
    if (link) {
      var href = (link.getAttribute('href') || '').trim();
      var lower = href.toLowerCase();
      if (lower.indexOf('mailto:') === 0) {
        stop(e);
        send({ type: 'email', value: decodeURIComponent(href.slice(7).split('?')[0]) });
        return;
      }
      if (lower.indexOf('tel:') === 0) {
        stop(e);
        send({ type: 'call', value: decodeURIComponent(href.slice(4)) });
        return;
      }
    }

    // Innermost of data-action / data-path wins, so nested markers fire once.
    var actionEl = el.closest('[data-action]');
    var pathEl = el.closest('[data-path]');
    if (actionEl && pathEl) {
      if (pathEl.contains(actionEl)) pathEl = null;
      else actionEl = null;
    }
    if (actionEl) {
      stop(e);
      handleAction(actionEl.getAttribute('data-action'));
      return;
    }
    if (pathEl) {
      stop(e);
      handlePath(pathEl.getAttribute('data-path'));
      return;
    }

    // The page owns this control (flip card, copy field, in-page toast).
    var native = el.closest('[data-cf-native]');
    if (native) {
      if (native.id === 'saveNextBtn') {
        setTimeout(function () { send({ type: 'save-contact' }); }, 220);
      }
      return;
    }

    var card = el.closest('[data-cf-contact]');
    var ctl = el.closest('a, button, [role="button"]');

    if (ctl && ctl !== card) {
      var label = labelOf(ctl);
      if (label && label.length <= 42) {
        if (SCAN_LABELS.test(label)) { stop(e); send({ type: 'scan', source: 'menu' }); return; }
        if (GALLERY_LABELS.test(label)) { stop(e); send({ type: 'scan', source: 'gallery' }); return; }
        for (var i = 0; i < LABEL_PATHS.length; i++) {
          if (LABEL_PATHS[i][0].test(label)) { stop(e); handlePath(LABEL_PATHS[i][1]); return; }
        }
      }
      var aria = ctl.getAttribute('aria-label') || '';
      if (/notification/i.test(aria)) { stop(e); toast('You are all caught up — no new notifications.'); return; }
      if (/more actions/i.test(aria)) { stop(e); toast('More actions are coming in the next update.'); return; }
      // Never let href="#" reload the WebView and blank the screen.
      if (ctl.tagName === 'A' && (ctl.getAttribute('href') || '') === '#') e.preventDefault();
      return;
    }

    if (card) {
      stop(e);
      send({ type: 'navigate', path: 'contact-details' });
    }
  }

  document.addEventListener('click', onClick, true);

  /** Screens whose controls are wired by id rather than markup attributes. */
  function bindId(id, handler) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      stop(e);
      handler();
    }, true);
  }

  bindId('closeBtn', function () { send({ type: 'back' }); });
  bindId('manualShutterBtn', function () { send({ type: 'scan', source: 'camera' }); });
  bindId('finishBatchBtn', function () { send({ type: 'navigate', path: 'scan-review' }); });
  bindId('viewCompletedBtn', function () { send({ type: 'navigate', path: 'scan-review' }); });
  bindId('bgProcessBtn', function () { send({ type: 'back' }); });

  /** Host -> page channel (scanned card preview, prefilled fields). */
  window.cfApply = function (payload) {
    if (!payload) return;
    if (payload.cardImage) {
      var targets = document.querySelectorAll('#cardPreviewImage, #card-front img, img[id*="cardPreview"]');
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].tagName === 'IMG') targets[i].src = payload.cardImage;
        else targets[i].style.backgroundImage = 'url(' + payload.cardImage + ')';
      }
    }
  };

  markContactCards();
  send({ type: 'ready', path: PATH });
  true;
})();
`;
