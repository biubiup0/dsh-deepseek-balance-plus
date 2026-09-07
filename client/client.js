// dsh-deepseek-balance-plus — browser client bundle (prebuilt source of truth).
//
// Format contract of the client module system (@deepseek-ai/dsh-client-modules):
// the file is loaded through window.__ModuleLoader__.load({ id, factory }); the
// factory resolves its module requests against the platform seed table plus the
// injected host bundles. This bundle requires only 'react' (platform seed).
// module.exports exposes the cordis-style plugin { name, inject, apply }.
//
// Final UI (v10, plain text): the footer entry shows content only — no capsule
// background / border / radius / shadow. Wide sidebar: `余额 ¥23.37`; 56px rail:
// the amount alone. Clicking opens the detail panel (total / granted, key
// source, 充值 + 刷新). Auto refresh every 5 minutes against /dsh-balance/*.
//
// Registration uses a fresh additive id (keeps the shipped "Cordis Plugin"
// entry intact). To replace that entry instead, change id to "cordis-panel".

window.__ModuleLoader__.load({ id: "dsh-deepseek-balance-plus", factory: (require) => {

  var module = { exports: {} };
  var exports = module.exports;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

  var React = require("react");

  var INTERVAL_MS = 5 * 60 * 1000;
  var BASE = window.location.origin + "/dsh-balance";
  var SYM = { CNY: "\u00a5", USD: "$", HKD: "HK$", EUR: "\u20ac" };

  function money(v, cur) {
    if (v == null || v === "") return "\u2014";
    var n = Number(v);
    return (SYM[cur] || cur + " ") + (Number.isFinite(n) ? n.toFixed(2) : String(v));
  }
  function fmtTime(t) {
    try { return new Date(t).toLocaleTimeString(); } catch (e) { return ""; }
  }
  function post(path, body) {
    return fetch(BASE + path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) { return r.json(); });
  }
  function apiRefresh() {
    return post("/refresh").then(function (j) {
      if (j && j.needKey) return { needKey: true };
      if (j && j.error) return { error: j.error };
      return { payload: j || {} };
    });
  }
  function apiSaveKey(key) { return post("/key", { key: key }); }
  function apiOpenTopUp() { return post("/topup"); }

  function row(k, v, strong) {
    return React.createElement("div", { key: k, style: { display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 } },
      React.createElement("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, k),
      React.createElement("span", { style: { fontWeight: strong ? 600 : 400 } }, v));
  }

  function Widget(props) {
    var wide = !!(props && props.wide);
    var state = React.useState({ payload: null, needKey: false, error: null });
    var payload = state[0].payload, needKey = state[0].needKey, error = state[0].error;
    var setState = state[1];
    var busyState = React.useState(false);
    var busy = busyState[0], setBusy = busyState[1];
    var openState = React.useState(false);
    var open = openState[0], setOpen = openState[1];
    var draftState = React.useState("");
    var draft = draftState[0], setDraft = draftState[1];
    var mounted = React.useRef(true);
    var busyRef = React.useRef(false);
    React.useEffect(function () { return function () { mounted.current = false; }; }, []);

    function applyOut(out) {
      if (!mounted.current) return;
      if (out && out.payload) setState({ payload: out.payload, needKey: false, error: null });
      else if (out && out.needKey) { setState({ payload: null, needKey: true, error: null }); setOpen(true); }
      else setState({ payload: null, needKey: false, error: (out && out.error) || "\u672a\u77e5\u9519\u8bef" });
    }
    function refresh() {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      apiRefresh().then(function (out) { busyRef.current = false; setBusy(false); applyOut(out); },
        function (e) { busyRef.current = false; setBusy(false); applyOut({ error: String((e && e.message) || e) }); });
    }
    React.useEffect(function () {
      refresh();
      var timer = setInterval(refresh, INTERVAL_MS);
      return function () { clearInterval(timer); };
    }, []);

    function saveKey() {
      var k = draft.replace(/[\r\n]/g, "").trim();
      if (!k) return;
      apiSaveKey(k).then(function () { setDraft(""); refresh(); }, function () {});
    }
    function openTopUp() {
      setBusy(true);
      apiOpenTopUp().then(function () { if (mounted.current) setBusy(false); }, function () { if (mounted.current) setBusy(false); });
    }

    var currencies = (payload && payload.currencies) || [];
    var head = null;
    for (var i = 0; i < currencies.length; i++) { if (currencies[i].currency === "CNY") { head = currencies[i]; break; } }
    if (!head && currencies.length) head = currencies[0];
    var headText = head && head.total != null ? money(head.total, head.currency) : null;
    var cellText = needKey ? (wide ? "\u672a\u914d\u7f6e Key" : "?")
      : error ? (wide ? "\u67e5\u8be2\u5931\u8d25" : "!")
      : (headText || (busy ? "\u2026" : (payload ? "\u00a50.00" : "\u2026")));
    var cellColor = error ? "var(--dsw-alias-state-error-primary)"
      : needKey ? "var(--dsw-alias-state-warn-primary)"
      : "var(--dsw-alias-label-primary)";

    // Plain text only: no capsule background / border / radius / shadow.
    var cellStyle = {
      display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "2px 4px",
      cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
      background: "transparent", border: "none",
      boxSizing: "border-box",
      maxWidth: wide ? 240 : 56, minWidth: wide ? 0 : 56,
    };
    var amtStyle = wide
      ? { fontSize: 14, fontWeight: 700, lineHeight: 1, color: cellColor, overflow: "hidden", textOverflow: "ellipsis" }
      : { fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: cellColor, maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis" };
    var panelStyle = {
      position: "fixed", left: 8, bottom: 40, width: 276, zIndex: 3000,
      background: "var(--dsw-alias-bg-overlay)", border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,.22)", padding: "12px 14px",
      color: "var(--dsw-alias-label-primary)", fontSize: 12.5,
    };
    var btnStyle = {
      marginTop: 8, padding: "5px 12px", borderRadius: 7, border: "1px solid var(--dsw-alias-border-l2)",
      background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", cursor: "pointer", fontSize: 12,
    };
    var topUpBtnStyle = {
      marginTop: 8, padding: "5px 12px", borderRadius: 7, border: "1px solid var(--dsw-alias-brand-primary)",
      background: "var(--dsw-alias-brand-primary)", color: "#ffffff", cursor: "pointer", fontSize: 12, fontWeight: 600,
    };

    var inner = wide
      ? React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: "var(--dsw-alias-label-secondary)", lineHeight: 1, whiteSpace: "nowrap" } }, "\u4f59\u989d"),
        React.createElement("span", { style: amtStyle }, cellText))
      : React.createElement("span", { style: amtStyle, title: headText ? ("DeepSeek \u4f59\u989d " + headText) : cellText }, headText || cellText);

    var cell = React.createElement("div", {
      style: cellStyle,
      title: headText ? ("DeepSeek \u4f59\u989d " + headText) : cellText,
      onClick: function () { setOpen(!open); if (needKey) refresh(); },
    }, inner);

    var panel = null;
    if (open) {
      var children = [];
      children.push(React.createElement("div", { key: "h", style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontWeight: 700, fontSize: 13 } }, "DeepSeek \u4f59\u989d"),
        React.createElement("span", { style: { cursor: "pointer", color: "var(--dsw-alias-label-secondary)", padding: "0 2px" }, onClick: function () { setOpen(false); }, title: "\u5173\u95ed" }, "\u2715")));
      if (needKey) {
        children.push(React.createElement("div", { key: "key", style: { margin: "6px 0" } },
          React.createElement("div", { style: { marginBottom: 4, color: "var(--dsw-alias-state-warn-primary)" } },
            "\u672a\u627e\u5230\u53ef\u7528 API Key\u3002\u8bf7\u5728 https://platform.deepseek.com/api_keys \u521b\u5efa\u540e\u7c98\u8d34\uff1a"),
          React.createElement("input", {
            type: "password", autoFocus: true, value: draft, placeholder: "sk-\u2026",
            onChange: function (e) { setDraft(e.target.value); },
            onKeyDown: function (e) { if (e.key === "Enter") saveKey(); },
            style: { width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: 7, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-base)", color: "var(--dsw-alias-label-primary)", fontSize: 12.5, outline: "none" },
          }),
          React.createElement("button", { onClick: saveKey, disabled: busy, style: btnStyle }, busy ? "\u67e5\u8be2\u4e2d\u2026" : "\u4fdd\u5b58\u5e76\u67e5\u8be2")));
      }
      if (error) {
        children.push(React.createElement("div", { key: "err", style: { color: "var(--dsw-alias-state-error-primary)", margin: "6px 0", wordBreak: "break-all" } },
          "\u67e5\u8be2\u5931\u8d25\uff1a" + error));
      }
      if (payload) {
        var rows = [];
        if (payload.isAvailable === false) {
          rows.push(React.createElement("div", { key: "unavail", style: { color: "var(--dsw-alias-state-warn-primary)", marginBottom: 4 } }, "\u8d26\u6237\u5f53\u524d\u4e0d\u53ef\u7528"));
        }
        if (currencies.length === 0) {
          rows.push(React.createElement("div", { key: "none", style: { color: "var(--dsw-alias-label-secondary)" } }, "\u6682\u65e0\u4f59\u989d\u6570\u636e"));
        } else {
          for (var ci = 0; ci < currencies.length; ci++) {
            var c = currencies[ci];
            var blocks = [row((SYM[c.currency] || c.currency) + " \u603b\u4f59\u989d", money(c.total, c.currency), true)];
            if (c.granted != null) blocks.push(row("\u5176\u4e2d\u00b7\u8d60\u91d1", money(c.granted, c.currency), false));
            rows.push(React.createElement("div", { key: c.currency, style: { marginBottom: 4 } }, blocks));
          }
        }
        var sourceLine = (payload.source === "configured" ? "DSH \u914d\u7f6e Key \u2026" : "\u624b\u52a8 Key \u2026") + (payload.keyTail || "") + " \u00b7 " + (payload.updatedAt ? fmtTime(payload.updatedAt) : "");
        rows.push(React.createElement("div", { key: "foot", style: { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--dsw-alias-border-l1)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, color: "var(--dsw-alias-label-secondary)", fontSize: 11 } },
          React.createElement("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, sourceLine),
          React.createElement("button", { onClick: openTopUp, disabled: busy, style: topUpBtnStyle, title: "\u6253\u5f00\u5b98\u65b9\u5145\u503c\u9875" }, "\u5145\u503c"),
          React.createElement("button", { onClick: refresh, disabled: busy, style: btnStyle }, busy ? "\u2026" : "\u5237\u65b0")));
        children.push(React.createElement("div", { key: "data" }, rows));
      }
      panel = React.createElement("div", { style: panelStyle }, children);
    }

    return React.createElement("div", { style: { position: "relative" } }, cell, panel);
  }

  var name = "deepseek-balance";
  var inject = ["slots"];

  function apply(ctx) {
    var slots = ctx.get("slots");
    if (!slots) return;
    slots.inject("sidebar.footer.action", function () {
      return slots.register(
        { name: "sidebar.footer.action", id: "ds-deepseek-balance", order: -50, label: function () { return "DeepSeek \u4f59\u989d"; } },
        function (props) { return React.createElement(Widget, { wide: !!(props && props.wide) }); },
      );
    });
  }

  exports.name = name;
  exports.inject = inject;
  exports.apply = apply;

  return module.exports;
}});
