# Production Readiness Checklist

## 目前已完成

- TypeScript migration 已完成。
- Node.js baseline 已鎖定為 v24 LTS：`>=24 <25`。
- `npm run typecheck` 可檢查型別。
- `npm run build` 可產生 `dist/`。
- `npm test` 已使用 Node.js 內建 test runner 跑基本單元測試。
- GitHub Actions CI 已建立，push / pull request 時會跑 install、typecheck、build、test。
- Discord 手動驗收已由使用者確認完成，後續不重複列為必要項目。
- Production 部署平台已決定使用 Railway。
- Runtime graceful shutdown 已完成：
  - `SIGINT`
  - `SIGTERM`
- Process-level error logging 已完成：
  - `unhandledRejection`
  - `uncaughtException`
- 啟動時會輸出 production-safe runtime summary，不輸出 token。

## 正式上線前必做

- 確認 production runtime 使用 Node.js v24 LTS，不使用 v25 或其他 Current 版本。
- 確認 production 環境變數完整：
  - `DISCORD_TOKEN`
  - `CLIENT_ID`
  - `GUILD_ID`
- 確認 production secrets 不會寫入 git、log、README 或任何公開位置。
- 在正式環境使用乾淨安裝流程：

```bash
npm ci
npm run build
```

- 啟動 bot 前確認 `dist/index.js` 已存在。
- Slash command 有變更時才執行：

```bash
npm run deploy
```

- 平時重啟 bot 不需要重複 deploy slash commands。
- 確認 `.env` 或平台 secrets 與目標 Discord App / Guild 對應，不混用測試與正式 Discord App。
- 確認 `dist/` 不提交到 git，由部署環境 build 產生。
- Railway service 設定 build command：`npm run build`。
- Railway service 設定 start command：`npm start`。
- Railway service variables 設定 `DISCORD_TOKEN`、`CLIENT_ID`、`GUILD_ID`。

## 運行穩定性

- 部署平台需要支援長時間常駐 process。
- process crash 後需要自動重啟。
- 機器重開或平台重新部署後需要自動啟動 bot。
- 需要能查看 stdout / stderr logs。
- 需要保留最近錯誤 log，方便追查 Discord API、權限或環境變數問題。
- 需要確認平台不會因為 idle 而休眠，否則 Discord bot 會離線。

## 建議補強

- README 可在決定部署平台後補上 production deployment 區塊。
- 若未來 bot 功能變多，再考慮 structured logger 或 log aggregation。

## Railway 部署策略已決定

- GitHub autodeploy branch：`main`。
- Railway GitHub autodeploy：enabled。
- Railway Wait for CI：enabled。
- Railway plan：Hobby。
- Railway restart policy：`Always`；若當下不能設定，先用 `On Failure`。
- Secrets 管理方式：Railway service variables。
- Staging：不建立，先只使用 production。
- CD：不建立額外 CD pipeline，先使用 Railway GitHub autodeploy。
- Healthcheck：不設定 HTTP healthcheck，因為 bot 沒有 web server。
- Slash command deploy：本機手動執行 `npm run deploy`。

## 不建議現在做

- 不建議現在導入 Bun runtime。
- 不建議現在加入 CD，先完成 Railway 手動部署流程。
- 不建議把 `dist/` commit 進 git。
- 不建議讓 CI 執行 `npm start` 或 `npm run deploy`。
