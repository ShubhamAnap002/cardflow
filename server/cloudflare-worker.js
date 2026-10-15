/**
 * CardFlow OCR proxy — Cloudflare Worker
 *
 * Deploy: paste into Workers editor → Deploy
 * Secrets (Workers → Settings → Variables):
 *   OCR_API_KEY     = Gemini API key (required)
 *   OCR_CLIENT_KEY  = shared app↔worker key (strongly recommended)
 *
 * App: POST {EXPO_PUBLIC_API_URL}/scan
 * Headers: Content-Type, x-device-id, x-cardflow-key (when OCR_CLIENT_KEY is set)
 * Body: { "imageBase64": "<no data: prefix>" }
 */
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

const MAX_BASE64_CHARS = 5_500_000;
/** Soft abuse cap when client key is present. */
const DAILY_DEVICE_LIMIT = 60;
/** Tighter cap if worker has no OCR_CLIENT_KEY yet. */
const DAILY_DEVICE_LIMIT_OPEN = 20;

const EXTRACT_PROMPT = `You are extracting fields from a business card photo (landscape or portrait).
Return ONLY valid JSON with these keys (use empty string when unknown):
{"name":"","title":"","company":"","phone":"","email":"","website":"","address":"","note":"","confidence":0}
confidence is 0-99 how sure you are overall.
If multiple emails appear on the card, join them with ", " in the email field.
Do not invent details. Prefer the person's full name for "name".`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return cors(json({ ok: true, service: 'cardflow-ocr', ts: new Date().toISOString() }));
    }

    if (request.method !== 'POST' || url.pathname !== '/scan') {
      return cors(json({ error: 'Not found' }, 404));
    }

    if (!env.OCR_API_KEY) {
      return cors(json({ error: 'Scanning service is not configured.' }, 500));
    }

    const expectedKey = String(env.OCR_CLIENT_KEY || '').trim();
    if (expectedKey) {
      const got = String(request.headers.get('x-cardflow-key') || '').trim();
      if (!got || got !== expectedKey) {
        return cors(json({ error: 'Unauthorized' }, 401));
      }
    }

    const deviceId =
      request.headers.get('x-device-id') || request.headers.get('cf-connecting-ip') || 'anon';
    const limited = await enforceRateLimit(deviceId, env, Boolean(expectedKey));
    if (limited) {
      return cors(json({ error: 'Daily scan limit reached. Try again tomorrow.' }, 429));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return cors(json({ error: 'Invalid request' }, 400));
    }

    const imageBase64 = String(body.imageBase64 || '')
      .replace(/^data:image\/\w+;base64,/, '')
      .trim();

    if (!imageBase64 || imageBase64.length < 100) {
      return cors(json({ error: 'Image required' }, 400));
    }
    if (imageBase64.length > MAX_BASE64_CHARS) {
      return cors(json({ error: 'Image too large' }, 413));
    }

    const mimeType = guessMime(imageBase64);
    const payload = {
      contents: [
        {
          parts: [
            { text: EXTRACT_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    let modelResponse = null;
    let usedModel = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.OCR_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        modelResponse = await res.json();
        if (res.ok) {
          usedModel = model;
          break;
        }

        const msg = String(modelResponse.error?.message || '').toLowerCase();
        const retryable =
          res.status === 404 ||
          res.status === 503 ||
          res.status === 429 ||
          msg.includes('not found') ||
          msg.includes('no longer available') ||
          msg.includes('unavailable') ||
          msg.includes('high demand') ||
          msg.includes('try again later') ||
          msg.includes('resource_exhausted');

        if (!retryable) break;
        await new Promise((r) => setTimeout(r, 300 + attempt * 250));
      }
      if (usedModel) break;
    }

    if (!usedModel || !modelResponse) {
      return cors(json({ error: 'Scanning service unavailable. Try again later.' }, 502));
    }

    const rawText =
      modelResponse.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

    if (!rawText.trim()) {
      return cors(json({ error: 'No text found on card', fields: emptyFields(), confidence: 0 }));
    }

    const parsed = parseModelJson(rawText);
    const parsedOk =
      parsed &&
      typeof parsed === 'object' &&
      ('name' in parsed || 'email' in parsed || 'phone' in parsed || 'company' in parsed);

    let fields;
    let confidence;

    if (parsedOk) {
      fields = {
        name: clean(parsed.name),
        title: clean(parsed.title),
        company: clean(parsed.company),
        phone: clean(parsed.phone),
        email: clean(parsed.email),
        website: clean(parsed.website),
        address: clean(parsed.address),
        note: clean(parsed.note),
      };
      confidence =
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(99, Math.round(parsed.confidence)))
          : estimateConfidence(fields, rawText);
    } else {
      fields = parseBusinessCard(rawText);
      confidence = estimateConfidence(fields, rawText);
    }

    return cors(json({ fields, confidence }));
  },
};

function guessMime(b64) {
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

async function enforceRateLimit(deviceId, env, keyed) {
  const fallback = keyed ? DAILY_DEVICE_LIMIT : DAILY_DEVICE_LIMIT_OPEN;
  const max = Number(env.DAILY_DEVICE_LIMIT) || fallback;
  const day = new Date().toISOString().slice(0, 10);
  const key = new Request(`https://cardflow.rate/${day}/${encodeURIComponent(deviceId)}`);
  try {
    const cached = await caches.default.match(key);
    let count = 0;
    if (cached) count = Number(await cached.text()) || 0;
    if (count >= max) return true;
    count += 1;
    await caches.default.put(
      key,
      new Response(String(count), {
        headers: { 'Cache-Control': 'max-age=172800', 'Content-Type': 'text/plain' },
      })
    );
    return false;
  } catch {
    return false;
  }
}

function parseModelJson(text) {
  try {
    const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
    const data = JSON.parse(trimmed);
    return data && typeof data === 'object' ? data : {};
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function emptyFields() {
  return {
    name: '',
    title: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    note: '',
  };
}

function parseBusinessCard(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = lines.join('\n');
  const emailMatches = [...joined.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(
    (m) => m[0]
  );
  const emailSeen = new Set();
  const emails = [];
  for (const e of emailMatches) {
    const key = e.toLowerCase();
    if (emailSeen.has(key)) continue;
    emailSeen.add(key);
    emails.push(e);
  }
  const email = emails.join(', ');

  const phoneCandidates = [
    ...joined.matchAll(/(?:(?:tel|phone|mobile|cell|m|t)[:\s]*)?(\+?\d[\d\s().-]{7,}\d)/gi),
  ]
    .map((m) => clean(m[1] || m[0]))
    .filter((p) => p.replace(/\D/g, '').length >= 8);

  const phone = phoneCandidates[0] || '';
  const website =
    (joined.match(/(?:https?:\/\/|www\.)[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?/i) || [])[0] || '';

  const skip = new Set(
    [...emails, phone, website].filter(Boolean).map((s) => s.toLowerCase())
  );

  const isNoise = (l) => {
    const lower = l.toLowerCase();
    if (skip.has(lower)) return true;
    if (l.includes('@')) return true;
    if (/www\.|https?:/i.test(l)) return true;
    if (/^(tel|phone|mobile|email|e-mail|web|fax)\b/i.test(l)) return true;
    return false;
  };

  const name =
    lines.find(
      (l) =>
        !isNoise(l) &&
        !/\d{3}/.test(l) &&
        l.length > 2 &&
        l.length < 60 &&
        /[A-Za-z]/.test(l)
    ) ||
    lines[0] ||
    '';

  const title =
    lines.find(
      (l) =>
        l !== name &&
        !isNoise(l) &&
        /founder|ceo|cto|cfo|coo|manager|director|engineer|designer|sales|marketing|partner|consultant|officer|head|lead|vp|president|executive/i.test(
          l
        )
    ) || '';

  const company =
    lines.find(
      (l) =>
        l !== name &&
        l !== title &&
        !isNoise(l) &&
        !/\d{5}/.test(l) &&
        /inc|llc|ltd|pvt|corp|company|studio|labs|technologies|solutions|group|agency|private|limited/i.test(
          l
        )
    ) || '';

  return {
    name: clean(name),
    title: clean(title),
    company: clean(company),
    phone: clean(phone),
    email: clean(email),
    website: clean(website),
    address: '',
    note: '',
  };
}

function estimateConfidence(fields, rawText) {
  let score = 40;
  if (fields.email) score += 20;
  if (fields.phone) score += 15;
  if (fields.name) score += 15;
  if (fields.company) score += 5;
  if (rawText.length > 40) score += 5;
  return Math.min(99, score);
}

function clean(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, x-device-id, x-cardflow-key, x-retry-safe'
  );
  return new Response(response.body, { status: response.status, headers });
}
