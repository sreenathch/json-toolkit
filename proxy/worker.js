/**
 * CORS proxy for JSON/YAML Toolkit.
 *
 * Deploy to Cloudflare Workers, then paste the worker URL into the toolkit's
 * Diff tab (⚙ Proxy). The app only calls this when a direct browser fetch is
 * blocked by CORS.
 *
 *   npx wrangler deploy proxy/worker.js --name json-toolkit-proxy
 *
 * IMPORTANT: add your own origins below. An allowlist is what keeps this from
 * becoming an open relay that anyone can point at any host.
 */

const ALLOWED_ORIGINS = [
  'https://sreenathch.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// Headers that belong to the hop between browser and proxy, not to the target.
const STRIP_REQUEST_HEADERS = [
  'host', 'origin', 'referer', 'connection', 'content-length',
  'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker',
  'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'x-real-ip',
];

/**
 * Refuse private and link-local targets. A public Worker cannot route to them
 * anyway, and allowing them invites SSRF against internal services and cloud
 * metadata endpoints (169.254.169.254).
 */
const isPrivateHost = (hostname) => {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')) return true;
  if (/\.(local|internal|intranet|lan|home)$/.test(h)) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a >= 224) return true;               // multicast / reserved
  }

  return false;
};

const corsHeaders = (origin, request) => {
  const requested = request.headers.get('Access-Control-Request-Headers');
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': requested || 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const fail = (message, status, origin, request) =>
  new Response(JSON.stringify({ error: message }, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? corsHeaders(origin, request) : {}),
    },
  });

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === 'OPTIONS') {
      return allowed
        ? new Response(null, { status: 204, headers: corsHeaders(origin, request) })
        : new Response(null, { status: 403 });
    }

    if (!allowed) {
      return fail(`Origin not allowed: ${origin || '(none)'}. Add it to ALLOWED_ORIGINS.`, 403, '', request);
    }

    const target = new URL(request.url).searchParams.get('url');
    if (!target) return fail('Missing ?url= parameter', 400, origin, request);

    let url;
    try {
      url = new URL(target);
    } catch {
      return fail(`Malformed target URL: ${target}`, 400, origin, request);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return fail(`Unsupported protocol: ${url.protocol}`, 400, origin, request);
    }
    if (isPrivateHost(url.hostname)) {
      return fail(`Refusing to proxy a private or link-local host: ${url.hostname}`, 403, origin, request);
    }

    const headers = new Headers();
    for (const [name, value] of request.headers) {
      if (!STRIP_REQUEST_HEADERS.includes(name.toLowerCase())) headers.set(name, value);
    }

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

    let upstream;
    try {
      upstream = await fetch(url.toString(), {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
        redirect: 'follow',
        cache: 'no-store',
      });
    } catch (err) {
      return fail(`Upstream request failed: ${err.message}`, 502, origin, request);
    }

    const out = new Headers(upstream.headers);
    out.delete('set-cookie'); // never relay credentials back into the page
    for (const [k, v] of Object.entries(corsHeaders(origin, request))) out.set(k, v);
    out.set('X-Proxied-By', 'json-toolkit-proxy');
    // The point of the toolkit is seeing what an endpoint returns *now*
    out.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out,
    });
  },
};
