# Hackathon001 專案計劃

## 專案簡介

**Hackathon001** 是一個基於 VIVERSE 平台和 PlayCanvas 引擎開發的多人線上互動專案。此專案整合了 HTC 的 VIVERSE SDK，提供完整的多人遊戲網路功能架構，包含即時同步、配對系統、以及玩家狀態管理。

### 核心技術棧

- **遊戲引擎**: PlayCanvas (WebGL-based 3D 遊戲引擎)
- **框架**: VIVERSE Core SDK (@viverse/core)
- **物理引擎**: Ammo.js (Bullet Physics 的 JavaScript 移植版本)
- **程式語言**: JavaScript (ES6 Modules)
- **網路功能**: VIVERSE Multiplayer SDK + Matchmaking SDK

### 專案架構

```
hackthon001/
├── ammo.js/                    # 物理引擎相關檔案
├── extension-scripts/          # 擴展腳本入口
├── game/                       # 遊戲核心程式碼
│   ├── managers/               # 管理器層
│   │   ├── game-manager.mjs    # 遊戲主管理器
│   │   └── network-manager.mjs # 網路管理器
│   ├── network-sdk/            # 網路 SDK 封裝層
│   │   ├── matchmaking-client.mjs    # 配對系統客戶端
│   │   ├── multiplayer-client.mjs    # 多人遊戲客戶端
│   │   └── viverse-sdk-client.mjs    # VIVERSE SDK 客戶端
│   └── scripts/                # 遊戲腳本
│       ├── index.mjs           # 自訂腳本入口
│       ├── local-player-network.mjs   # 本地玩家網路同步
│       ├── network-ui.mjs      # 網路介面
│       ├── remote-player-avatar.mjs   # 遠端玩家化身
│       └── remote-player-network.mjs  # 遠端玩家網路同步
└── scripts/                    # 全局腳本
    └── index.mjs               # 全局入口腳本
```

### 功能特色

1. **多人即時同步**
   - 玩家位置、旋轉、動畫狀態的即時同步
   - 優化的網路傳輸頻率（移動時 0.05s，靜止時 0.5s）
   - 遠端玩家插值與平滑移動

2. **配對系統**
   - 房間列表查詢與管理
   - 自動配對與手動加入房間
   - 房間人數上限管理
   - 玩家進出房間事件處理

3. **玩家管理**
   - 本地玩家與遠端玩家分離管理
   - 玩家化身（Avatar）系統
   - 玩家 session 管理與識別

4. **任務系統架構**
   - 支援自訂任務（Quest）系統
   - 任務進度追蹤
   - 任務完成回調機制

---

## 開發指南

### 環境需求

- **PlayCanvas 帳號**: 需要 [PlayCanvas](https://playcanvas.com/) 帳號
- **瀏覽器**: 支援 WebGL 2.0 的現代瀏覽器（Chrome、Firefox、Edge、Safari）
- **VIVERSE 帳號**: 需要有效的 VIVERSE App ID

### 開發設置

#### 1. 配置 VIVERSE App ID

在 PlayCanvas Editor 中開啟專案後，找到 `game-manager.mjs` 並設置您的 VIVERSE App ID：

```javascript
export class GameManager extends Script {
  appId = "YOUR_VIVERSE_APP_ID"; // 填入您的 App ID
  debug = true; // 開發時建議開啟除錯模式
}
```

#### 2. PlayCanvas Editor 開發流程

本專案採用 **PlayCanvas Editor** 進行開發和預覽：

1. **上傳專案到 PlayCanvas**
   - 登入 [PlayCanvas Editor](https://playcanvas.com/)
   - 將專案檔案上傳至 PlayCanvas 專案中
   - 確保檔案結構與本地目錄一致

2. **在編輯器中預覽**
   - 點擊 PlayCanvas Editor 上方的 "Launch" 按鈕
   - 使用瀏覽器的開發者工具查看 Console 日誌
   - 即時編輯程式碼並重新啟動預覽

3. **多人測試**
   - 複製預覽的 URL
   - 在多個瀏覽器標籤頁或不同裝置中開啟
   - 測試多人同步功能

> **注意**: 所有開發都在 PlayCanvas Editor 雲端進行，不需要在本地啟動伺服器

#### 3. 主要開發檔案

**遊戲邏輯開發**:
- `game/scripts/index.mjs` - 自訂遊戲邏輯入口
- `game/managers/game-manager.mjs` - 遊戲核心管理

**網路功能擴展**:
- `game/managers/network-manager.mjs` - 網路事件處理
- `game/scripts/local-player-network.mjs` - 本地玩家同步邏輯
- `game/scripts/remote-player-network.mjs` - 遠端玩家同步邏輯

**UI 與互動**:
- `game/scripts/network-ui.mjs` - 多人遊戲 UI 介面

### 開發工作流程

1. **在 PlayCanvas Editor 中編輯程式碼**
   - 在 Editor 左側的資源面板找到對應的 `.mjs` 檔案
   - 雙擊開啟程式碼編輯器
   - 修改完成後按 `Ctrl/Cmd + S` 儲存

2. **修改遊戲邏輯**
   - 在 `game/scripts/index.mjs` 中添加自訂邏輯
   - 使用 `onBeforeInit()` 進行初始化前的設置
   - 使用 `onReady()` 進行遊戲啟動時的邏輯

3. **新增網路事件**
   - 在 `network-manager.mjs` 的 `addEventListeners()` 中註冊新事件
   - 在 `handleMessage()` 中處理接收到的網路訊息
   - 使用 `this.multiplayer.sendMessage()` 發送訊息

4. **創建新腳本**
   ```javascript
   import { Script } from "playcanvas";
   
   export class MyCustomScript extends Script {
     static scriptName = "myCustomScript";
     
     initialize() {
       // 初始化邏輯
     }
     
     update(dt) {
       // 每幀更新邏輯
     }
   }
   ```

5. **預覽與測試**
   - 點擊 PlayCanvas Editor 頂部的 "Launch" 按鈕啟動預覽
   - 按 `F12` 開啟瀏覽器開發者工具查看 Console
   - 修改程式碼後，重新 Launch 以查看變更

6. **測試多人功能**
   - 複製預覽視窗的 URL
   - 在新的瀏覽器標籤頁或無痕模式中開啟相同 URL
   - 檢查 Console 的網路日誌（🦊、🐯 emoji 前綴）

### 除錯技巧

- **在 PlayCanvas Editor 中除錯**: 使用瀏覽器開發者工具的 Sources 面板設置中斷點- **網路訊息追蹤**: 取消註解 `multiplayer-client.mjs` 中的 console.log
- **配對系統除錯**: 設置 `debug = true` 在 GameManager
- **玩家狀態檢查**: 使用 `window.game` 訪問 GameManager 實例
- **檢查房間狀態**: `window.game.network.currentRoom`

---

## 未來計劃

### 階段一：遊戲概念發想
目前專案已經建立了完整的多人遊戲基礎架構，接下來需要決定遊戲的核心玩法。

**可能的遊戲方向**:
1. **社交互動類**
   - 虛擬聚會空間
   - 協作創作平台
   - 虛擬展覽館

2. **競技類遊戲**
   - 多人競速遊戲
   - 團隊對戰遊戲
   - 回合制策略遊戲

3. **合作冒險類**
   - 多人解謎遊戲
   - 協作生存遊戲
   - RPG 冒險遊戲

4. **休閒娛樂類**
   - 派對小遊戲合集
   - 虛擬運動遊戲
   - 音樂節奏遊戲

### 階段二：核心功能擴展

**待開發功能列表**:
- [ ] 遊戲核心玩法機制
- [ ] 完整的 UI/UX 系統
- [ ] 玩家數據持久化
- [ ] 成就與排行榜系統
- [ ] 語音聊天整合
- [ ] 房間自訂設定（人數、規則等）
- [ ] 觀戰者模式
- [ ] 遊戲內購與經濟系統

### 階段三：優化與擴展

**技術優化**:
- [ ] 網路延遲補償演算法
- [ ] 客戶端預測與伺服器和解
- [ ] 大廳系統與社交功能
- [ ] 效能分析與優化
- [ ] 跨平台支援（VR/AR/桌面）

**內容擴展**:
- [ ] 多樣化的角色與化身系統
- [ ] 場景與地圖設計
- [ ] 特效與音效設計
- [ ] 故事與世界觀建構

### 階段四：發布與營運

- [ ] Beta 測試與用戶反饋收集
- [ ] 性能監控與日誌系統
- [ ] 版本管理與更新機制
- [ ] 社群營運與內容更新
- [ ] 數據分析與用戶留存優化

---

## 注意事項

1. **VIVERSE SDK 限制**
   - 確保 App ID 正確配置
   - 注意 SDK 版本相容性
   - 部分事件（如 `onConnected`）可能需要與 SDK 團隊確認

2. **網路延遲處理**
   - 目前使用簡單的狀態同步，高延遲環境可能需要額外優化
   - 考慮實作客戶端預測與插值

3. **資源管理**
   - 注意遠端玩家的創建與銷毀
   - 避免記憶體洩漏（特別是事件監聽器）

4. **安全性**
   - 重要的遊戲邏輯應該在伺服器端驗證
   - 避免在客戶端暴露敏感資訊

---

## 參考資源

- [PlayCanvas 官方文檔](https://developer.playcanvas.com/)
- [VIVERSE 開發者文檔](https://developer.viverse.com/)
- [Ammo.js 物理引擎](https://github.com/kripken/ammo.js/)

---

**最後更新**: 2025年11月14日  
**專案狀態**: 基礎架構完成，待遊戲玩法設計  
**維護者**: Wade Chen
