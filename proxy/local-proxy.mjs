/**
 * Local CORS proxy for JSON/YAML Toolkit — zero dependencies, Node 18+.
 *
 *   node proxy/local-proxy.mjs            # listens on http://localhost:8787
 *   PORT=9000 node proxy/local-proxy.mjs
 *
 * Use this instead of the Cloudflare Worker when the API you want to diff is
 * only reachable from your own machine or VPN: a Worker runs in Cloudflare's
 * network and has no route to your intranet.
 *
 * Because it runs on your machine and is bound to loopback, it deliberately
 * DOES allow private hosts — that is the whole point. Do not expose it on a
 * public interface.
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT) || 8787;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://sreenathch.github.io',
];

const STRIP_REQUEST_HEADERS = [
  'host', 'origin', 'referer', 'connection', 'content-length',
  'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site',
];

const corsHeaders = (origin, req) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const send = (res, status, headers, body) => {
  res.writeHead(status, headers);
  res.end(body);
};

const fail = (res, message, status, origin, req) =>
  send(res, status, { 'Content-Type': 'application/json', ...(origin ? corsHeaders(origin, req) : {}) },
    JSON.stringify({ error: message }, null, 2));

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (req.method === 'OPTIONS') {
    return allowed ? send(res, 204, corsHeaders(origin, req), '') : send(res, 403, {}, '');
  }
  if (!allowed) {
    return fail(res, `Origin not allowed: ${origin || '(none)'}. Add it to ALLOWED_ORIGINS.`, 403, '', req);
  }

  const target = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('url');
  if (!target) return fail(res, 'Missing ?url= parameter', 400, origin, req);

  let url;
  try {
    url = new URL(target);
  } catch {
    return fail(res, `Malformed target URL: ${target}`, 400, origin, req);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fail(res, `Unsupported protocol: ${url.protocol}`, 400, origin, req);
  }

  const headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (!STRIP_REQUEST_HEADERS.includes(name.toLowerCase())) headers[name] = value;
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: hasBody ? await readBody(req) : undefined,
      redirect: 'follow',
    });

    const out = { ...corsHeaders(origin, req), 'X-Proxied-By': 'json-toolkit-local-proxy' };
    const contentType = upstream.headers.get('content-type');
    if (contentType) out['Content-Type'] = contentType;

    console.log(`${req.method} ${url.href} -> ${upstream.status}`);
    send(res, upstream.status, out, Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error(`${req.method} ${url.href} -> ${err.message}`);
    fail(res, `Upstream request failed: ${err.message}`, 502, origin, req);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`json-toolkit local proxy listening on http://localhost:${PORT}`);
  console.log(`Paste that URL into the toolkit's Diff tab under "⚙ Proxy".`);
});
