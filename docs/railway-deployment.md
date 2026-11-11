# Railway Deployment Guide

本文件整理 Kaiyn Announce Bot 在 Railway 上的部署方式、環境變數、指令註冊與營運檢查項。專案以長時間常駐的 Node.js process 運行，部署平台需支援持續執行、日誌檢視與自動重啟。

## 部署架構

Kaiyn Announce Bot 使用 Railway 作為 production runtime，並透過 GitHub repository 連動部署。

主要設定：

- Source：GitHub repository `kylekkkk61/kaiyn-announce-bot`
- Environment：`production`
- Runtime：Node.js，版本依 `package.json` 的 `engines.node` 設定
- Build command：`npm run build`
- Start command：`npm start`
- Deploy branch：`main`
- GitHub autodeploy：enabled
- Wait for CI：enabled
- Restart policy：`Always`

Railway 通常會自動偵測 Node.js 專案的 build 與 start command。production 環境建議在 service settings 明確指定，確保部署流程與專案 scripts 保持一致。

## 環境變數

Railway service variables 需設定下列項目：

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
```

變數用途：

- `DISCORD_TOKEN`：Discord Bot Token。
- `CLIENT_ID`：Discord Application Client ID，用於註冊 slash commands。
- `GUILD_ID`：目標 Discord server ID，用於 guild command registration。

安全原則：

- production secrets 應存放於 Railway service variables。
- token 不應提交至 git、README、issue、log 或任何公開位置。
- `.env.example` 僅作為變數名稱範本，不包含實際 secret value。

## 首次部署流程

1. 確認 GitHub Actions CI 通過。
2. 在 Railway 建立 project。
3. 從 GitHub repository 建立 service。
4. 設定 production service variables。
5. 設定 build command：`npm run build`。
6. 設定 start command：`npm start`。
7. 設定 deploy branch：`main`。
8. 啟用 GitHub autodeploy。
9. 啟用 Wait for CI。
10. 設定 restart policy：`Always`。
11. Deploy service。
12. 檢查 deployment logs，確認 Bot 成功登入 Discord。

成功啟動時，log 應出現類似訊息：

```txt
Starting Kaiyn Announce Bot with Node ...
Logged in as ...
```

## 一般更新流程

1. 將程式碼 push 到部署 branch。
2. GitHub Actions 執行 install、typecheck、build 與 test。
3. Railway 在 CI 成功後重新部署 service。
4. 檢查 Railway deployment logs。
5. 確認 Discord Bot 維持 online。

啟用 Wait for CI 可避免 CI 尚未完成時提前部署，讓 production 更新流程與測試結果保持一致。

## Slash Command 註冊

`npm run deploy` 會將 slash command 定義註冊到指定 guild。

```bash
npm run deploy
```

此指令適合在下列情況手動執行：

- 新增 slash command。
- 移除 slash command。
- 修改 slash command 名稱、參數或描述。

Bot 的 start command 應專注於啟動 long-running process：

```bash
npm start
```

將 command registration 與 runtime startup 分開，可以避免每次 service 重啟時重複更新 Discord command registry。

## Restart Policy

Discord bot 屬於長時間常駐服務，建議使用可自動恢復的 restart policy。

建議設定：

- Preferred：`Always`
- Acceptable fallback：`On Failure`
- Avoid：`Never`

當 process 因 runtime error、平台重啟或重新部署而中止時，restart policy 應能讓 service 自動恢復。

## Logs and Operations

上線後建議定期檢查：

- Deployment 是否成功完成。
- Runtime logs 是否出現 Discord login、interaction 或 permission error。
- Service 是否因 usage limit、billing 或 restart limit 停止。
- Discord Bot 是否維持 online。
- 重新部署或停止 service 時，是否觸發 graceful shutdown。

預期 shutdown log：

```txt
Received SIGTERM, shutting down.
Discord client destroyed.
```

預期 fatal error log：

```txt
Unhandled promise rejection
Uncaught exception
```

若出現 fatal error，應搭配 Railway logs 與 application stack trace 判斷原因，並確認 restart policy 是否成功接手重啟。

## 官方文件

- [Railway Services](https://docs.railway.com/develop/services)
- [Railway Variables](https://docs.railway.com/variables)
- [Railway Build and Start Commands](https://docs.railway.com/reference/build-and-start-commands)
- [Railway Start Command](https://docs.railway.com/deployments/start-command)
- [Railway GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys)
- [Railway Restart Policy](https://docs.railway.com/guides/restart-policy)
