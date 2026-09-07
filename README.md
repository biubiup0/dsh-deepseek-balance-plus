# dsh-deepseek-balance

> DeepSeek Harness（DSH）第三方插件：在左侧栏底部常驻显示 **DeepSeek API 账户余额**，
> 自动定时刷新，点击展开明细并可一键跳转官方充值页。

[中文](README.zh.md) · English

## 功能

- **常驻余额卡片**：左侧栏底部显示「¥ 余额 ¥xx.xx」（与网页版用量页同一账户余额）；
  侧栏收窄成图标条时自动切换为紧凑 ¥ 模式
- **自动刷新**：每 5 分钟自动查询一次官方接口
  `GET https://api.deepseek.com/user/balance`
- **点击展开明细**：每币种总余额 / 其中·赠金、Key 来源（DSH 配置 or 手动）、上次刷新时间
- **一键充值**：明细面板内置「充值」按钮，直接打开官方充值页
  `https://platform.deepseek.com/top_up`
- **零配置复用 Key**：优先复用 DSH 已配置的 `DEEPSEEK_API_KEY`（凭据服务），
  无需输入任何密钥；读不到时才在面板内提供粘贴入口（仅存内存，不落盘）

## 安装

```sh
dsh plugin --profile web add dsh-deepseek-balance
```

重启（或热重载）后，左侧栏底部即出现余额胶囊。

> 要求：DSH web / desktop 支持 `dsh.client` 客户端模块体系（≥ 0.1.0-rc.6 同类版本）。

## 数据与安全说明

- 余额数据来自 DeepSeek **官方**接口，仅做只读查询；
- 复用的是 DSH 自身已配置的 API Key（读取自凭据服务的 `DEEPSEEK_API_KEY`），
  插件不存储、不上传任何密钥；手动粘贴的 Key 仅保存在宿主进程内存中；
- “充值”按钮调用系统默认浏览器打开官方充值页，不经过任何第三方中转。

## 构建 / 开发

```sh
pnpm install
pnpm build      # 产出 lib/ 与客户端产物
```

源码结构：

- `src/balance-core.js` — 宿主余额查询核心（credential 解析 / subprocess+curl / 汇总）
- `src/index.js` — 宿主 Cordis 插件入口
- `src/client/…` — 浏览器端 UI（插槽注册于 `sidebar.footer.action`）

## 发布到社区市场

1. 发布 npm 包（`npm publish`，需你的 npm 账号）；
2. 提交到 [awesome-dsh-plugin](https://awesome-dsh-plugin.com) 精选列表
   （GitHub：`awesome-dsh-plugin/awesome-dsh-plugin`，分类 `usage · 用量与计费`）；
3. 收录后 dshmarket 用户即可一键安装。

## License

[MIT](LICENSE)
