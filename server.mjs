import { createServer } from 'node:http';
import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/box.js', ['box.js', 'text/javascript; charset=utf-8']],
  ['/logo.png', ['logo.png', 'image/png']]
]);
const challenges = new Map();
const sessions = new Map();
const walletQuota = new Map();
const globalQuota = new Map();
const key = process.env.ANTHROPIC_API_KEY;
const allow = new Set((process.env.CLAUDEBOX_ALLOWED_WALLETS || '').split(',').map(s => s.trim()).filter(Boolean));
const port = Number(process.env.PORT || 3000);
const publicOrigin = new URL(process.env.CLAUDEBOX_ORIGIN || 'http://localhost:' + port).origin;
const cookieOptions = '; Path=/; HttpOnly; SameSite=Strict' + (publicOrigin.startsWith('https:') ? '; Secure' : '');
const hour = 3600_000;

function publicKeyBytes(address) {
  if (typeof address !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return null;
  let number = 0n;
  for (const char of address) number = number * 58n + BigInt(alphabet.indexOf(char));
  const hex = number ? number.toString(16) : '';
  const zeros = address.match(/^1*/)[0].length;
  const bytes = Buffer.concat([Buffer.alloc(zeros), Buffer.from(hex.padStart(hex.length + hex.length % 2, '0'), 'hex')]);
  return bytes.length === 32 ? bytes : null;
}

function responds(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw Object.assign(new Error('Request is too large.'), {status: 413});
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  throw Object.assign(new Error('Invalid JSON request.'), {status: 400});
}

function takeQuota(store, id, max) {
  let quota = store.get(id);
  if (!quota || quota.expires <= Date.now()) {
    quota = {count: 0, expires: Date.now() + hour};
    store.set(id, quota);
  }
  if (quota.count >= max) return false;
  quota.count += 1;
  return true;
}

setInterval(() => {
  for (const store of [challenges, sessions, walletQuota, globalQuota]) {
    for (const [id, entry] of store) if (entry.expires <= Date.now()) store.delete(id);
  }
}, 60_000).unref();

async function api(req, res, path) {
  const sessionId = req.headers.cookie?.match(/(?:^|;\s*)claudebox=([a-f0-9]{64})(?:;|$)/)?.[1];
  const session = sessions.get(sessionId);
  const active = session?.expires > Date.now() ? session : null;
  if (req.method === 'GET' && path === '/api/session') {
    return responds(res, 200, {address: active?.address ?? null, configured: Boolean(key), history: active?.history ?? []});
  }
  if (req.method !== 'POST' || req.headers.origin !== publicOrigin ||
      req.headers['content-type']?.split(';')[0] !== 'application/json') {
    return responds(res, 403, {error: 'Open PALCOREX at its configured origin.'});
  }
  const body = await readJson(req);
  if (path === '/api/challenge') {
    if (!publicKeyBytes(body.address)) return responds(res, 400, {error: 'Invalid Solana wallet address.'});
    if (challenges.size >= 2000) return responds(res, 503, {error: 'Sign-in is busy. Try again shortly.'});
    const nonce = randomBytes(32).toString('hex');
    const expires = Date.now() + 300_000;
    const message = 'Sign in to PALCOREX\nSite: ' + publicOrigin + '\nWallet: ' + body.address +
      '\nNonce: ' + nonce + '\nExpires: ' + new Date(expires).toISOString() + '\nThis message does not authorize any transaction.';
    challenges.set(nonce, {address: body.address, message, expires});
    return responds(res, 200, {nonce, message});
  }
  if (path === '/api/verify') {
    const challenge = challenges.get(body.nonce);
    const signature = typeof body.signature === 'string' && /^[a-f0-9]{128}$/i.test(body.signature)
      ? Buffer.from(body.signature, 'hex') : null;
    if (!challenge || challenge.expires <= Date.now() || !signature) return responds(res, 401, {error: 'Sign-in expired or signature invalid.'});
    const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), publicKeyBytes(challenge.address)]);
    const publicKey = createPublicKey({key: spki, format: 'der', type: 'spki'});
    if (!verify(null, Buffer.from(challenge.message), publicKey, signature)) return responds(res, 401, {error: 'Wallet signature did not match.'});
    if (sessions.size >= 2000 && !active) return responds(res, 503, {error: 'Sign-in is busy. Try again shortly.'});
    challenges.delete(body.nonce);
    sessions.delete(sessionId);
    const id = randomBytes(32).toString('hex');
    sessions.set(id, {address: challenge.address, expires: Date.now() + 8 * hour, history: []});
    res.setHeader('Set-Cookie', 'claudebox=' + id + cookieOptions + '; Max-Age=28800');
    return responds(res, 200, {address: challenge.address, configured: Boolean(key), history: []});
  }
  if (path === '/api/logout') {
    sessions.delete(sessionId);
    res.setHeader('Set-Cookie', 'claudebox=' + cookieOptions + '; Max-Age=0');
    return responds(res, 200, {});
  }
  if (path !== '/api/chat') return responds(res, 404, {error: 'Unknown endpoint.'});
  if (!active) return responds(res, 401, {error: 'Sign in with your wallet to chat.'});
  if (allow.size && !allow.has(active.address)) return responds(res, 403, {error: 'This wallet has no access to Claude chat.'});
  if (!key) return responds(res, 503, {error: 'Claude chat needs a server API key.'});
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) return responds(res, 400, {error: 'Enter a message of up to 2,000 characters.'});
  if (active.busy || !takeQuota(walletQuota, active.address, 12) || !takeQuota(globalQuota, 'chat', 60)) {
    return responds(res, 429, {error: 'Chat limit reached or a reply is already in progress.'});
  }
  active.busy = true;
  try {
    const messages = [...active.history.slice(-10), {role: 'user', content: message}];
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01'},
      signal: AbortSignal.timeout(35_000),
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 512,
        system: 'You are a small pixel skull companion from PALCOREX. Respond in the user’s language and help with their tasks. Honor preferences given in the conversation. You have no wallet access or transaction tools.',
        messages
      })
    });
    if (!upstream.ok) {
      console.error('Claude API status:', upstream.status);
      return responds(res, 502, {error: 'Claude is unavailable. Try again shortly.'});
    }
    const result = await upstream.json();
    const text = result.content?.filter(block => block.type === 'text').map(block => block.text).join('\n');
    if (!text) return responds(res, 502, {error: 'Claude returned an empty reply.'});
    if (sessions.get(sessionId) === active) active.history = [...messages, {role: 'assistant', content: text}];
    return responds(res, 200, {text});
  } finally {
    active.busy = false;
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    const path = new URL(req.url, publicOrigin).pathname;
    if (path.startsWith('/api/')) return await api(req, res, path);
    const file = files.get(path);
    if (!file || !['GET', 'HEAD'].includes(req.method)) return responds(res, 404, {error: 'Not found.'});
    const content = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, {'Content-Type': file[1], 'Cache-Control': 'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (!error.status) console.error(error.name);
    if (!res.headersSent) responds(res, error.status || 502, {error: error.status ? error.message : 'Service unavailable.'});
  }
});
server.listen(port, () => console.log('PALCOREX listening on port ' + port));
