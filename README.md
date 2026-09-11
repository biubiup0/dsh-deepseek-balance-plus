# dsh-deepseek-balance-plus

> A DeepSeek Harness (DSH) third-party plugin: shows your DeepSeek API account
> balance in the **left sidebar footer**, auto-refreshes, and offers a
> one-click jump to the official top-up page.

[简体中文](README.zh.md) · English

## Features

- **Persistent balance pill** in the sidebar footer: `¥ 余额 ¥xx.xx` — the same
  account balance as the [usage page](https://platform.deepseek.com/usage).
  Collapses to a compact ¥ badge when the sidebar shrinks to the 56px rail.
- **Auto refresh** every 5 minutes against the official endpoint
  `GET https://api.deepseek.com/user/balance`
- **Detail panel** on click: total / granted amounts per currency, key source,
  last update time, manual refresh
- **One-click top-up**: the panel's `充值` button opens the official
  `https://platform.deepseek.com/top_up` page in your default browser
- **Zero-config key reuse**: prefers the DSH-managed `DEEPSEEK_API_KEY`
  credential — no key input needed. Falls back to a paste box (kept in host
  memory only) when no configured key exists.

## Install

```sh
dsh plugin --profile web add dsh-deepseek-balance-plus
```

Requires a DSH web/desktop build with the `dsh.client` client-module system
(the same era as `dshmarket` / `dsh-better-sidebar`).

## Security

- Reads the official balance endpoint only; the plugin never stores or uploads
  secrets, and its host routes never return key material.
- Reuses DSH's own configured credential, or an in-memory manual key.
- The top-up button opens the official URL in your browser; no third-party hop.

## Build / develop

Requires Node.js 20 or newer (see `engines` in `package.json`). Zero runtime
dependencies (peer `@deepseek-ai/cordis` only); nothing to install.

```sh
node scripts/build.mjs   # mirrors src/ -> lib/ (host half); client/client.js is the final bundle
npm pack                 # publishable tarball (runs prepack)
npm run clean            # remove the generated lib/ directory
```

Layout:

- `src/balance-core.js` — host balance core (credential resolution / subprocess+curl / summary)
- `src/index.js` — host Cordis plugin entry (registers `/dsh-balance/*` webServer routes)
- `client/client.js` — browser bundle (`__ModuleLoader__.load` format) registering the
  widget into the client slot system (`sidebar.footer.action`)

Host routes (same-origin, no secrets returned):

| Method | Path                  | Purpose                              |
| ------ | --------------------- | ------------------------------------ |
| GET    | `/dsh-balance/state`  | cached snapshot (also warms a fetch) |
| POST   | `/dsh-balance/refresh`| re-query the official balance API    |
| POST   | `/dsh-balance/key`    | store an in-memory manual API key    |
| POST   | `/dsh-balance/topup`  | open the official top-up page        |

## Publish to the community market

1. Publish the npm package (`npm publish` — needs your npm account). Verify the
   name is free first: `npm view dsh-deepseek-balance-plus version`; pick a unique
   name (optionally under your scope) if it is taken.
2. Submit it to the [awesome-dsh-plugin](https://awesome-dsh-plugin.com) curated
   list (GitHub: `awesome-dsh-plugin/awesome-dsh-plugin`), category `usage ·
   用量与计费`.
3. Once listed, dshmarket users can one-click install it.

> Caveat: any marketplace that asks you to paste your DeepSeek API key is a
> phishing pattern. This plugin only ever reads the DSH-managed credential.

## License

[MIT](LICENSE)
