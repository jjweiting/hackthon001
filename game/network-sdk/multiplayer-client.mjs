import ViverseSdkClient from "./viverse-sdk-client.mjs";

class MultiPlayerClient {
  constructor(manager, appId) {
    if (MultiPlayerClient.instance) {
      return MultiPlayerClient.instance;
    }

    this.appId = appId;
    this.manager = manager;
    this.currentClient = null;
    this.isConnected = false; 
    this._connectedPromise = null;
    MultiPlayerClient.instance = this;
  }

  addEventListeners() {
    if (!this.currentClient) {
      return;
    }

    this.currentClient.general.onMessage((message) => {
      const parsed =
        typeof message !== "string" ? message : JSON.parse(message);
      this.manager.fire("receive-message", parsed);
      // console.log('🦊📩 onMessage:', parsed); 
    });
  }

  addGameEventListeners() {
    if (!this.currentClient || !this.currentClient.game) {
      return;
    }

    const game = this.currentClient.game;

    // 遊戲倒數開始（例如 ready_time 期間）
    if (typeof game.onCountdownToStart === "function") {
      game.onCountdownToStart((data) => {
        console.log("🦊 game/onCountdownToStart:", data);
        this.manager.fire("game-countdown-start", data);
      });
    }

    // 倒數結束，正式進入遊戲
    if (typeof game.onCountdownToEnd === "function") {
      game.onCountdownToEnd((data) => {
        this.manager.fire("game-countdown-end", data);
      });
    }

    // 遊戲時間結束
    if (typeof game.onGameTimeUp === "function") {
      game.onGameTimeUp(() => {
        console.log("🦊 game/onGameTimeUp");
        this.manager.fire("game-time-up");
      });
    }

    // Host 主動結束遊戲
    if (typeof game.onGameEnd === "function") {
      game.onGameEnd(() => {
        console.log("🦊 game/onGameEnd");
        this.manager.fire("game-end");
      });
    }

    // Host 觸發重新開始
    if (typeof game.onGameRestart === "function") {
      game.onGameRestart(() => {
        console.log("🦊 game/onGameRestart");
        this.manager.fire("game-restart");
      });
    }

    // 錯誤通知
    if (typeof game.onErrorNotify === "function") {
      game.onErrorNotify((data) => {
        console.warn("🦊 game/onErrorNotify:", data);
        this.manager.fire("game-error", data);
      });
    }
  }

  async createClient(roomId) {
    if (this.currentClient) {
      console.warn("🦊 Client already exists");
      return this._connectedPromise;
    }


    const client = await ViverseSdkClient.instance.newMultiplayerClient(
      roomId,
      this.appId
    );

    // 等待 onConnected，確保連線完成後才進行後續操作
    this._connectedPromise = new Promise((resolve) => {
      client.onConnected(() => {
        this.isConnected = true;
        this.addEventListeners();
        console.log("🦊 Multiplayer client connected.");
        resolve();
      });
    });

    // Lobby 與遊戲房使用不同的 init 策略：
    // - Lobby（例如 "lobbyyy<appId>"）不啟用 game 模組
    // - 進入遊戲房（或 quick 模式的 game channel）才啟用 game 模組
    const isLobbyChannel =
      typeof roomId === "string" && roomId.startsWith("lobbyyy");

    if (isLobbyChannel) {
      await client.init();
      this.currentClient = client;
    } else {
      const options = {
        modules: {
          game: {
            enabled: true,
            desc: "Battle Arena game",
            ready_time: 3,
            start_delay_time: 0.5,
            play_time: 600,
            total_player: 1,
            min_total_player: 1,
            max_total_player: 8,
            wait_player_timeout: 100
          }
        }
      };

      await client.init(options);
      this.currentClient = client;
      this.addGameEventListeners();
    }

    await this._connectedPromise;
  }

  async removeClient() {
    if (this.currentClient) {
      await this.currentClient.disconnect();
      this.currentClient = null;
      this.isConnected = false;
    }
  }

  sendMessage(player, message) {
    if (!this.currentClient) {
      console.warn("🦊 No connected client to send message: ", message);
      return;
    }

    if (!this.isConnected) {
      // 還沒連線完成就送訊息直接忽略即可，避免刷警告
      return;
    }

    const stringifiedMessage = JSON.stringify({ player, ...message });
    this.currentClient.general.sendMessage(stringifiedMessage);
    // console.log('🦊📤 Sent message:', stringifiedMessage);
  }
}

export default MultiPlayerClient;
