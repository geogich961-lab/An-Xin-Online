import { DEFAULT_CONTENT, validateContent } from '../../_lib/defaults.js';
import { json, sameOrigin, validSession } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!await validSession(request, env.SESSION_SECRET || '')) return json({ error: 'Cần đăng nhập.' }, 401);
  try {
    const row = await env.DB.prepare('SELECT value FROM site_content WHERE id = 1').first();
    return json(row ? JSON.parse(row.value) : DEFAULT_CONTENT);
  } catch {
    return json({ error: 'Không đọc được dữ liệu. Kiểm tra D1 migration.' }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  if (!await validSession(request, env.SESSION_SECRET || '')) return json({ error: 'Phiên đăng nhập hết hạn.' }, 401);
  try {
    const value = await request.json();
    const error = validateContent(value);
    if (error) return json({ error }, 400);
    const serialized = JSON.stringify(value);
    if (serialized.length > 100000) return json({ error: 'Dữ liệu vượt quá giới hạn.' }, 413);
    await env.DB.prepare('INSERT INTO site_content (id, value, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP').bind(serialized).run();
    return json({ saved: true, updatedAt: new Date().toISOString() });
  } catch {
    return json({ error: 'Không lưu được. Kiểm tra kết nối D1.' }, 503);
  }
}
