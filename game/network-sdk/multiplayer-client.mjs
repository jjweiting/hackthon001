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
        console.log("🦊 game/onCountdownToEnd:", data);
        this.manager.fire("game-countdown-end", data);
        // 同步觸發現有的 game-start 流程（BattleGameManager 會接）
        this.manager.fire("game-start");
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
        console.error("🦊 game/onErrorNotify:", data);
        this.manager.fire("game-error", data);
      });
    }
  }

  async createClient(roomId) {
    if (this.currentClient) {
      console.warn("🦊 Client already exists");
      return;
    }


    const client = await ViverseSdkClient.instance.newMultiplayerClient(
      roomId,
      this.appId
    );

    // NOTE: Can't get onConnected event, need to check with SDK team
    client.onConnected(() => {
      this.isConnected = true;
      this.addEventListeners();
      console.log("🦊 Multiplayer client connected.");
    });

    // 啟用 Game 模組，並設定基本倒數與遊戲時間（可依需求調整）
    const options = {
      modules: {
        game: {
          enabled: true,
          desc: "Battle Arena game",
          ready_time: 3,          // 開始前倒數秒數
          start_delay_time: 0.5,  // 倒數結束到真正開始的延遲
          play_time: 600,         // 遊戲時間（秒）
          total_player: 4,
          change_second: 10,
          min_total_player: 2,
          max_total_player: 8,
          wait_player_timeout: 100
        }
      }
    };

    await client.init(options);
    this.currentClient = client;
    this.addGameEventListeners();
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
      console.warn("🦊 No connected client to send message");
      return;
    }

    // NOTE: Can't get onConnected event, need to check with SDK team
    if (!this.isConnected) {
      return;
    }

    const stringifiedMessage = JSON.stringify({ player, ...message });
    this.currentClient.general.sendMessage(stringifiedMessage);
    // console.log('🦊📤 Sent message:', stringifiedMessage);
  }
}

export default MultiPlayerClient;
