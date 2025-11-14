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
        case 'game-started':
          // TODO: remove
          console.log('🐹 Received message:', message.type);
          this.handleOnGameStart(message.payload?.roomId);
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
    await this.matchmaking.startGame();
    this.sendMessage('game-started', { roomId: this.currentRoom.id }); // TODO: remove
    this.sendMessage('game-started', { roomId: this.currentRoom.id }); // TODO: remove
    this.fire('receive-message', {
      type: 'game-started',
      payload: {
        roomId: this.currentRoom.id,
      },
    });
  }

  async handleOnGameStart(roomId) {
    if (!this.currentRoom) return;
    if (this.currentRoom.id !== roomId) return; // TODO: remove

    await this.leaveChannel();
    await this.enterChannel(this.currentRoom.id);
    console.log('🐯 Matchmaking game started, re-entered channel:', this.currentRoom.id);
  }

  handleRoomListUpdated(rooms) {
    const isInLobby = this.matchmaking.currentClient?.isInLobby();
    const isInGameUnStartedRoom = this.currentRoom && !this.currentRoom?.is_closed;
    // const isInGameUnStartedRoom = this.currentRoom && !this.currentRoom?.is_game_started;

    // The player is in the lobby or an room which game is not started yet,
    // need to cleanup entities of players who are in started games
    if (isInLobby || isInGameUnStartedRoom) {
      const ids = [];
      rooms.forEach((room) => {
        // if (room.is_game_started) { TODO: revise
        if (room.is_closed) {
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
}

export default NetworkManager