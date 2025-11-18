import * as pc from 'playcanvas';
import MultiPlayerClient from "../network-sdk/multiplayer-client.mjs";
import MatchmakingClient from "../network-sdk/matchmaking-client.mjs";
import { RemotePlayerNetwork } from '../scripts/remote-player-network.mjs';
import { RemotePlayerAvatar } from '../scripts/remote-player-avatar.mjs';
import { LocalPlayerNetwork } from '../scripts/local-player-network.mjs';

class NetworkManager extends pc.EventHandler {
  constructor(viverseApp, pcApp, appId, debug = false) {
    super();
    this.viverseApp = viverseApp;
    this.pcApp = pcApp; 
    this.appId = appId;
    this.sessionId = `player-session-${crypto.randomUUID()}`;
    this.actorEntityMap = new Map(); 
 
    // 透過 query string 切換快速遊戲模式（略過 Lobby / Matchmaking）
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      // 支援 ?mode=game 或 ?mode=room 兩種寫法
      this.isQuickGameMode = mode === 'game';
    } catch (e) {
      this.isQuickGameMode = false;
    }

    this.multiplayer = new MultiPlayerClient(this, appId);
    this.currentChannel = null;

    this.matchmaking = new MatchmakingClient(this, appId, debug);
    if (!this.isQuickGameMode) {
      this.matchmaking.createClient();
    }
    
    const playerEntity = this.viverseApp.systems.localPlayer?.playerEntity;
    if(playerEntity){
      this.addLocalPlayerScript(playerEntity);
    }else{
      this.viverseApp.once("player:ready", this.addLocalPlayerScript, this);
    }

    this.addEventListeners();
  }

  get currentRoom() {
    return this.matchmaking.currentClient?.currentRoom ?? null;
  }

  addLocalPlayerScript(playerEntity){
    playerEntity.addComponent("script");
    playerEntity.script.create(LocalPlayerNetwork); 
  }

  addEventListeners() {
    this.on('receive-message', (message) => {
      const { type } = message;

      switch (type) {
        case 'transform-update':
          this.handleTransformUpdate(message);
          break;
        case 'actor-leave-channel':
          this.handleActorLeaveRoom(message);
          break;
        case 'animation-update':
          this.handleAnimationUpdate(message);
          break;
        // Battle Arena 用事件，交由 BattleGameManager 監聽處理
        case 'player-shoot':
        case 'player-hit':
        case 'player-killed':
        case 'score-update':
        case 'weapon-pickup':
        case 'team-assignment':
        case 'map-init':
        case 'map-config':
          break;
        default:
          console.warn('🐹 Unknown message type:', type);
      }
    });

    this.on('room-actor-changed', (actors) => {
      console.log('🐹 Room actors changed:', actors);
    });

    this.on('room-list-updated', (rooms) => {
      this.handleRoomListUpdated(rooms);
    });

    this.on('game-start', () => {
      this.handleOnGameStart();
    });

    this.on('game-error', (data) => {
      this.handleGameError(data);
    });
  }

  handleTransformUpdate(message) {
    const { player, payload } = message;

    let entity = this.actorEntityMap.get(player);
    if (!entity) {
      entity = new pc.Entity(`RemotePlayer_${player}`);
      entity.addComponent('script');
      const net = entity.script.create(RemotePlayerNetwork);
      // 記錄這個遠端玩家的 sessionId，方便射線檢測時識別
      net.sessionId = player;
      entity.script.create(RemotePlayerAvatar, {
        properties: {
          displayName: payload.profile?.displayName || 'Remote Player',
          avatarUrl: payload.profile?.avatarUrl || '',
          nameTagHeight: payload.profile?.nameTagHeight || 2.2,
          animationState: payload.animation || 'idle',
        },
      });

      // 為遠端玩家建立簡單的碰撞體，讓射線可以擊中
      if (!entity.collision) {
        entity.addComponent('collision', {
          type: 'capsule',
          radius: 0.4,
          height: 1.6,
          axis: 1
        });
      }
      if (!entity.rigidbody) {
        entity.addComponent('rigidbody', {
          type: 'kinematic'
        });
      }

      this.pcApp.root.addChild(entity);
      this.actorEntityMap.set(player, entity);
    }
    entity.fire('update-transform', { position: payload.position, rotation: payload.rotation });
    entity.fire('update-profile', { profile: payload.profile });
  }

  handleActorLeaveRoom(message) {
    const { player } = message;
    const entity = this.actorEntityMap.get(player);

    if (entity) {
      entity.destroy();
      this.actorEntityMap.delete(player);
    }

    console.log('🐹 Actor leave received:', message);
  }

  handleAnimationUpdate(message) {
    const { player, payload } = message;
    const entity = this.actorEntityMap.get(player);

    if (entity) {
      entity.fire('update-animation', { animationParams: payload.animationParams });
    }
  }

  sendMessage(type, payload) {
    const sessionId = this.sessionId;
    this.multiplayer.sendMessage(sessionId, { type, payload });
  }

  showLeaveGameButton() {
    let btn = document.getElementById('battle-leave-game-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'battle-leave-game-btn';
      btn.textContent = 'Leave Game';
      btn.style.cssText = `
        position: fixed;
        top: 16px;
        right: 16px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: bold;
        color: #ffffff;
        background: #ff534b;
        border: 2px solid #ffffff;
        border-radius: 6px;
        cursor: pointer;
        z-index: 1004;
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
      `;

      btn.onclick = () => {
        btn.disabled = true;
        btn.textContent = 'Leaving...';

        // 優先透過內部流程回到 Lobby，不重新載入頁面
        (async () => {
          try {
            // 先請 BattleGameManager 清掉戰鬥場景與 UI
            const gmEntity = this.pcApp.root.findByTag('game-manager')[0];
            const battleManager = gmEntity?.script?.battleGameManager;
            if (battleManager && typeof battleManager.resetToLobby === 'function') {
              battleManager.resetToLobby();
            }

            // 離開遊戲頻道，斷開目前的 multiplayer client
            await this.leaveChannel();

            // 如果目前是 quick game 模式，改回正常模式並建立 matchmaking client
            if (this.isQuickGameMode) {
              this.isQuickGameMode = false;
              await this.matchmaking.createClient();
            }

            // 進入 Lobby 頻道
            await this.enterLobby();

            if (btn && btn.parentNode) {
              btn.parentNode.removeChild(btn);
            }
          } catch (e) {
            console.error('🐹 Failed to enter lobby from leave button', e);
            btn.disabled = false;
            btn.textContent = 'Leave Game';
          }
        })();
      };

      document.body.appendChild(btn);
    } else {
      btn.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Leave Game';
    }
  }

  hideLeaveGameButton() {
    const btn = document.getElementById('battle-leave-game-btn');
    if (btn && btn.parentNode) {
      btn.parentNode.removeChild(btn);
    }
  }

  showGameStartButton() {
    if (!this.multiplayer.currentClient?.game?.gameStart) {
      console.warn('🐹 Game module not ready, cannot show Game Start button.');
      return;
    }

    let btn = document.getElementById('battle-game-start-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'battle-game-start-btn';
      btn.textContent = 'Game Start';
      btn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 16px 32px;
        font-size: 24px;
        font-weight: bold;
        color: #ffffff;
        background: #0241e2;
        border: 2px solid #ffffff;
        border-radius: 8px;
        cursor: pointer;
        z-index: 1003;
        box-shadow: 0 0 16px rgba(0, 0, 0, 0.6);
      `;

      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Waiting...';
        try {
          // 由 Host 在按 Game Start 時觸發 gameStart，
          // 真正的地圖（障礙物 / 武器箱）廣播改由 BattleGameManager 在倒數結束時處理。
          await this.multiplayer.currentClient.game.gameStart();
          // 按鈕保留，由倒數事件決定何時關閉
        } catch (e) {
          console.error('🐹 Failed to call game.gameStart:', e);
          btn.disabled = false;
          btn.textContent = 'Game Start';
        }
      };

      document.body.appendChild(btn);
    } else {
      btn.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Game Start';
    }
  }

  hideGameStartButton() {
    const btn = document.getElementById('battle-game-start-btn');
    if (btn && btn.parentNode) {
      btn.parentNode.removeChild(btn);
    }
  }

  async enterLobby() {
    // 快速遊戲模式：略過 Lobby，直接進入共用遊戲頻道
    if (this.isQuickGameMode) {
      await this.leaveChannel();
      const channelId = `battle-game-${this.appId || "default"}`;
      console.log('🦊 Quick game mode, enter game channel:', channelId);
      await this.enterChannel(channelId);
      // 直接顯示 Game Start 按鈕，讓任一玩家可觸發 gameStart
      this.showGameStartButton();
      return;
    }

    const promises = [];
    promises.push(this.leaveChannel());
    promises.push(this.matchmaking.leaveRoom());
    await Promise.all(promises);

    const hasLobbyChannel = true;
    // const hasLobbyChannel = qsHas('lobby');
    if (hasLobbyChannel) {
      const name = `lobbyyy${this.appId}`;
      console.log('🦊 Lobby', name);
      await this.enterChannel(name);
      // 通知 UI / 其他系統已回到 Lobby
      this.fire('entered-lobby');
    }
  }

  async createRoom(name, { mode = 'solo', maxPlayers = 4, minPlayers = 1 } = {}) {
    const result = await this.matchmaking.createRoom({
      name: name,
      mode: mode ?? 'solo',
      maxPlayers: maxPlayers ?? 4,
      minPlayers: minPlayers ?? 1,
    });

    console.log('🐯 Matchmaking create room result:', result);
  }

  async joinRoom(roomId) {
    await this.matchmaking.joinRoom(roomId);
    console.log('🐯 Matchmaking joined room:', roomId);
  }

  async startGame() {
    // 在 Lobby 中呼叫，通知 Matchmaking 開始遊戲（關閉房間）
    await this.matchmaking.startGame();
  }

  async handleOnGameStart(roomId) {
    if (!this.currentRoom) return;
    await this.leaveChannel();
    await this.enterChannel(this.currentRoom.id);
    console.log('🐯 Matchmaking game started, re-entered channel:', this.currentRoom.id);

    const isHost = this.currentRoom.created_by_me;
    if (isHost) {
      // 房主一進遊戲房就先產生「基礎競技場」（地板 / 牆 / 出生點），但尚未產生障礙物與武器箱。
      const seed = Math.floor(Math.random() * 1e9) || Date.now();
      // 先在本地建立基礎場景
      const gmEntity = this.pcApp.root.findByTag('game-manager')[0];
      const battleManager = gmEntity?.script?.battleGameManager;
      if (battleManager && typeof battleManager.handleMapInit === 'function') {
        battleManager.handleMapInit({ seed });
      }

      // 再透過 map-init 廣播 seed，讓所有玩家用相同 seed 建立相同的基礎場景。
      // 並且每秒重送一次，最多 10 次，避免在切換 channel / 建立 client 過程中被吃掉。
      this.scheduleMapInitBroadcast(seed);

      this.showGameStartButton();
    }
  }

  /**
   * Host 在切到新 channel 並建立 multiplayer client 後，
   * 每秒送出一次 map-init（最多 10 次），讓後加入的玩家也能拿到 seed。
   */
  scheduleMapInitBroadcast(seed) {
    if (this._mapInitInterval) {
      clearInterval(this._mapInitInterval);
      this._mapInitInterval = null;
    }

    let count = 0;
    this._mapInitInterval = setInterval(() => {
      // 若已離開 channel 或沒有 multiplayer client，就停止
      if (!this.multiplayer?.currentClient || !this.currentChannel) {
        clearInterval(this._mapInitInterval);
        this._mapInitInterval = null;
        return;
      }

      count += 1;
      console.log('🐯 Host sent map-init with seed:', seed, 'count:', count);
      this.sendMessage('map-init', { seed });

      if (count >= 2) {
        clearInterval(this._mapInitInterval);
        this._mapInitInterval = null;
      }
    }, 1000);
  }

  handleRoomListUpdated(rooms) {
    const isInLobby = this.matchmaking.currentClient?.isInLobby();
    const isInGameUnStartedRoom = this.currentRoom && !this.currentRoom?.is_closed && !this.currentRoom?.is_game_started;
    // const isInGameUnStartedRoom = this.currentRoom && !this.currentRoom?.is_game_started;

    // The player is in the lobby or an room which game is not started yet,
    // need to cleanup entities of players who are in started games
    if (isInLobby || isInGameUnStartedRoom) {
      const ids = [];
      rooms.forEach((room) => {
        // if (room.is_game_started) { TODO: revise
        if (room.is_closed || room.is_game_started) {
          room.actors.forEach((actor) => {
            ids.push(actor.session_id);
          });
        }
      });

      this.cleanupActorEntities(ids);
    }
  }

  cleanupActorEntities(actorIds) {
    actorIds.forEach((actorId) => {
      const entity = this.actorEntityMap.get(actorId);
      if (entity) {
        entity.destroy();
        this.actorEntityMap.delete(actorId);
      }
    });
  }

  async enterChannel(channelId) {
    if (this.currentChannel === channelId) {
      return;
    }

    this.currentChannel = channelId;
    await this.multiplayer.createClient(channelId);
  }

  async leaveChannel() {
    this.currentChannel = null;
    this.sendMessage('actor-leave-channel');
    // @ts-ignore
    const ids = [...this.actorEntityMap.keys()];
    this.cleanupActorEntities(ids);
    await this.multiplayer.removeClient();
  }

  handleGameError(data) {
    console.warn('🐹 Game error:', data);

    // 若玩家尚未全數準備好，保持或重新顯示 Game Start 按鈕
    if (data?.error_type === 'player_not_all_ready') {
      this.showGameStartButton();
    }
  }
}

export default NetworkManager
