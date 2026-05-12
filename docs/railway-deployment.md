# Railway Deployment Notes

## 決策

本專案 production 部署平台選擇 Railway。

理由：

- Discord bot 是長時間常駐 process，Railway 支援 persistent service。
- 專案不需要資料庫、HTTP server、Docker 或複雜基礎設施。
- Railway 可從 GitHub repository 建立 service，並集中管理 variables、logs、deployments 與 restart policy。
- 專案已鎖定 Node.js v24 LTS：`>=24 <25`。

## Railway Service 設定

建立一個 Railway service，使用以下設定：

- Source：GitHub repository `kylekkkk61/kaiyn-announce-bot`
- Environment：`production`
- Node.js：使用專案 `package.json` 的 `engines.node`
- Build command：`npm run build`
- Start command：`npm start`
- Deploy branch：`main`
- GitHub autodeploy：enabled
- Wait for CI：enabled
- Railway plan：Hobby
- Restart policy：`Always`
- Staging environment：不建立
- Healthcheck：不設定 HTTP healthcheck，因為 bot 沒有 web server

Railway 通常會依專案自動偵測 build / start command，但 production 建議在 service settings 明確指定，避免平台偵測邏輯變動造成啟動方式不一致。

## Variables

Railway service variables 需要設定：

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
```

注意：

- 不要把 production token 寫進 git。
- 不要在 log 中輸出 token。
- Railway variables 會提供給 build 與 running deployment。
- 如果使用 `.env.example` 匯入建議變數，仍需要手動填入真正的 secret value。

## Deploy 流程

首次部署建議順序：

1. 確認 GitHub Actions CI 通過。
2. 在 Railway 建立 project。
3. 從 GitHub repo 建立 service。
4. 設定 production variables。
5. 設定 build command：`npm run build`。
6. 設定 start command：`npm start`。
7. 設定 deploy branch：`main`。
8. 開啟 GitHub autodeploy。
9. 開啟 Wait for CI。
10. 設定 Railway plan：Hobby。
11. 設定 restart policy：`Always`。
12. Deploy service。
13. 只在 slash command 定義有變更時，另外執行 `npm run deploy`。

一般更新流程：

1. Push code 到部署 branch。
2. GitHub Actions CI 跑 typecheck / build / test。
3. Railway 等 CI 成功後，根據 GitHub source 重新部署。
4. 查看 Railway deployment logs。

如果沒有開啟 Wait for CI，Railway 可能會在 GitHub Actions 尚未完成前就開始部署。此專案已經有 CI，因此 production 建議開啟 Wait for CI。

## Slash Command Deploy

`npm run deploy` 會註冊 Discord guild slash commands。

這個動作不應該放進 Railway service start command，因為：

- Bot 每次重啟不需要重複註冊 slash commands。
- start command 應只負責啟動 long-running bot process。
- slash command 有變更時才需要 deploy。

決定：

- 手動在本機執行 `npm run deploy`。
- 只有新增、刪除、修改 slash command 定義時才執行。

## Restart Policy

Railway 預設 restart policy 是 `On Failure`，有 restart 次數限制。本專案 production 決定使用 `Always`。

設定：

- Preferred：`Always`
- Fallback：若當下不能設定 `Always`，先用 `On Failure`
- 不使用：`Never`

## Logs and Operations

上線後需要定期確認：

- Service deployment 狀態。
- Runtime logs 是否有 `Failed to login`、interaction error、permission error。
- Railway redeploy 或停止 service 時，logs 應出現 `Received SIGTERM, shutting down.` 與 `Discord client destroyed.`。
- Fatal runtime error 時，logs 應出現 `Unhandled promise rejection` 或 `Uncaught exception`，並由 Railway restart policy 接手重啟。
- Railway 是否因 billing、usage limit 或 restart limit 導致 service 停止。
- Discord bot 是否維持 online。

## 官方文件

- Railway Services：https://docs.railway.com/develop/services
- Railway Variables：https://docs.railway.com/variables
- Railway Build and Start Commands：https://docs.railway.com/reference/build-and-start-commands
- Railway Start Command：https://docs.railway.com/deployments/start-command
- Railway GitHub Autodeploys：https://docs.railway.com/deployments/github-autodeploys
- Railway Restart Policy：https://docs.railway.com/guides/restart-policy
