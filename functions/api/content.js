import { DEFAULT_CONTENT } from '../_lib/defaults.js';
import { json } from '../_lib/auth.js';

export async function onRequestGet({ env }) {
  try {
    const row = await env.DB.prepare('SELECT value FROM site_content WHERE id = 1').first();
    return json(row ? JSON.parse(row.value) : DEFAULT_CONTENT, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch {
    return json(DEFAULT_CONTENT, 200, { 'Cache-Control': 'public, max-age=30' });
  }
}
