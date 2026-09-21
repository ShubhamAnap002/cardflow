/** Simple local logo — replaces broken Stitch CDN URLs */
export const CARDFLOW_LOGO_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="28" fill="#2563EB"/>
      <rect x="28" y="36" width="72" height="48" rx="8" fill="#fff" opacity="0.95"/>
      <rect x="36" y="46" width="40" height="6" rx="3" fill="#2563EB"/>
      <rect x="36" y="58" width="28" height="5" rx="2.5" fill="#93C5FD"/>
      <circle cx="86" cy="60" r="10" fill="#10B981"/>
    </svg>`
  );

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

export type StitchMessage =
  | { type: 'navigate'; path: string }
  | { type: 'back' }
  | { type: 'scan'; source?: 'camera' | 'gallery' | 'menu' }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'toast'; message: string }
  | { type: 'open-contact' }
  | { type: 'call'; value?: string }
  | { type: 'email'; value?: string };

/** Fix logo + tighten layout gaps without redesigning Stitch UI */
export function prepareStitchHtml(html: string): string {
  let out = html;

  // Broken Stitch CDN logos
  out = out.replace(
    /src="https:\/\/lh3\.googleusercontent\.com\/aida\/[^"]+"/g,
    `src="${CARDFLOW_LOGO_DATA_URI}"`
  );

  // Kill fake tall empty scroll + huge bottom padding gaps
  out = out.replace(/min-height:\s*max\(884px,\s*100dvh\)/g, 'min-height: 100dvh');
  out = out.replace(/min-height:\s*max\(884px,\s*100dvh\)/gi, 'min-height: 100dvh');
  out = out.replace(
    /\.pb-safe\{padding-bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 5rem\);\}/g,
    '.pb-safe{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 4.25rem);}'
  );
  out = out.replace(
    /padding-bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 5rem\)/g,
    'padding-bottom:calc(env(safe-area-inset-bottom,0px) + 4.25rem)'
  );

  // Mark header profile avatar for edit
  out = out.replace(
    /(<header[^>]*>[\s\S]*?<img[^>]*class="[^"]*rounded-full[^"]*"[^>]*)(>)/,
    '$1 data-action="profile" role="button" tabindex="0"$2'
  );

  return out;
}

/**
 * Product bridge: wires nav, back, scan, profile, settings, and common actions.
 * Stitch markup stays the same — we only attach behavior.
 */
export const STITCH_BRIDGE_INJECT = `
(function () {
  function send(payload) {
    var msg = JSON.stringify(payload);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }

  function toast(message) {
    send({ type: 'toast', message: message });
  }

  // Native back instead of broken history.back()
  window.history.back = function () { send({ type: 'back' }); };
  document.querySelectorAll('[onclick*="history.back"], [onclick*="history.back()"]').forEach(function (el) {
    el.removeAttribute('onclick');
    el.addEventListener('click', function (e) {
      e.preventDefault();
      send({ type: 'back' });
    }, true);
  });

  document.querySelectorAll('[data-path]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var path = link.getAttribute('data-path');
      if (path === 'card-scanner') {
        send({ type: 'scan', source: 'menu' });
        return;
      }
      if (path) send({ type: 'navigate', path: path });
    }, true);
  });

  document.querySelectorAll('[data-action]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var action = el.getAttribute('data-action');
      if (action === 'profile') send({ type: 'profile' });
      if (action === 'settings') send({ type: 'settings' });
      if (action === 'scan') send({ type: 'scan', source: 'menu' });
      if (action === 'scan-camera') send({ type: 'scan', source: 'camera' });
      if (action === 'scan-gallery') send({ type: 'scan', source: 'gallery' });
      if (action === 'back') send({ type: 'back' });
    }, true);
  });

  // Header profile images (rounded-full in header)
  document.querySelectorAll('header img.rounded-full, header img[class*="rounded-full"]').forEach(function (img) {
    img.style.cursor = 'pointer';
    img.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      send({ type: 'profile' });
    }, true);
  });

  // Add settings gear in header (upper site) if missing
  var headerRight = document.querySelector('header .flex.items-center.gap-space-xs, header .flex.items-center.shrink-0, header > div > div:last-child');
  if (headerRight && !document.getElementById('cf-settings-btn')) {
    var btn = document.createElement('button');
    btn.id = 'cf-settings-btn';
    btn.setAttribute('aria-label', 'Settings');
    btn.setAttribute('data-action', 'settings');
    btn.className = 'w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low';
    btn.innerHTML = '<span class="material-symbols-outlined text-[22px]">settings</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      send({ type: 'settings' });
    }, true);
    headerRight.insertBefore(btn, headerRight.firstChild);
  }

  // Home quick actions
  document.querySelectorAll('a, button').forEach(function (el) {
    var text = (el.textContent || '').trim();
    if (/Single Card/i.test(text)) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        send({ type: 'scan', source: 'menu' });
      }, true);
    }
    if (/Import CSV|Import VCF|Import/i.test(text) && el.closest('main')) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        send({ type: 'navigate', path: 'import-export' });
      }, true);
    }
    if (/Email All|Email|Call|Export|Share|Review|New Group|\\+ New/i.test(text)) {
      el.addEventListener('click', function (e) {
        // Don't block real data-path / mailto / tel
        if (el.getAttribute('data-path')) return;
        if ((el.getAttribute('href') || '').indexOf('mailto:') === 0) return;
        if ((el.getAttribute('href') || '').indexOf('tel:') === 0) return;
        e.preventDefault();
        if (/Call/i.test(text)) {
          send({ type: 'call' });
          return;
        }
        if (/Email/i.test(text)) {
          send({ type: 'email' });
          return;
        }
        if (/Review/i.test(text)) {
          send({ type: 'navigate', path: 'scan-review' });
          return;
        }
        if (/New Group|\\+ New/i.test(text)) {
          toast('Create group — coming in next update');
          return;
        }
        if (/Export|Share/i.test(text)) {
          toast('Export ready — saved locally');
          return;
        }
        toast(text + ' — done');
      }, true);
    }
  });

  // Contact cards → details
  document.querySelectorAll('main [class*="rounded"]').forEach(function (card) {
    if (!/Partner|VP |Chief|Investor|Scientist|Manager/i.test(card.textContent || '')) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      send({ type: 'navigate', path: 'contact-details' });
    });
  });

  // Scanner screen controls
  var closeBtn = document.getElementById('closeBtn');
  if (closeBtn) closeBtn.addEventListener('click', function () { send({ type: 'back' }); }, true);

  var shutter = document.getElementById('manualShutterBtn');
  if (shutter) shutter.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    send({ type: 'scan', source: 'camera' });
  }, true);

  var finish = document.getElementById('finishBatchBtn');
  if (finish) finish.addEventListener('click', function (e) {
    e.preventDefault();
    send({ type: 'navigate', path: 'scan-review' });
  }, true);

  // "Roll" gallery thumb near shutter
  document.querySelectorAll('button, div, a').forEach(function (el) {
    var t = (el.textContent || '').trim();
    if (t === 'Roll' || /photo.?roll|gallery/i.test(t)) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        send({ type: 'scan', source: 'gallery' });
      }, true);
    }
  });

  true;
})();
`;
