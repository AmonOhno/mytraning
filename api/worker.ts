import type { MyosExport, TrainingRecord } from '../src/types'

/**
 * MyOS 連携用 参照 API(Cloudflare Worker)
 *
 * - POST /records                     : アプリの Webhook 送信(MyosExport)を受け取り KV に保存
 * - GET  /summary?month=YYYY-MM       : 月間サマリー { month, sessions, totalMinutes }
 * - GET  /sessions?range=A..B         : 期間内セッション { sessions: [{ date, title, minutes }] }
 *
 * 全エンドポイントで `Authorization: Bearer <API_TOKEN>` を必須とする。
 * 詳細は docs/04_MyOS連携仕様.md を参照。
 */

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

interface Env {
  TRAINING_KV: KVNamespace
  /** `npx wrangler secret put API_TOKEN` で設定 */
  API_TOKEN: string
}

const RECORDS_KEY = 'records'

/** MyOS(GitHub Pages)・ローカル開発・Capacitor アプリからのアクセスを許可 */
function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin != null &&
    (/^https:\/\/[\w-]+\.github\.io$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      origin === 'capacitor://localhost')
  if (!allowed || origin == null) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.API_TOKEN) return false
  return request.headers.get('Authorization') === `Bearer ${env.API_TOKEN}`
}

/** 旧形式(minutes ベースの有酸素)にも耐えるよう秒数を導出 */
function cardioSeconds(c: TrainingRecord['cardio'][number]): number {
  const legacyMinutes = (c as { minutes?: number }).minutes
  return c.durationSec ?? Math.round((legacyMinutes ?? 0) * 60)
}

/** 筋トレまたは有酸素の実績がある記録を1セッションと数える */
function isSession(r: TrainingRecord): boolean {
  return r.strength.length > 0 || r.cardio.length > 0
}

/** 有酸素の合計時間 + 秒数ベースのセット(プランク等)を分に換算 */
function sessionMinutes(r: TrainingRecord): number {
  const cardio = r.cardio.reduce((sum, c) => sum + cardioSeconds(c), 0)
  const strength = r.strength.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.seconds ?? 0), 0),
    0,
  )
  return Math.round((cardio + strength) / 60)
}

function sessionTitle(r: TrainingRecord): string {
  const names = [...r.strength.map((ex) => ex.name), ...r.cardio.map((c) => c.kind)].filter(
    (name) => name.trim() !== '',
  )
  return names.length > 0 ? [...new Set(names)].join('・') : 'トレーニング'
}

async function loadStoredRecords(env: Env): Promise<TrainingRecord[]> {
  const raw = await env.TRAINING_KV.get(RECORDS_KEY)
  if (raw == null) return []
  try {
    const parsed = JSON.parse(raw) as MyosExport
    return Array.isArray(parsed.records) ? parsed.records : []
  } catch {
    return []
  }
}

async function handlePostRecords(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  let payload: MyosExport
  try {
    payload = (await request.json()) as MyosExport
  } catch {
    return json({ error: 'invalid JSON body' }, 400, cors)
  }
  if (payload?.source !== 'mytraining' || !Array.isArray(payload.records)) {
    return json({ error: 'body must be a mytraining export (source / records)' }, 400, cors)
  }
  await env.TRAINING_KV.put(RECORDS_KEY, JSON.stringify(payload))
  return json({ ok: true, count: payload.records.length }, 200, cors)
}

async function handleSummary(url: URL, env: Env, cors: Record<string, string>): Promise<Response> {
  const month = url.searchParams.get('month') ?? ''
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return json({ error: 'month must be YYYY-MM' }, 400, cors)
  }
  const records = (await loadStoredRecords(env)).filter(
    (r) => r.date.startsWith(`${month}-`) && isSession(r),
  )
  const totalMinutes = records.reduce((sum, r) => sum + sessionMinutes(r), 0)
  return json({ month, sessions: records.length, totalMinutes }, 200, cors)
}

async function handleSessions(url: URL, env: Env, cors: Record<string, string>): Promise<Response> {
  const range = url.searchParams.get('range') ?? ''
  const match = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(range)
  if (match == null || match[1] > match[2]) {
    return json({ error: 'range must be YYYY-MM-DD..YYYY-MM-DD' }, 400, cors)
  }
  const [, from, to] = match
  const sessions = (await loadStoredRecords(env))
    .filter((r) => r.date >= from && r.date <= to && isSession(r))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, title: sessionTitle(r), minutes: sessionMinutes(r) }))
  return json({ sessions }, 200, cors)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const cors = corsHeaders(request.headers.get('Origin'))

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (!isAuthorized(request, env)) {
      return json({ error: 'unauthorized' }, 401, cors)
    }

    if (request.method === 'POST' && url.pathname === '/records') {
      return handlePostRecords(request, env, cors)
    }
    if (request.method === 'GET' && url.pathname === '/summary') {
      return handleSummary(url, env, cors)
    }
    if (request.method === 'GET' && url.pathname === '/sessions') {
      return handleSessions(url, env, cors)
    }
    return json({ error: 'not found' }, 404, cors)
  },
}
