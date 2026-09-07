/**
 * dsh-deepseek-balance — host entry.
 *
 * Registers same-origin HTTP routes (via the `webServer` seam) that bridge
 * the browser widget to the host:
 *
 *   GET  /dsh-balance/state   cached snapshot (no secret material)
 *   POST /dsh-balance/refresh re-query the official balance endpoint
 *   POST /dsh-balance/key     store an in-memory manual API key
 *   POST /dsh-balance/topup   open the official top-up page in the browser
 *
 * The route set mirrors the pattern used by installed third-party plugins
 * (dshmarket registers /dsh-market/* the same way); client UI calls it with
 * plain same-origin fetch.
 */

import {
  resolveKey,
  fetchBalance,
  summarizeBalance,
  openUrl,
  TOPUP_URL,
} from './balance-core.js'

const PREFIX = '/dsh-balance'

export default {
  name: 'deepseek-balance',
  inject: ['timer'],
  apply(ctx) {
    const webServer = ctx.get('webServer')
    if (!webServer || typeof webServer.register !== 'function') return

    const state = { manualKey: null }
    let snapshot = null // last successful/interesting result, { updatedAt, ...summary }
    let inFlight = null

    async function refresh() {
      if (inFlight) return inFlight
      inFlight = (async () => {
        const { key, source } = await resolveKey(ctx, state)
        if (!key) return { needKey: true }
        const res = await fetchBalance(ctx, key)
        if (!res.ok) return res
        const summary = summarizeBalance(res.data)
        snapshot = {
          ok: true,
          needKey: false,
          source,
          keyTail: String(key).slice(-4),
          ...summary,
          updatedAt: Date.now(),
        }
        return snapshot
      })().finally(() => { inFlight = null })
      return inFlight
    }

    function readJsonBody(request) {
      return new Promise((resolve) => {
        const chunks = []
        request.on('data', (c) => chunks.push(c))
        request.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8')
            resolve(text ? JSON.parse(text) : {})
          } catch {
            resolve(null)
          }
        })
        request.on('error', () => resolve(null))
      })
    }

    function sendJson(response, status, value) {
      const body = JSON.stringify(value)
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(body),
      })
      response.end(body)
    }

    function sameOrigin(request) {
      // Same-origin browser calls carry both Host and Origin; tolerate no
      // Origin (curl) but never a mismatching Origin.
      const origin = request.headers.origin
      if (!origin) return true
      const host = request.headers.host
      if (!host) return false
      try {
        return new URL(origin).host === host
      } catch {
        return false
      }
    }

    const routes = [
      {
        method: 'GET',
        path: `${PREFIX}/state`,
        async handler(req, res) {
          const base = { configured: state.manualKey ? 'manual' : null }
          if (!snapshot) {
            const out = await refresh()
            sendJson(res, 200, { ...base, ...(out.needKey ? { needKey: true } : { error: out.error }) })
            return
          }
          sendJson(res, 200, { ...base, ...snapshot })
        },
      },
      {
        method: 'POST',
        path: `${PREFIX}/refresh`,
        async handler(req, res) {
          if (!sameOrigin(req)) { sendJson(res, 403, { error: 'forbidden' }); return }
          const out = await refresh()
          if (out.needKey) sendJson(res, 200, { needKey: true })
          else if (!out.ok) sendJson(res, 200, { error: out.error })
          else sendJson(res, 200, out)
        },
      },
      {
        method: 'POST',
        path: `${PREFIX}/key`,
        async handler(req, res) {
          if (!sameOrigin(req)) { sendJson(res, 403, { error: 'forbidden' }); return }
          const body = await readJsonBody(req)
          const key = body && typeof body.key === 'string'
            ? body.key.replace(/[\r\n]/g, '').trim()
            : ''
          if (!key) { sendJson(res, 400, { error: 'key empty' }); return }
          state.manualKey = key
          inFlight = null
          snapshot = null
          sendJson(res, 200, { ok: true })
        },
      },
      {
        method: 'POST',
        path: `${PREFIX}/topup`,
        async handler(req, res) {
          if (!sameOrigin(req)) { sendJson(res, 403, { error: 'forbidden' }); return }
          const out = await openUrl(ctx, TOPUP_URL)
          sendJson(res, 200, { ok: out.ok, error: out.error })
        },
      },
    ]

    for (const route of routes) {
      webServer.register({
        kind: 'exact',
        path: route.path,
        handler: (req, res) => {
          if (req.method !== route.method) {
            sendJson(res, 405, { error: 'method not allowed' })
            return
          }
          Promise.resolve(route.handler(req, res)).catch((e) =>
            sendJson(res, 500, { error: String((e && e.message) || e) }),
          )
        },
      })
    }
  },
}
