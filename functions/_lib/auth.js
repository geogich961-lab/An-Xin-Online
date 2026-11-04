const encoder = new TextEncoder();
const SESSION_SECONDS = 60 * 60 * 12;

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signature(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

export async function issueSession(secret) {
  const payload = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${payload}.${await signature(secret, payload)}`;
}

export async function validSession(request, secret) {
  const cookie = request.headers.get('Cookie') || '';
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('anxin_admin='))?.slice('anxin_admin='.length);
  if (!token) return false;
  const [expiry, supplied] = token.split('.');
  if (!/^\d+$/.test(expiry || '') || Number(expiry) < Date.now() / 1000 || !supplied) return false;
  const expected = await signature(secret, expiry);
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `anxin_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}`;
}

export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
