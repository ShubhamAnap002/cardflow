const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'docs/pages-upload');
let privacy = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const terms = fs.readFileSync(path.join(dir, 'terms.html'), 'utf8');

/** Load GOOGLE_SITE_VERIFICATION from process.env or repo `.env` (no dotenv dep). */
function loadSiteVerification() {
  const fromEnv = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (fromEnv) return fromEnv;
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return '';
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => /^\s*GOOGLE_SITE_VERIFICATION\s*=/.test(l) && !/^\s*#/.test(l));
  if (!line) return '';
  let v = line.replace(/^\s*GOOGLE_SITE_VERIFICATION\s*=\s*/, '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

const token = loadSiteVerification();
if (token) {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    console.error(
      'GOOGLE_SITE_VERIFICATION looks invalid. Paste only the content= token (letters, numbers, _ -), not the full <meta> tag.'
    );
    process.exit(1);
  }
  const meta = `  <meta name="google-site-verification" content="${token}" />\n`;
  const metaRe =
    /<meta\s+name=["']google-site-verification["']\s+content=["'][^"']*["']\s*\/?>/i;
  if (metaRe.test(privacy)) {
    privacy = privacy.replace(
      metaRe,
      `<meta name="google-site-verification" content="${token}" />`
    );
  } else if (privacy.includes('</head>')) {
    // Prefer real document head close (not a stray mention inside a comment).
    const headClose = privacy.lastIndexOf('</head>');
    privacy =
      privacy.slice(0, headClose) + meta + privacy.slice(headClose);
  } else {
    console.error('privacy HTML has no </head>; cannot inject verification meta');
    process.exit(1);
  }
  console.log('injected google-site-verification meta into homepage');
} else {
  console.warn(
    'GOOGLE_SITE_VERIFICATION not set — homepage built without Search Console meta. Add it to .env then re-run this script.'
  );
}

const out = `/**
 * CardFlow legal pages Worker — paste into shy-fog Worker and Deploy.
 * Serves / and /terms.html
 */
const PRIVACY = ${JSON.stringify(privacy)};
const TERMS = ${JSON.stringify(terms)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\\/$/, '') || '/';
    if (p === '/' || p === '/index.html' || p === '/privacy' || p === '/privacy-policy.html') {
      return html(PRIVACY);
    }
    if (p === '/terms' || p === '/terms.html') {
      return html(TERMS);
    }
    return new Response('Not found', { status: 404 });
  },
};

function html(body) {
  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
`;

fs.writeFileSync(path.join(__dirname, 'privacy-pages-worker.js'), out);
console.log('wrote privacy-pages-worker.js', out.length);
