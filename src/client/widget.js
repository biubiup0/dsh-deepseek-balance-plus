/**
 * dsh-deepseek-balance — browser-side balance widget.
 *
 * Pure presentational React component (no JSX, plain createElement).
 * All data flows through the injected `api` handle so the entry module can
 * wire whichever host bridge the runtime provides:
 *
 *   api.refresh()  -> Promise<{ payload? | needKey? | error? }>
 *   api.saveKey(key: string) -> Promise<void>
 *   api.openTopUp() -> Promise<void>
 *
 * The component keeps the interaction model of the dynamic prototype:
 * - a persistent pill in the sidebar footer (wide / rail variants)
 * - click toggles a details panel (granted amount, key source, refresh)
 * - 5-minute auto refresh
 */

import React from 'react'

const INTERVAL_MS = 5 * 60 * 1000
const SYM = { CNY: '¥', USD: '$', HKD: 'HK$', EUR: '€' }

const money = (v, cur) => {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return (SYM[cur] || `${cur} `) + (Number.isFinite(n) ? n.toFixed(2) : String(v))
}

const fmtTime = (t) => {
  try { return new Date(t).toLocaleTimeString() } catch { return '' }
}

const ROW = (k, v, strong) =>
  React.createElement('div', { key: k, style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 } },
    React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, k),
    React.createElement('span', { style: { fontWeight: strong ? 600 : 400, fontVariantNumeric: 'tabular-nums' } }, v),
  )

export function BalanceWidget(api) {
  return function Widget(props) {
    const wide = !!props.wide
    const [payload, setPayload] = React.useState(null)
    const [needKey, setNeedKey] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [busy, setBusy] = React.useState(false)
    const [open, setOpen] = React.useState(false)
    const [draft, setDraft] = React.useState('')
    const mounted = React.useRef(true)
    const busyRef = React.useRef(false)

    React.useEffect(() => () => { mounted.current = false }, [])

    const refresh = React.useCallback(async () => {
      if (busyRef.current) return
      busyRef.current = true
      setBusy(true)
      let out = null
      try { out = await api.refresh() } catch (e) { out = { error: String((e && e.message) || e) } }
      busyRef.current = false
      if (!mounted.current) return
      setBusy(false)
      if (out && out.payload) { setPayload(out.payload); setNeedKey(false); setError(null) }
      else if (out && out.needKey) { setPayload(null); setNeedKey(true); setError(null); setOpen(true) }
      else { setPayload(null); setNeedKey(false); setError((out && out.error) || '未知错误') }
    }, [])

    React.useEffect(() => {
      refresh()
      const timer = setInterval(() => { refresh() }, INTERVAL_MS)
      return () => clearInterval(timer)
    }, [refresh])

    const saveKey = async () => {
      const k = draft.replace(/[\r\n]/g, '').trim()
      if (!k) return
      try { await api.saveKey(k) } catch { /* ignore */ }
      setDraft('')
      refresh()
    }

    const openTopUp = async () => {
      setBusy(true)
      try { await api.openTopUp() } catch { /* ignore */ }
      if (mounted.current) setBusy(false)
    }

    const currencies = (payload && payload.currencies) || []
    const head = currencies.find((c) => c.currency === 'CNY') || currencies[0] || null
    const headText = head && head.total != null ? money(head.total, head.currency) : null
    const cellText = needKey ? (wide ? '未配置 Key' : '?')
      : error ? (wide ? '查询失败' : '!')
      : (headText || (busy ? '…' : (payload ? '¥0.00' : '…')))
    const cellColor = error ? 'var(--dsw-alias-state-error-primary)'
      : needKey ? 'var(--dsw-alias-state-warn-primary)'
      : 'var(--dsw-alias-label-primary)'

    const cellStyle = {
      display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: 'center',
      gap: wide ? 6 : 3, padding: wide ? '7px 12px' : '5px 0', borderRadius: wide ? 10 : 8,
      cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', color: cellColor,
      background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)',
      maxWidth: wide ? 220 : 56, minWidth: wide ? 0 : 54, boxSizing: 'border-box',
    }
    const valStyle = { fontSize: wide ? 14 : 10, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }
    const railAmtStyle = { fontSize: 10, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis' }
    const panelStyle = {
      position: 'fixed', left: 8, bottom: 54, width: 276, zIndex: 3000,
      background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,.22)', padding: '12px 14px',
      color: 'var(--dsw-alias-label-primary)', fontSize: 12.5,
    }
    const btnStyle = {
      marginTop: 8, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', fontSize: 12,
    }
    const topUpBtnStyle = {
      marginTop: 8, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--dsw-alias-brand-primary)',
      background: 'var(--dsw-alias-brand-primary)', color: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    }

    return React.createElement('div', { style: { position: 'relative' } },
      React.createElement('div', {
        style: cellStyle,
        title: headText ? `DeepSeek 余额 ${headText}` : cellText,
        onClick: () => { setOpen(!open); if (needKey) refresh() },
      },
        wide
          ? React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
              React.createElement('span', { style: { fontSize: 15, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)', lineHeight: 1 } }, '¥'),
              React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1 } }, '余额'),
              React.createElement('span', { style: valStyle }, cellText))
          : React.createElement(React.Fragment, null,
              React.createElement('span', { style: { fontSize: 15, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)', lineHeight: 1 } }, '¥'),
              React.createElement('span', { style: railAmtStyle, title: headText || '' }, headText || cellText)),
      ),
      open
        ? React.createElement('div', { style: panelStyle },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
              React.createElement('span', { style: { fontWeight: 700, fontSize: 13 } }, 'DeepSeek 余额'),
              React.createElement('span', {
                style: { cursor: 'pointer', color: 'var(--dsw-alias-label-secondary)', padding: '0 2px' },
                onClick: () => setOpen(false), title: '关闭',
              }, '✕'),
            ),
            needKey
              ? React.createElement('div', { style: { margin: '6px 0' } },
                  React.createElement('div', { style: { marginBottom: 4, color: 'var(--dsw-alias-state-warn-primary)' } },
                    '未找到可用 API Key。请在 https://platform.deepseek.com/api_keys 创建后粘贴：'),
                  React.createElement('input', {
                    type: 'password', autoFocus: true, value: draft,
                    placeholder: 'sk-…',
                    onChange: (e) => setDraft(e.target.value),
                    onKeyDown: (e) => { if (e.key === 'Enter') saveKey() },
                    style: { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', fontSize: 12.5, outline: 'none' },
                  }),
                  React.createElement('button', { onClick: saveKey, disabled: busy, style: btnStyle },
                    busy ? '查询中…' : '保存并查询'),
                )
              : null,
            error
              ? React.createElement('div', { style: { color: 'var(--dsw-alias-state-error-primary)', margin: '6px 0', wordBreak: 'break-all' } },
                  `查询失败：${error}`)
              : null,
            payload
              ? React.createElement('div', null,
                  payload.isAvailable === false
                    ? React.createElement('div', { style: { color: 'var(--dsw-alias-state-warn-primary)', marginBottom: 4 } }, '账户当前不可用')
                    : null,
                  currencies.length === 0
                    ? React.createElement('div', { style: { color: 'var(--dsw-alias-label-secondary)' } }, '暂无余额数据')
                    : currencies.map((c) =>
                        React.createElement('div', { key: c.currency, style: { marginBottom: 4 } },
                          ROW(`${SYM[c.currency] || c.currency} 总余额`, money(c.total, c.currency), true),
                          c.granted != null ? ROW('其中·赠金', money(c.granted, c.currency), false) : null,
                        ),
                      ),
                  React.createElement('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--dsw-alias-border-l1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, color: 'var(--dsw-alias-label-secondary)', fontSize: 11 } },
                    React.createElement('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                      `${payload.source === 'configured' ? 'DSH 配置 Key …' : '手动 Key …'}${payload.keyTail || ''} · ${payload.updatedAt ? fmtTime(payload.updatedAt) : ''}`),
                    React.createElement('button', { onClick: openTopUp, disabled: busy, style: topUpBtnStyle, title: '打开官方充值页' }, '充值'),
                    React.createElement('button', { onClick: refresh, disabled: busy, style: btnStyle }, busy ? '…' : '刷新'),
                  ),
                )
              : null,
          )
        : null,
    )
  }
}
