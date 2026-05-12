# TypeScript / Bun / FP / CI-CD 評估紀錄

## 背景

目前專案是小型 Discord bot，主要使用 JavaScript、CommonJS、Node.js 與 discord.js。

朋友提出的方向包含：

- 將 JavaScript 改成 TypeScript
- 改用 Bun 作為一條龍工具鏈
- 大量採用 Functional Programming
- 補上測試與 CI/CD

## TypeScript

可行，而且適合這個專案。

原因：

- discord.js 本身有 TypeScript 型別支援。
- `interaction`、`channel`、`role`、`permissions` 等 Discord 物件型別較複雜，TypeScript 可以提早發現錯誤。
- `pendingAnnouncements`、`pendingVerifyPanels` 這類 Map 狀態可以用明確型別描述。
- 之後新增 slash command 或驗證流程時，比較不容易誤用 Discord API。

需要注意：

- 不是只把 `.js` 改成 `.ts` 就完成。
- 需要新增 `typescript`、`@types/node`、`tsconfig.json`。
- 需要調整 `package.json` scripts。
- `client.commands` 這種自訂屬性需要補型別宣告。

## Bun

可以嘗試，但建議漸進導入。

Bun 的意思是用同一套工具處理：

- runtime：執行 JS / TS
- package manager：取代 npm install
- test runner：取代 Jest / Vitest 的部分用途
- script runner：執行 package scripts

可能的指令會從：

```bash
npm install
node src/index.js
```

變成：

```bash
bun install
bun run src/index.ts
```

可行原因：

- Bun 支援直接執行 TypeScript。
- Bun 內建測試工具，適合快速補測試。
- 小型 bot 專案導入成本不高。

風險：

- discord.js 官方主要仍以 Node.js LTS 為標準環境。
- Bun 雖然追求 Node 相容，但正式部署前仍需要實測長時間連線穩定性。
- Discord bot 是長連線服務，穩定性比啟動速度更重要。

建議：

- 可以先用 Bun 處理 `install` 和 `test`。
- runtime 是否改成 Bun，建議等測試與實際部署驗證後再決定。

## Functional Programming

適合局部採用，不建議為了風格而全面重寫。

適合改成純函式的部分：

- 色碼解析
- 權限檢查
- role validation
- command option parsing
- embed payload 組裝
- modal pending 資料過期判斷

不適合硬改的部分：

- `client.on(...)`
- `interaction.reply(...)`
- `channel.send(...)`
- Discord 事件處理流程
- runtime state，例如 pending modal map

建議方向：

- 外層保留 Discord handler。
- 核心判斷邏輯抽成純函式。
- 測試純函式，不直接測 Discord 連線。

## 測試

值得加入。

優先測試項目：

- `parseHexColor`
- 權限不足時的判斷結果
- role validation 條件
- pending modal 是否過期
- embed payload 是否符合預期

測試策略：

- 先測純函式。
- 避免一開始就 mock 完整 discord.js。
- 等核心邏輯抽乾淨後，再補 interaction handler 的整合測試。

## CI/CD

值得加入，但可以先做 CI，再考慮 CD。

CI 可以在每次 push 或 pull request 時自動執行：

```bash
bun install
bun test
bun run typecheck
```

或如果先保留 Node.js：

```bash
npm ci
npm test
npm run typecheck
```

CD 則要看部署平台，例如 VPS、Railway 或 Render。

## 建議導入順序

1. 先改 TypeScript，但 runtime 暫時保留 Node.js。
2. 補 `typecheck`。
3. 抽出可測的純函式。
4. 補基本單元測試。
5. 加 GitHub Actions CI。
6. 再評估是否把 package manager、test runner 或 runtime 換成 Bun。

## 結論

TypeScript 很值得改。

Bun 可以試，但建議分階段導入，不要一開始就完全取代 Node.js。

Functional Programming 適合用在核心邏輯，不適合硬套整個 Discord bot。

測試與 CI/CD 很值得補，尤其是在未來功能會增加的情況下。
