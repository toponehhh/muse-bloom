import '../js/feedback-kind.js';
const MAX_BYTES = 512 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const actions = new Set(['session-open', 'hidden', 'visible', 'screen', 'action', 'look-complete', 'goal-met', 'reveal-blocked', 'feedback-export']);
class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const reply = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
});
function text(value, name, max, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new InputError('Invalid ' + name);
  return value.trim();
}
function timestamp(value, name) {
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new InputError('Invalid ' + name);
  return new Date(value).toISOString();
}
function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new InputError('Invalid ' + name);
  return value;
}
function oneOf(value, name, allowed) {
  if (!allowed.includes(value)) throw new InputError('Invalid ' + name);
  return value;
}
export function validate(input) {
  if (!input || input.schemaVersion !== 1 || !UUID.test(input.submissionId) || input.consent !== true) throw new InputError('A valid submission ID and consent are required');
  const r = input.record;
  if (!r || typeof r.participant !== 'string' || !/^[A-Za-z0-9_-]{1,30}$/.test(r.participant)) throw new InputError('Invalid participant');
  const feedback = {}, f = r.feedback;
  if (!f || typeof f !== 'object' || Array.isArray(f)) throw new InputError('Feedback is required');
  for (const key of ['clarity', 'readability', 'visuals', 'enjoyment']) {
    if (!['string', 'number'].includes(typeof f[key]) || !/^[1-5]$/.test(String(f[key]))) throw new InputError('Invalid rating: ' + key);
    feedback[key] = String(f[key]);
  }
  feedback.continue = oneOf(f.continue, 'continue', ['Yes', 'Maybe', 'No']);
  for (const key of ['friction', 'favorite', 'observerNotes']) feedback[key] = text(f[key], key, 2000);
  feedback.device = oneOf(f.device || '', 'device', ['', '手机', '平板', '电脑', 'Phone', 'Tablet', 'Computer']);
  feedback.independentFirstLook = oneOf(f.independentFirstLook || '', 'independentFirstLook', ['', 'yes', 'helped', 'no']);
  if (!Array.isArray(r.events) || r.events.length > 2000) throw new InputError('Invalid action log');
  const events = r.events.map(e => {
    if (!e || !actions.has(e.action)) throw new InputError('Invalid action');
    const event = { at: timestamp(e.at, 'event time'), action: e.action };
    for (const key of ['name', 'screen', 'item', 'category']) if (e[key] !== undefined) event[key] = text(e[key], key, 80, true);
    if (e.level !== undefined) event.level = integer(e.level, 'level', 1, 36);
    if (e.score !== undefined) event.score = integer(e.score, 'score', 0, 100);
    if (e.action === 'goal-met') {
      event.level = integer(e.level, 'level', 1, 36);
      if (!Array.isArray(e.goals) || e.goals.length < 1 || e.goals.length > 3 || new Set(e.goals).size !== e.goals.length) throw new InputError('Invalid goals');
      event.goals = e.goals.map(goal => integer(goal, 'goal', 0, 2));
    }
    if (e.items !== undefined) {
      if (!Array.isArray(e.items) || e.items.length > 12) throw new InputError('Invalid items');
      event.items = e.items.map(id => text(id, 'item', 80, true));
    }
    if (e.viewport !== undefined) event.viewport = { width: integer(e.viewport?.width, 'width', 1, 20000), height: integer(e.viewport?.height, 'height', 1, 20000) };
    if (e.reducedMotion !== undefined) {
      if (typeof e.reducedMotion !== 'boolean') throw new InputError('Invalid reducedMotion');
      event.reducedMotion = e.reducedMotion;
    }
    return event;
  });
  const record = {
    version: text(r.version, 'version', 30, true),
    source: oneOf(r.source, 'source', ['participant-session', 'manual-feedback', 'automated-check']),
    ...(r.testType===undefined?{}:{testType:oneOf(r.testType,'testType',['human','automated','unverified'])}),
    participant: r.participant,
    ...(r.startedAt ? { startedAt: timestamp(r.startedAt, 'startedAt') } : {}),
    exportedAt: timestamp(r.exportedAt, 'exportedAt'), feedback, events
  };
  return { submissionId: input.submissionId.toLowerCase(), record };
}
async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) throw new InputError('Feedback is too large', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('Feedback is required');
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new InputError('Feedback is too large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new InputError('Invalid JSON'); }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname !== '/api/feedback') return reply({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return reply({ error: 'Use POST to submit feedback' }, 405, { Allow: 'POST' });
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply({ error: 'Submit from this website' }, 403);
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({ error: 'JSON is required' }, 415);
    try {
      if (!env.DB || !env.FEEDBACK_RATE_LIMIT) return reply({ error: 'Feedback is temporarily unavailable. Please retry later.' }, 503);
      // An anonymous endpoint has no authenticated user key. This generous shared-IP
      // limit protects D1 while allowing a classroom or household to submit together.
      const limit = await env.FEEDBACK_RATE_LIMIT.limit({ key: 'feedback:' + (request.headers.get('CF-Connecting-IP') || 'local') });
      if (!limit.success) return reply({ error: 'Too many submissions. Please retry in a minute.' }, 429, { 'Retry-After': '60' });
      const { submissionId, record } = validate(await readBody(request));
      const json = JSON.stringify(record);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
      const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
      const receivedAt = new Date().toISOString(), f = record.feedback;
      const result = await env.DB.prepare(`INSERT INTO feedback_submissions
        (submission_id, payload_hash, received_at, participant_id, game_version, source,
         clarity, readability, visuals, enjoyment, would_continue, record_json, test_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING`)
        .bind(submissionId, hash, receivedAt, record.participant, record.version, record.source,
          Number(f.clarity), Number(f.readability), Number(f.visuals), Number(f.enjoyment), f.continue, json, globalThis.MuseFeedbackKind.classify(record).type).run();
      const saved = await env.DB.prepare('SELECT payload_hash, received_at FROM feedback_submissions WHERE submission_id = ?').bind(submissionId).first();
      if (!saved) throw new Error('Missing stored receipt');
      if (saved.payload_hash !== hash) return reply({ error: 'This submission ID has already been used for different answers.' }, 409);
      return reply({ ok: true, receipt: submissionId, receivedAt: saved.received_at }, result.meta.changes ? 201 : 200);
    } catch (error) {
      if (error instanceof InputError) return reply({ error: error.message }, error.status);
      // Do not log answers, identifiers, SQL parameters or database errors.
      console.error('feedback_storage_unavailable');
      return reply({ error: 'Feedback could not be saved. Please retry or download a backup.' }, 503);
    }
  }
};
