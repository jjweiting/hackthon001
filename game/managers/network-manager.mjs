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
 
    this.multiplayer = new MultiPlayerClient(this, appId);
    this.currentChannel = null;

    this.matchmaking = new MatchmakingClient(this, appId, debug);
    this.matchmaking.createClient();
    
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
      entity.script.create(RemotePlayerNetwork);
      entity.script.create(RemotePlayerAvatar, {
        properties: {
          displayName: payload.profile?.displayName || 'Remote Player',
          avatarUrl: payload.profile?.avatarUrl || '',
          nameTagHeight: payload.profile?.nameTagHeight || 2.2,
          animationState: payload.animation || 'idle',
        },
      });
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
        btn.textContent = 'Starting...';
        try {
          await this.multiplayer.currentClient.game.gameStart();
          if (btn && btn.parentNode) {
            btn.parentNode.removeChild(btn);
          }
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

  async enterLobby() {
    const promises = [];
    promises.push(this.leaveChannel());
    promises.push(this.matchmaking.leaveRoom());
    await Promise.all(promises);

    const hasLobbyChannel = true;
    // const hasLobbyChannel = qsHas('lobby');
    if (hasLobbyChannel) {
      const name = `lobbyyy${this.appId}`;
      console.log('🦊 Lobby', name);
      this.enterChannel(name);
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

    // 只有房主在「遊戲房」內看到 Game Start 按鈕，點擊後才觸發 gameStart
    const isHost = this.currentRoom.created_by_me;
    if (isHost) {
      this.showGameStartButton();
    }
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
    console.error('🐹 Game error:', data);

    // 若玩家尚未全數準備好，保持或重新顯示 Game Start 按鈕
    if (data?.error_type === 'player_not_all_ready') {
      this.showGameStartButton();
    }
  }
}

export default NetworkManager
