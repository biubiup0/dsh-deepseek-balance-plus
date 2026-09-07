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
  读不到时才提供粘贴入口（仅会话内存保存）

## 安装

```sh
dsh plugin --profile web add dsh-deepseek-balance
```

## 安全

- 只读官方余额接口；不存储、不上传任何密钥；
- 复用 DSH 自身配置的 Key，或使用仅存内存的手动 Key；
- 充值按钮只打开官方地址，无第三方中转。

## License

[MIT](LICENSE)
