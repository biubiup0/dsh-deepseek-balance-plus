# dsh-deepseek-balance

> DeepSeek Harness (DSH) 第三方插件：左侧栏底部常驻显示 DeepSeek API 账户余额，
> 自动刷新，可一键跳转官方充值页。

[English](README.md) · 中文

## 功能

- **常驻余额胶囊**：左侧栏底部显示「¥ 余额 ¥xx.xx」，与网页版
  [用量页](https://platform.deepseek.com/usage) 是同一账户余额；侧栏收窄为图标条时自动变紧凑
- **自动刷新**：每 5 分钟查询一次官方接口 `GET https://api.deepseek.com/user/balance`
- **明细面板**：点击胶囊展开——每币种总余额 / 其中·赠金、Key 来源、上次刷新时间、手动刷新
- **一键充值**：面板内「充值」按钮用系统默认浏览器打开官方充值页
  `https://platform.deepseek.com/top_up`
- **零配置**：优先复用 DSH 凭据服务里的 `DEEPSEEK_API_KEY`，无需输入密钥；
  读不到时才提供粘贴入口（仅宿主内存保存）

## 安装

```sh
dsh plugin --profile web add dsh-deepseek-balance
```

要求宿主支持 `dsh.client` 客户端模块体系（与 dshmarket / dsh-better-sidebar
同代次的 dsh web / desktop）。

## 安全

- 只读官方余额接口；插件不存储、不上传任何密钥，宿主路由永不返回密钥明文；
- 复用 DSH 自身配置的 Key，或使用仅存内存的手动 Key；
- 充值按钮只打开官方地址，无第三方中转。

## 构建 / 开发

零运行时依赖（仅 peer `@deepseek-ai/cordis`），无需安装依赖：

```sh
node scripts/build.mjs    # 把 src/ 镜像到 lib/（宿主半侧）；client/client.js 即最终浏览器产物
npm pack                  # 打可发布 tarball（自动执行 prepack）
```

源码结构：

- `src/balance-core.js` — 宿主余额核心（凭据解析 / subprocess+curl / 汇总）
- `src/index.js` — 宿主 Cordis 插件入口（注册 `/dsh-balance/*` webServer 路由）
- `client/client.js` — 浏览器 bundle（`__ModuleLoader__.load` 格式），经客户端插槽系统
  把余额组件注册进 `sidebar.footer.action`

宿主路由（同源、不含密钥）：

| 方法 | 路径                  | 用途                               |
| ---- | --------------------- | ---------------------------------- |
| GET  | `/dsh-balance/state`  | 取缓存快照（并预热一次查询）        |
| POST | `/dsh-balance/refresh`| 重新查询官方余额接口                |
| POST | `/dsh-balance/key`    | 保存会话内手动 API Key（内存）      |
| POST | `/dsh-balance/topup`  | 打开官方充值页                      |

## 发布到社区市场

1. 发布 npm 包（`npm publish`，需你的 npm 账号）。先确认包名可用：
   `npm view dsh-deepseek-balance version`；被占用则换唯一名字（可用 scope）。
2. 提交到 [awesome-dsh-plugin](https://awesome-dsh-plugin.com) 精选列表
   （GitHub：`awesome-dsh-plugin/awesome-dsh-plugin`），分类 `usage · 用量与计费`。
3. 收录后 dshmarket 用户即可一键安装。

> 提示：任何要求你粘贴 DeepSeek API Key 的“市场/插件”都是钓鱼套路。本插件
> 只读取 DSH 自己管理的凭据，从不外发密钥。

## License

[MIT](LICENSE)
