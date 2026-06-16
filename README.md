<div align="center">

# Kaiyn Announce Bot

**Minimal & Elegant Discord Embed Announcement Bot**

[![CI](https://img.shields.io/github/actions/workflow/status/kaiyn-capital/kaiyn-announce-bot/ci.yml?branch=main&style=for-the-badge)](https://github.com/kaiyn-capital/kaiyn-announce-bot/actions/workflows/ci.yml)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025E8C?style=for-the-badge&logo=dependabot&logoColor=white)](./.github/dependabot.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=for-the-badge&logo=node.js&logoColor=white)](./package.json)
[![npm](https://img.shields.io/badge/npm-package%20lock-CB3837?style=for-the-badge&logo=npm&logoColor=white)](./package.json)

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.26.4-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Biome](https://img.shields.io/badge/Biome-2.5.0-60A5FA?style=for-the-badge&logo=biome&logoColor=white)](https://biomejs.dev/)
[![Node Test Runner](https://img.shields.io/badge/Test%20Runner-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/api/test.html)

<p align="center">
Kaiyn Announce Bot 是一個以 TypeScript 與 Discord.js 建置的 Discord 社群管理機器人，提供 Embed 公告發布與成員驗證流程。專案聚焦在社群營運中常見的公告、驗證與權限控管需求，透過 Slash Command、Modal 與 Button Interaction 建立一致且可維護的管理體驗。
</p>

</div>

---

## Tech Stack

| Area | Choice |
| :--- | :--- |
| **Runtime** | `Node.js 24` (`engines.node`: `>=24 <25`) |
| **Language** | `TypeScript 6.0.3` (`strict`) |
| **Discord SDK** | `Discord.js 14.26.4` |
| **Configuration** | `dotenv 17.4.2` |
| **Package Manager**| `npm` + `package-lock.json` |
| **Lint / Format** | `Biome 2.5.0` |
| **Testing** | Node.js built-in test runner |
| **CI & Automation**| GitHub Actions (Parallel CI) + Dependabot |

## 專案特色

- 使用 Discord Slash Command 建立清楚的管理入口。
- 支援透過 Modal 輸入多行公告內容，保留換行與段落格式。
- 可發送自訂標題、顏色、footer、大圖、縮圖與時間戳的 Embed 公告。
- 提供中文驗證面板，讓新成員透過按鈕完成身分組發放。
- 在執行指令前檢查使用者權限、Bot 頻道權限與身分組層級。
- 使用 ephemeral message 回覆錯誤與操作結果，避免管理訊息干擾公開頻道。
- 將核心邏輯拆分為可測試函式，搭配 Node.js 內建 test runner 進行單元測試。
- 支援 graceful shutdown 與 process-level error logging，提升長時間運行穩定性。


## 功能總覽

### `/announce`

`/announce` 用於建立彩色 Embed 公告。管理員可指定目標頻道、標題、顏色與媒體欄位，公告正文則透過 Discord Modal 輸入，適合需要保留多行格式的正式公告。

支援參數：

- `channel`：公告要發送到的文字頻道。
- `title`：Embed 標題。
- `color`：Embed 顏色，支援 `#RRGGBB` 或 `RRGGBB`。
- `footer`：底部文字。
- `image`：Embed 大圖 URL。
- `thumbnail`：Embed 縮圖 URL。
- `timestamp`：是否加入時間戳。

### `/setup-verify`

`/setup-verify` 用於建立社群驗證面板。管理員可指定驗證頻道與驗證成功後要發放的身分組，Bot 會發送包含按鈕的 Embed 面板，成員點擊後即可完成驗證。

支援參數：

- `channel`：驗證面板要發送到的文字頻道。
- `role`：驗證成功後要發放的身分組。
- `title`：驗證面板標題。
- `color`：Embed 顏色，支援 `#RRGGBB` 或 `RRGGBB`。
- `image`：驗證面板大圖 URL。
- `button_label`：驗證按鈕文字。

## 權限設計

專案在互動流程中加入必要的權限檢查，降低部署後因 Discord 權限設定錯誤造成的操作失敗。

- `/announce` 需要使用者具備 `Manage Messages` 或 `Administrator` 權限。
- `/setup-verify` 需要使用者具備 `Manage Guild` 或 `Administrator` 權限。
- Bot 需要具備 `View Channels`、`Send Messages`、`Embed Links` 與 `Manage Roles`。
- Bot 的最高身分組必須高於要發放的驗證身分組。
- 驗證身分組不可為 `@everyone`，也不可為 Discord 或整合服務管理的身分組。

## 專案結構

```txt
kaiyn-announce-bot/
├── docs/
│   ├── production-readiness-checklist.md
│   └── railway-deployment.md
├── src/
│   ├── commands/
│   │   ├── announce.logic.ts
│   │   ├── announce.logic.test.ts
│   │   ├── announce.ts
│   │   ├── setup-verify.logic.ts
│   │   ├── setup-verify.logic.test.ts
│   │   └── setup-verify.ts
│   ├── types/
│   │   ├── command.ts
│   │   └── discord.d.ts
│   ├── utils/
│   │   ├── color.test.ts
│   │   ├── color.ts
│   │   ├── permissions.test.ts
│   │   └── permissions.ts
│   ├── deploy-commands.ts
│   └── index.ts
├── .env.example
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

## Getting Started

### Prerequisites

- **Node.js 24+** — 確保本機環境已安裝正確的 Node.js 版本：
  ```bash
  node -v
  ```

### Install and Run

```bash
# 安裝依賴 (正式或 CI 環境建議使用 npm ci)
npm install

# 複製環境變數範本並填寫設定
cp .env.example .env
```

請在 `.env` 填入 Discord Bot 需要的設定：

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_discord_guild_id
```

> [!WARNING]
> `DISCORD_TOKEN` 屬於敏感資訊，請放在本機 `.env` 或部署平台的 secrets 中，**絕對不可**提交到版本控制。

```bash
# 註冊 Discord guild slash commands
npm run deploy

# 編譯 TypeScript 並啟動 Bot
npm run build
npm start

# 開發模式 (熱重載)
npm run dev
```

## Validation & Code Quality

在提交 PR 或 Commit 之前，請執行以下腳本確保程式碼品質與測試通過：

```bash
npm run lint         # 程式碼 lint
npm run format:check # 格式檢查 (可使用 npm run format 自動修復)
npm run typecheck    # 型別檢查
npm run build        # 確保可成功編譯
npm test             # 執行單元測試
```

## Discord Bot 設定

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications) 建立 Application。
2. 在 `Bot` 頁面建立 Bot 並取得 Bot Token。
3. 在 `OAuth2` 頁面取得 Client ID。
4. 開啟 Discord Developer Mode，對目標伺服器使用 `Copy Server ID` 取得 Guild ID。
5. 使用 OAuth2 URL 邀請 Bot，scopes 需包含 `bot` 與 `applications.commands`。

Invite URL 範例：

```txt
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2415938560&scope=bot+applications.commands
```

## 使用範例

建立公告：

```txt
/announce channel:#announcements title:"Kaiyn Capital｜重要公告" color:"#87CEEB" timestamp:true
```

送出指令後，Bot 會開啟 Modal，管理員可在 `公告內容` 欄位輸入完整公告文字。

建立驗證面板：

```txt
/setup-verify channel:#verify role:@Verified title:"Kaiyn Capital｜社群驗證" color:"#87CEEB" button_label:"完成驗證"
```

送出指令後，Bot 會開啟 Modal，管理員可在 `驗證面板內容` 欄位輸入面板說明文字。成員點擊驗證按鈕後，Bot 會檢查目前身分組狀態並發放指定角色。

## 部署

專案可部署到支援長時間常駐 Node.js process 的平台。部署環境需要設定下列流程：

```bash
npm ci
npm run build
npm start
```

Railway 部署筆記請參考：

- [docs/railway-deployment.md](docs/railway-deployment.md)
- [docs/production-readiness-checklist.md](docs/production-readiness-checklist.md)

## License

此專案採用 [MIT License](LICENSE) 授權。
