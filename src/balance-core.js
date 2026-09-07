/**
 * dsh-deepseek-balance-plus — host-side balance core.
 *
 * Pure host logic shared by the plugin entry: resolve the DeepSeek API key
 * (DSH-managed credential first, optional in-memory override), query the
 * official balance endpoint through the host `subprocess` seam, and open the
 * official top-up page in the system browser.
 *
 * No UI, no cordis wiring here — the plugin entry decides how these are
 * exposed (see index.js / client bridge).
 */

export const BALANCE_URL = 'https://api.deepseek.com/user/balance'
export const TOPUP_URL = 'https://platform.deepseek.com/top_up'
export const CREDENTIAL_REF = 'DEEPSEEK_API_KEY'

/**
 * Resolve the DeepSeek API key for this process.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ manualKey?: string | null }} [state] optional in-memory override
 * @returns {Promise<{ key: string | null, source: 'configured' | 'manual' | null }>}
 */
export async function resolveKey(ctx, state = {}) {
  if (state.manualKey) return { key: state.manualKey, source: 'manual' }
  const creds = ctx.get('credentials')
  if (creds) {
    try {
      const r = await creds.resolve(CREDENTIAL_REF)
      if (r && r.value) return { key: r.value, source: 'configured' }
    } catch {
      /* credential read failed — treat as unconfigured */
    }
  }
  return { key: null, source: null }
}

/**
 * Run one command through the host subprocess seam and capture stdout/stderr.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string[]} argv
 * @param {number} timeoutMs
 * @returns {Promise<{ ok: true, exitCode: number, stdout: string, stderr: string } | { ok: false, error: string }>}
 */
export async function runCommand(ctx, argv, timeoutMs = 20000) {
  const sub = ctx.get('subprocess')
  const timer = ctx.get('timer')
  if (!sub || typeof sub.spawn !== 'function') {
    return { ok: false, error: '宿主 subprocess 服务不可用' }
  }
  let handle
  try {
    handle = sub.spawn({
      argv,
      cwd: '/',
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: 1048576, spill: { maxBytes: 1048576 } },
        stderr: { maxBytes: 1048576, spill: { maxBytes: 1048576 } },
      },
      graceMs: timeoutMs + 5000,
    })
  } catch (e) {
    return { ok: false, error: `启动命令失败: ${(e && e.message) || e}` }
  }

  let settled = false
  const finish = (fn) => {
    if (settled) return
    settled = true
    try { disposeTimer() } catch { /* noop */ }
    fn()
  }
  let disposeTimer = () => {}
  if (timer && typeof timer.timeout === 'function') {
    disposeTimer = timer.timeout(() => {
      try { handle.terminate() } catch { /* noop */ }
      finish(() => { result = { ok: false, error: `请求超时(${timeoutMs}ms)` } })
    }, timeoutMs)
  }

  let result = null
  await new Promise((resolve) => {
    handle.done.then(
      (oc) => {
        finish(() => {
          try {
            const read = (rd) => (rd ? rd.readFrom(0).text : '')
            const stdout = read(handle.collected && handle.collected.stdout)
            const stderr = read(handle.collected && handle.collected.stderr)
            result = { ok: true, exitCode: oc.exitCode, stdout, stderr }
          } catch (e) {
            result = { ok: false, error: `读取输出失败: ${(e && e.message) || e}` }
          }
          resolve()
        })
      },
      (e) => {
        finish(() => { result = { ok: false, error: `子进程错误: ${(e && e.message) || e}` }; resolve() })
      },
    )
  })
  return result
}

/**
 * Fetch the official balance document for an API key.
 * @returns {Promise<{ ok: true, data: Record<string, any> } | { ok: false, error: string, needKey?: boolean }>}
 */
export async function fetchBalance(ctx, key) {
  const res = await runCommand(ctx, [
    '/usr/bin/curl', '-sS', '-m', '15',
    '-H', `Authorization: Bearer ${key}`,
    BALANCE_URL,
  ])
  if (!res.ok) return res
  if (res.exitCode !== 0) {
    return { ok: false, error: `curl 退出码 ${res.exitCode}${res.stderr ? `，stderr: ${res.stderr.slice(0, 200)}` : ''}` }
  }
  let parsed = null
  try { parsed = JSON.parse(res.stdout) } catch {
    return { ok: false, error: `无法解析响应: ${res.stdout.slice(0, 200)}` }
  }
  if (parsed && parsed.error) return { ok: false, error: String(parsed.error.message || '请求被拒绝') }
  return { ok: true, data: parsed || {} }
}

/**
 * Build the compact JSON the client renders from a raw balance document.
 */
export function summarizeBalance(payload) {
  const currencies = (Array.isArray(payload.balance_infos) ? payload.balance_infos : []).map((b) => ({
    currency: b.currency,
    total: b.total_balance != null ? String(b.total_balance) : null,
    granted: b.granted_balance != null ? String(b.granted_balance) : null,
    topped: b.topped_up_balance != null ? String(b.topped_up_balance) : null,
  }))
  return {
    isAvailable: payload.is_available !== false,
    currencies,
  }
}

/**
 * Open an URL in the system default browser via the macOS `open` helper.
 */
export async function openUrl(ctx, url) {
  const res = await runCommand(ctx, ['/usr/bin/open', String(url)], 8000)
  return { ok: res.ok, error: res.ok ? undefined : res.error }
}
