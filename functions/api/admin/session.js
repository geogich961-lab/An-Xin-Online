import { json, sameOrigin, sessionCookie, issueSession, validSession } from '../../_lib/auth.js';

function matchesSecret(value, secret) {
  const encoder = new TextEncoder();
  const actual = encoder.encode(value);
  const expected = encoder.encode(secret);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export async function onRequestGet({ request, env }) {
  return json({ authenticated: await validSession(request, env.SESSION_SECRET || '') });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12 || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.DB) return json({ error: 'Backend chưa được cấu hình đầy đủ. Mật khẩu cần ít nhất 12 ký tự và SESSION_SECRET ít nhất 32 ký tự.' }, 503);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Math.floor(Date.now() / 1000);
  try {
    const attempt = await env.DB.prepare('SELECT failures, blocked_until FROM admin_login_attempts WHERE ip = ?').bind(ip).first();
    if (attempt?.blocked_until > now) return json({ error: 'Tạm khóa đăng nhập. Vui lòng thử lại sau 15 phút.' }, 429);
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!matchesSecret(password, env.ADMIN_PASSWORD)) {
      const failures = attempt?.blocked_until && attempt.blocked_until <= now ? 1 : (attempt?.failures || 0) + 1;
      const blockedUntil = failures >= 8 ? now + 900 : 0;
      await env.DB.prepare('INSERT INTO admin_login_attempts (ip, failures, blocked_until) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until').bind(ip, failures, blockedUntil).run();
      return json({ error: blockedUntil ? 'Đã nhập sai nhiều lần. Tạm khóa đăng nhập 15 phút.' : 'Mật khẩu không đúng.' }, 401);
    }
    await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').bind(ip).run();
    const token = await issueSession(env.SESSION_SECRET);
    return json({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(token) });
  } catch {
    return json({ error: 'Không thể xác thực. Kiểm tra cấu hình D1.' }, 503);
  }
}

export async function onRequestDelete({ request }) {
  if (!sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  return json({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}
