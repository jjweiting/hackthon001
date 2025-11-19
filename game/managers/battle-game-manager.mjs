import * as pc from "playcanvas";
import { Script } from "playcanvas";
import { ViverseApp } from "@viverse/core";
import { PlayerCombat } from "../scripts/battle-arena/player-combat.mjs";
import { HealthSystem } from "../scripts/battle-arena/health-system.mjs";
import { ArenaGenerator } from "../scripts/battle-arena/arena-generator.mjs";

export class BattleGameManager extends Script {
  static scriptName = "battleGameManager";

  /**
   * @attribute
   * @title Game Mode
   * @type {string}
   * @enum [{"2v2": "2v2"}, {"4v4": "4v4"}]
   */
  gameMode = "2v2";

  /**
   * @attribute
   * @title Match Duration (seconds)
   * @type {number}
   */
  matchDuration = 600;

  /**
   * @attribute
   * @title Target Score
   * @type {number}
   */
  targetScore = 3;

  /**
   * @attribute
   * @title Respawn Time (seconds)
   * @type {number}
   */
  respawnTime = 5;

  initialize() {
    console.log("[BattleGame][DEBUG] BattleGameManager initialize", {
      entityName: this.entity?.name
    });

    // 一場比賽內，避免 startMatch 被重複呼叫
    this._matchStarted = false;

    this.viverseApp = ViverseApp.getApplication();
    const gameManagerEntity = this.app.root.findByTag("game-manager")[0];
    this.gameManager = gameManagerEntity?.script?.gameManager;
    this.network = this.gameManager?.network;

    this.gameState = {
      phase: "waiting",
      teamA: { score: 0, players: [] },
      teamB: { score: 0, players: [] },
      matchTime: 0,
      mapSeed: null
    };

    // 強制本局比賽目標分數為 3（避免 Editor 中舊有序列化數值仍為 50）
    this.targetScore = 3;

    this.players = new Map();
    this.localPlayer = null;
    this._arenaGenerated = false;
    this._respawnCountdownRemaining = null;

    if (this.network) {
      this.setupNetworkEvents();
    }

    const playerEntity = this.viverseApp.systems.localPlayer?.playerEntity;
    if (playerEntity) {
      this.initializeLocalPlayer(playerEntity);
    } else {
      this.viverseApp.once("player:ready", this.initializeLocalPlayer, this);
    }

    this.on("destroy", this.onDestroy, this);
  }

  onDestroy() {
    if (!this.network) return;
    this.network.off("room-actor-changed", this.onRoomActorChanged, this);
    this.network.off("game-countdown-start", this.onCountdownStart, this);
    this.network.off("game-countdown-end", this.onCountdownEnd, this);
    this.network.off("game-time-up", this.onGameTimeUp, this);
    this.network.off("game-end", this.onGameEnd, this);
    this.network.off("game-restart", this.onGameRestart, this);
    this.network.off("receive-message", this.onNetworkMessage, this);
  }

  initializeLocalPlayer(playerEntity) {
    console.log("[BattleGame][DEBUG] initializeLocalPlayer called", {
      hasExistingLocalPlayer: !!this.localPlayer,
      playerEntityName: playerEntity?.name,
      sessionId: this.network?.sessionId
    });

    this.localPlayer = {
      entity: playerEntity,
      sessionId: this.network?.sessionId ?? null,
      team: null,
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      currentWeapon: "pistol",
      isAlive: true
    };

    console.log("[BattleGame][DEBUG] initializeLocalPlayer set HP", {
      health: this.localPlayer.health,
      maxHealth: this.localPlayer.maxHealth
    });

    if (!playerEntity.script) {
      playerEntity.addComponent("script");
    }

    if (!playerEntity.script.playerCombat) {
      const combat = playerEntity.script.create(PlayerCombat);
      combat.battleManager = this;
    }

    if (!playerEntity.script.healthSystem) {
      playerEntity.script.create(HealthSystem, {
        properties: {
          maxHealth: 100
        }
      });
    }
  }

  setupNetworkEvents() {
    this.network.on("room-actor-changed", this.onRoomActorChanged, this);
    this.network.on("game-countdown-start", this.onCountdownStart, this);
    this.network.on("game-countdown-end", this.onCountdownEnd, this);
    this.network.on("game-time-up", this.onGameTimeUp, this);
    this.network.on("game-end", this.onGameEnd, this);
    this.network.on("game-restart", this.onGameRestart, this);
    this.network.on("receive-message", this.onNetworkMessage, this);
  }

  onRoomActorChanged(actors) {
    this.assignTeams(actors);
  }

  assignTeams(actors) {
    if (!actors) return;

    const maxPlayersPerTeam = this.gameMode === "2v2" ? 2 : 4;

    this.gameState.teamA.players = [];
    this.gameState.teamB.players = [];

    actors.forEach((actor, index) => {
      const team = index % 2 === 0 ? "A" : "B";

      if (team === "A" && this.gameState.teamA.players.length < maxPlayersPerTeam) {
        this.gameState.teamA.players.push(actor.session_id);
      } else if (team === "B" && this.gameState.teamB.players.length < maxPlayersPerTeam) {
        this.gameState.teamB.players.push(actor.session_id);
      }

      if (actor.session_id === this.network.sessionId && this.localPlayer) {
        this.localPlayer.team = team;
      }
    });

    if (this.isRoomLeader()) {
      this.broadcastTeamAssignment();
    }
  }

  onCountdownStart(data) {
    console.log("Countdown started: ", data);
    this.gameState.phase = "countdown";

    const seconds = data?.second ?? 3;
    this.countdownTimeRemaining = seconds;
    this.countdownLastShown = null;
    this.showCountdownUI(Math.ceil(this.countdownTimeRemaining));

    // 倒數開始時關閉 Game Start 按鈕
    if (this.network && typeof this.network.hideGameStartButton === "function") {
      this.network.hideGameStartButton();
    }
  }

  updateCountdown(dt) {
    if (this.gameState.phase !== "countdown") return;
    if (this.countdownTimeRemaining == null) return;

    this.countdownTimeRemaining -= dt;
    const currentInt = Math.max(0, Math.ceil(this.countdownTimeRemaining));

    if (this.countdownLastShown !== currentInt) {
      this.countdownLastShown = currentInt;
      this.showCountdownUI(currentInt);
    }
  }

  onCountdownEnd(data) {
    // 若比賽已經結束或不在倒數階段，忽略多餘的倒數結束事件（避免重複開新局）
    if (this.gameState.phase === "finished" || this.gameState.phase === "playing") {
      return;
    }

    // 伺服器宣告倒數結束，此時 data.second 通常是遊戲總時間
    const playSeconds = data?.second;
    if (typeof playSeconds === "number" && playSeconds > 0) {
      this.matchDuration = playSeconds;
      this.gameState.matchTime = 0;
      this.showGameTimeUI(playSeconds);
    }

    // 倒數已結束，不再顯示「GO!」訊息
    this.hideCountdownUI();

    // 倒數結束後切換到 playing 狀態，開始計時與 HUD 更新
    this.enterPlayingPhase();
  }

  /**
   * 由倒數結束事件觸發，正式進入「playing」階段。
   * 一場比賽內只會執行一次（由 _matchStarted 保護）。
   */
  enterPlayingPhase() {
    if (this._matchStarted) {
      return;
	    }
	    this._matchStarted = true;
	
	    console.log("[BattleGame][DEBUG] enterPlayingPhase");
	
	    this.gameState.phase = "playing";
	    this.gameState.matchTime = 0;

	    // 確保在每一局正式開始時，房主已經產生並廣播動態場景；
	    // 若先前已由 NetworkManager 呼叫過，_arenaGenerated 會避免重複生成。
	    if (this.isRoomLeader() && typeof this.generateAndBroadcastDynamicArena === "function") {
	      this.generateAndBroadcastDynamicArena();
	    }

    this.hideCountdownUI();

    if (this.localPlayer) {
      this.respawnPlayer(this.localPlayer);
    }

    // 顯示離開遊戲按鈕
    if (this.network && typeof this.network.showLeaveGameButton === "function") {
      this.network.showLeaveGameButton();
    }
  }

  updateMatchTimer(dt) {
    if (this.gameState.phase !== "playing") return;

    this.gameState.matchTime += dt;

    const remaining = Math.max(0, this.matchDuration - this.gameState.matchTime);
    this.showGameTimeUI(remaining);
    this.showStatusHUD();

    // 更新本地玩家死亡倒數 UI
    this.updateDeathCountdown(dt);

    // 更新遠端玩家死亡顯示（例如暫時隱藏被擊殺玩家）
    this.updateRemoteDeathVisuals();

    if (this.gameState.matchTime >= this.matchDuration) {
      this.endMatch("time_limit");
    }

    // 提前達成目標分數時，由房主呼叫 SDK 的 gameEnd()，統一結束本局遊戲。
    let winReason = null;
    if (this.gameState.teamA.score >= this.targetScore) {
      winReason = "team_a_win";
    } else if (this.gameState.teamB.score >= this.targetScore) {
      winReason = "team_b_win";
    }

    if (winReason && this.network) {
      // 只有房主向 SDK 宣告 gameEnd，其他 Client 等待 game-end 事件。
      if (this.isRoomLeader() && this.network.multiplayer?.currentClient?.game?.gameEnd) {
        try {
          this.network.multiplayer.currentClient.game.gameEnd();
        } catch (e) {
          console.error("[BattleGame] Failed to call gameEnd()", e);
        }
      }

      // 本地仍立即進入結束流程，避免等待網路延遲。
      this.endMatch(winReason);
    }
  }

  generateArena(seed) {
    const arenaGenerator = this.entity.script?.arenaGenerator;
    if (!arenaGenerator) {
      if (!this.entity.script) {
        this.entity.addComponent("script");
      }
      this.entity.script.create(ArenaGenerator, {
        properties: {
          seed: seed
        }
      });
    } else if (arenaGenerator.regenerate) {
      arenaGenerator.regenerate(seed);
    }
  }

  onNetworkMessage(message) {
    const { type, payload, player } = message;

    switch (type) {
      case "map-config":
        console.log("Received map-config:", payload);
        this.handleMapConfig(payload);
        break;
      case "map-init":
        console.log("Received map-init:", payload);
        this.handleMapInit(payload);
        break;
      case "player-shoot":
        this.handlePlayerShoot({
          playerId: player,
          ...payload
        });
        break;
      case "player-hit":
        this.handlePlayerHit(payload);
        break;
      case "player-killed":
        this.handlePlayerKilled(payload);
        break;
      case "score-update":
        this.handleScoreUpdate(payload);
        break;
      case "weapon-pickup":
        this.handleWeaponPickup(payload);
        break;
      case "team-assignment":
        this.handleTeamAssignment(payload);
        break;
      default:
        break;
    }
  }

  handleMapInit(message) {
    const { seed } = message;
    if (typeof seed !== "number") return;

    // 保留舊的 seed 方式作為 fallback，但優先使用 map-config
    this.gameState.mapSeed = seed;
    this.generateArena(seed);
  }

  handleMapConfig(payload) {
    const { mapConfig } = payload || {};
    if (!mapConfig) return;

    let arenaGenerator = this.entity.script?.arenaGenerator;
    if (!arenaGenerator) {
      if (!this.entity.script) {
        this.entity.addComponent("script");
      }
      arenaGenerator = this.entity.script.create(ArenaGenerator);
    }

    if (typeof arenaGenerator.generateFromConfig === "function") {
      arenaGenerator.generateFromConfig(mapConfig);
    }
  }

  /**
   * 僅在房主端於倒數結束瞬間呼叫：
   * - 使用 ArenaGenerator 產生障礙物與武器箱
   * - 匯出 mapConfig 並透過 network 傳給所有 Client
   */
  generateAndBroadcastDynamicArena() {
    if (!this.network) return;
    if (!this.isRoomLeader()) return;

    // 同一場遊戲只生成一次動態場景，避免重複廣播 map-config
    if (this._arenaGenerated) {
      return;
    }
    this._arenaGenerated = true;

    let arenaGenerator = this.entity.script?.arenaGenerator;
    if (!arenaGenerator) {
      if (!this.entity.script) {
        this.entity.addComponent("script");
      }
      arenaGenerator = this.entity.script.create(ArenaGenerator);
    }

    const seed = this.gameState.mapSeed || Date.now();
    this.gameState.mapSeed = seed;

    if (typeof arenaGenerator.generateDynamic === "function") {
      arenaGenerator.generateDynamic(seed);

      // Debug: 檢查在 Host 端實際存在多少武器箱（透過 tag 掃描場景）
      const weaponBoxEntities =
        arenaGenerator.app.root.findByTag("weapon-box") || [];
      console.log("[BattleGame] Host dynamic arena generated", {
        seed,
        generatedCount: arenaGenerator.generatedEntities?.length || 0,
        weaponBoxCountInScene: weaponBoxEntities.length
      });
    }

    if (typeof arenaGenerator.exportMapConfig === "function") {
      const mapConfig = arenaGenerator.exportMapConfig();
      if (mapConfig) {
        console.log("[BattleGame] Host exportMapConfig summary", {
          obstacleCount: mapConfig.obstacles?.length || 0,
          weaponBoxCount: mapConfig.weaponBoxes?.length || 0
        });

        // host 端自己也先套用一次，確保走同一條重建流程
        this.handleMapConfig({ mapConfig });
        // 再透過 network 連續多次廣播給其他玩家（避免在切換 channel 期間被吃掉）
        this.scheduleMapConfigBroadcast(mapConfig);
      }
    }
  }

  /**
   * Host 在產生動態場景後，連續多次送出 map-config，
   * 類似 map-init 的重送機制，避免在 client 剛連上 channel 時漏收。
   */
  scheduleMapConfigBroadcast(mapConfig) {
    if (!this.network) return;

    if (this._mapConfigInterval) {
      clearInterval(this._mapConfigInterval);
      this._mapConfigInterval = null;
    }

    let count = 0;
    this._mapConfigInterval = setInterval(() => {
      // 若網路已不存在，停止重送
      if (!this.network) {
        clearInterval(this._mapConfigInterval);
        this._mapConfigInterval = null;
        return;
      }

      count += 1;
      console.log("[BattleGame] Host broadcast map-config, count:", count);
      this.network.sendMessage("map-config", { mapConfig });

      if (count >= 2) {
        clearInterval(this._mapConfigInterval);
        this._mapConfigInterval = null;
      }
    }, 1000);
  }

  handlePlayerShoot(message) {
    const { playerId, direction, weaponType, position } = message;
    if (!this.network || playerId === this.network.sessionId) return;
    this.createShootEffect(position, direction, weaponType);
  }

  handlePlayerHit(message) {
    if (!this.network || !this.localPlayer) return;
    const { targetId, damage, shooterId } = message;

    // 僅當自己是目標且仍存活時才處理傷害，避免死亡期間重複被擊中又送出多次 player-killed
    if (targetId === this.network.sessionId && this.localPlayer.isAlive) {
      console.log("[BattleGame] local player hit", {
        from: shooterId,
        damage,
        beforeHp: this.localPlayer.health
      });

      this.localPlayer.health -= damage;
      this.showDamageEffect();

      if (this.localPlayer.health <= 0) {
        this.onLocalPlayerDeath(shooterId);
      }
    }
  }

  handlePlayerKilled(message) {
    const { victimId, killerId } = message;

    // 避免同一段死亡期間重複處理相同 victim/killer 的擊殺（例如網路重送）
    const now = this.app.time;
    const existingInfo = this.players.get(victimId);
    if (
      existingInfo &&
      existingInfo.deathEndTime &&
      existingInfo.deathEndTime > now &&
      existingInfo.lastKillerId === killerId
    ) {
      return;
    }

    if (this.network && this.localPlayer && killerId === this.network.sessionId) {
      this.localPlayer.kills += 1;
      this.showLocalKillPopup(victimId);
    }

    const killerTeam = this.getPlayerTeam(killerId);

    // 只由房主負責「認定擊殺並更新比分」，再透過 score-update 廣播給所有人，確保同步
    if (this.isRoomLeader() && killerTeam && this.network) {
      if (killerTeam === "A") {
        this.gameState.teamA.score += 1;
        this.network.sendMessage("score-update", {
          team: "A",
          score: this.gameState.teamA.score
        });
      } else if (killerTeam === "B") {
        this.gameState.teamB.score += 1;
        this.network.sendMessage("score-update", {
          team: "B",
          score: this.gameState.teamB.score
        });
      }
    }

    // 標記該玩家在一段時間內為「死亡中」，供其他客戶端顯示
    this.markPlayerDeath(victimId, killerId);
  }

  handleScoreUpdate(message) {
    const { team, score } = message;
    if (team === "A") {
      this.gameState.teamA.score = score;
    } else if (team === "B") {
      this.gameState.teamB.score = score;
    }
  }

  handleWeaponPickup(message) {
    if (!this.network) return;
    const { playerId, weaponType, boxName, spawnIndex } = message;

    // 所有 client：嘗試移除對應的武器箱
    let removed = false;

    // 優先用名稱移除（由 map-config 重建的武器箱名稱應一致）
    if (boxName) {
      const boxEntity = this.app.root.findByName(boxName);
      if (boxEntity && !boxEntity.destroyed) {
        boxEntity.destroy();
        removed = true;
      }
    }

    // 若名稱無法對上，再用 spawnIndex + tag 搜尋
    if (!removed && typeof spawnIndex === "number" && spawnIndex >= 0) {
      const candidates = this.app.root.findByTag("weapon-box") || [];
      candidates.forEach((ent) => {
        if (removed || !ent || ent.destroyed) return;
        const pickup = ent.script?.weaponPickup;
        if (pickup && pickup.spawnIndex === spawnIndex) {
          ent.destroy();
          removed = true;
        }
      });
    }

    if (!removed) {
      console.warn("[BattleGame] Failed to remove weapon box", {
        boxName,
        spawnIndex
      });
    }

    // 只有撿到的人更新自己的當前武器
    if (this.localPlayer && playerId === this.network.sessionId) {
      this.localPlayer.currentWeapon = weaponType;
    }
  }

  handleTeamAssignment(message) {
    if (!this.network || !this.localPlayer) return;
    const { assignments } = message;
    const team = assignments[this.network.sessionId];
    if (team) {
      this.localPlayer.team = team;
    }
  }

  onLocalPlayerDeath(killerId) {
    if (!this.network || !this.localPlayer) return;
    // 已經處於死亡狀態時，不要重複處理
    if (!this.localPlayer.isAlive) return;

    this.localPlayer.isAlive = false;
    this.localPlayer.deaths += 1;
    this.localPlayer.health = 0;

    // 設定本地玩家復活倒數秒數
    this._respawnCountdownRemaining = this.respawnTime;

    this.network.sendMessage("player-killed", {
      victimId: this.network.sessionId,
      killerId: killerId
    });

    this.showDeathScreen(killerId);

    setTimeout(() => {
      this.respawnPlayer(this.localPlayer);
    }, this.respawnTime * 1000);
  }

  onGameTimeUp() {
    this.endMatch("time_limit");
  }

  onGameEnd() {
    this.endMatch("server_game_end");
  }

  onGameRestart() {
    // 由 SDK 通知重新開始一局：重置本地狀態與戰場，等待新的倒數與進入 playing 階段
    this.resetToLobby();
  }

  respawnPlayer(player) {
    console.log("[BattleGame][DEBUG] respawnPlayer called", {
      team: player?.team,
      beforeHp: player?.health,
      maxHealth: player?.maxHealth,
      isAliveBefore: player?.isAlive
    });

    player.health = player.maxHealth;
    player.isAlive = true;

    // 若是本地玩家，復活時關閉死亡畫面與倒數
    if (player === this.localPlayer) {
      this._respawnCountdownRemaining = null;
      this.hideDeathScreen();
    }

    console.log("[BattleGame][DEBUG] respawnPlayer set HP", {
      health: player.health,
      maxHealth: player.maxHealth
    });

    const spawnPoint = this.getSpawnPoint(player.team);
    if (!spawnPoint || !player.entity) return;

    const isLocal =
      !!player.entity.script &&
      !!player.entity.script.localPlayerNetwork;

    // 避免與 VIVERSE 本身的本地移動同步打架：
    // 只對「遠端玩家」進行位置重置，本地玩家交給 VIVERSE 自己處理。
    if (!isLocal) {
      player.entity.setPosition(spawnPoint);
    }
  }

  /**
   * 標記指定玩家在一段時間內為「死亡中」，供遠端顯示使用。
   */
  markPlayerDeath(sessionId, killerId) {
    if (!sessionId || !this.network) return;

    // 本地死亡邏輯由 onLocalPlayerDeath 處理，不在這裡覆寫
    if (sessionId === this.network.sessionId) {
      return;
    }

    const now = this.app.time;
    const info = this.players.get(sessionId) || {};
    info.deathEndTime = now + this.respawnTime;
    info.lastKillerId = killerId ?? info.lastKillerId ?? null;
    this.players.set(sessionId, info);
  }

  /**
   * 依照 deathEndTime 暫時隱藏遠端「死亡中」的玩家，讓其他人看得出來他目前陣亡。
   */
  updateRemoteDeathVisuals() {
    if (!this.network || !this.network.actorEntityMap) return;

    const now = this.app.time;
    for (const [sessionId, ent] of this.network.actorEntityMap.entries()) {
      if (!ent || ent.destroyed) continue;

      // 永遠不要在本地端隱藏自己的 Avatar，交給內部系統處理
      if (sessionId === this.network.sessionId) continue;

      const info = this.players.get(sessionId);
      const isDead = info?.deathEndTime && info.deathEndTime > now;
      ent.enabled = !isDead;
    }
  }

  getSpawnPoint(team) {
    const arenaGenerator = this.entity.script?.arenaGenerator;
    const spawnPoints = arenaGenerator?.spawnPoints || {};
    const teamSpawns = spawnPoints[team] || [];

    if (teamSpawns.length > 0) {
      const index = Math.floor(Math.random() * teamSpawns.length);
      const pos = teamSpawns[index];
      return pos.clone ? pos.clone() : new pc.Vec3(pos.x, pos.y, pos.z);
    }

    return team === "A" ? new pc.Vec3(-20, 2, 0) : new pc.Vec3(20, 2, 0);
  }

  getPlayerTeam(sessionId) {
    if (this.gameState.teamA.players.includes(sessionId)) return "A";
    if (this.gameState.teamB.players.includes(sessionId)) return "B";
    return null;
  }

  isRoomLeader() {
    const room = this.network?.currentRoom;
    if (!room || !room.actors || room.actors.length === 0) return false;
    return room.actors[0].session_id === this.network.sessionId;
  }

  broadcastTeamAssignment() {
    if (!this.network) return;

    const assignments = {};
    this.gameState.teamA.players.forEach((sessionId) => {
      assignments[sessionId] = "A";
    });
    this.gameState.teamB.players.forEach((sessionId) => {
      assignments[sessionId] = "B";
    });

    this.network.sendMessage("team-assignment", { assignments });
  }

  endMatch(reason) {
    // 已經處於 finished 狀態時避免重複執行（可能來自本地與 game-end 事件）
    if (this.gameState.phase === "finished") {
      return;
    }

    this.gameState.phase = "finished";
    this._arenaGenerated = false;
    this._matchStarted = false;
    this._respawnCountdownRemaining = null;
    this.hideCountdownUI();
    this.hideGameTimeUI();
    this.hideStatusHUD();
    if (this.network && typeof this.network.hideLeaveGameButton === "function") {
      this.network.hideLeaveGameButton();
    }
    this.showMatchResults(reason);
  }

	  /**
	   * 重置戰鬥場景，回到大廳狀態（供 NetworkManager 的 Leave Game 使用）
	   */
	  resetToLobby() {
	    // 保留隊伍分配，但重置本局狀態，確保下一場遊戲不會沿用舊的比分 / 時間等資料
	    const prevTeamAPlayers = this.gameState?.teamA?.players || [];
	    const prevTeamBPlayers = this.gameState?.teamB?.players || [];

	    this.gameState = {
	      phase: "waiting",
	      teamA: { score: 0, players: prevTeamAPlayers },
	      teamB: { score: 0, players: prevTeamBPlayers },
      matchTime: 0,
      mapSeed: null
    };

    this._arenaGenerated = false;
    this._matchStarted = false;
    this._respawnCountdownRemaining = null;

    // 清除每位玩家的暫存資訊（例如死亡時間、最後擊殺者等）
    if (this.players) {
      this.players.clear();
    }

	    // 重置本地玩家的戰鬥統計（但保留 team 資訊，下一局仍在同一隊）
	    if (this.localPlayer) {
	      this.localPlayer.health = this.localPlayer.maxHealth;
	      this.localPlayer.isAlive = true;
	      this.localPlayer.kills = 0;
	      this.localPlayer.deaths = 0;
	      this.localPlayer.currentWeapon = "pistol";
	    }

    this.hideCountdownUI();
    this.hideGameTimeUI();
    this.hideStatusHUD();
    this.hideDeathScreen();
    this.hideMatchResultsOverlay();

    const arenaGenerator = this.entity.script?.arenaGenerator;
    if (arenaGenerator && typeof arenaGenerator.cleanup === "function") {
      arenaGenerator.cleanup();
    }

    // 保險起見，將所有帶有 arena 相關 tag 的動態物件清除
    const tagsToClear = ["arena", "weapon-box", "spawn-marker"];
    tagsToClear.forEach((tag) => {
      const ents = this.app.root.findByTag(tag) || [];
      ents.forEach((e) => {
        if (e && !e.destroyed) {
          e.destroy();
        }
      });
    });

    if (this.network && typeof this.network.hideLeaveGameButton === "function") {
      this.network.hideLeaveGameButton();
    }
  }

  update(dt) {
    if (this.gameState.phase === "countdown") {
      this.updateCountdown(dt);
    } else if (this.gameState.phase === "playing") {
      this.updateMatchTimer(dt);
    }
  }

  showCountdownUI(count) {
    const existing = document.getElementById("battle-countdown-message");
    const text = count > 0 ? `${count}` : "GO!";

    let el = existing;
    if (!el) {
      el = document.createElement("div");
      el.id = "battle-countdown-message";
      el.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px 40px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        font-size: 64px;
        z-index: 1002;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid #0241e2;
        text-align: center;
      `;
      document.body.appendChild(el);
    }

    el.textContent = text;
  }

  hideCountdownUI() {
    const el = document.getElementById("battle-countdown-message");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  showGameTimeUI(remainingSeconds) {
    const existing = document.getElementById("battle-game-timer");

    const total = Math.max(0, Math.floor(remainingSeconds));
    const min = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const sec = (total % 60).toString().padStart(2, "0");
    const text = `${min}:${sec}`;

    let el = existing;
    if (!el) {
      el = document.createElement("div");
      el.id = "battle-game-timer";
      el.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
        font-size: 32px;
        z-index: 1001;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid #0241e2;
        text-align: center;
      `;
      document.body.appendChild(el);
    }

    el.textContent = text;
  }

  hideGameTimeUI() {
    const el = document.getElementById("battle-game-timer");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  showStatusHUD() {
    const existing = document.getElementById("battle-status-hud");

    const hp = this.localPlayer ? Math.max(0, Math.floor(this.localPlayer.health)) : 0;
    const weapon = this.localPlayer ? this.localPlayer.currentWeapon : "none";
    const scoreA = this.gameState.teamA.score;
    const scoreB = this.gameState.teamB.score;

    const text = `HP: ${hp} | Weapon: ${weapon} | A: ${scoreA}  B: ${scoreB}`;

    let el = existing;
    if (!el) {
      el = document.createElement("div");
      el.id = "battle-status-hud";
      el.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
        font-size: 18px;
        z-index: 1001;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid #0241e2;
        text-align: center;
      `;
      document.body.appendChild(el);
    }

    el.textContent = text;
  }

  hideStatusHUD() {
    const el = document.getElementById("battle-status-hud");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  showDamageEffect() {
    // TODO: implement damage visual effect
  }

  showDeathScreen(killerId) {
    const existing = document.getElementById("battle-death-overlay");

    let el = existing;
    if (!el) {
      el = document.createElement("div");
      el.id = "battle-death-overlay";
      el.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.7);
        color: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 2000;
      `;

      const title = document.createElement("div");
      title.id = "battle-death-title";
      title.style.cssText = `
        font-size: 42px;
        font-weight: 800;
        margin-bottom: 12px;
        text-shadow: 0 0 8px rgba(0,0,0,0.8);
      `;
      el.appendChild(title);

      const sub = document.createElement("div");
      sub.id = "battle-death-sub";
      sub.style.cssText = `
        font-size: 20px;
        margin-bottom: 4px;
      `;
      el.appendChild(sub);

      const countdown = document.createElement("div");
      countdown.id = "battle-death-countdown";
      countdown.style.cssText = `
        font-size: 32px;
        font-weight: 700;
        margin-top: 8px;
      `;
      el.appendChild(countdown);

      document.body.appendChild(el);
    }

    const titleEl = document.getElementById("battle-death-title");
    const subEl = document.getElementById("battle-death-sub");

    if (titleEl) {
      titleEl.textContent = "YOU DIED";
    }
    if (subEl) {
      subEl.textContent = killerId ? `Killed by ${killerId}` : "";
    }

    // 立即更新一次倒數數字，其後由 updateDeathCountdown 持續刷新
    this.updateDeathCountdown(0);

    el.style.display = "flex";
  }

  hideDeathScreen() {
    const el = document.getElementById("battle-death-overlay");
    if (el) {
      el.style.display = "none";
    }
  }

  updateDeathCountdown(dt) {
    if (!this.localPlayer || this.localPlayer.isAlive) return;

    if (this._respawnCountdownRemaining == null) {
      return;
    }

    this._respawnCountdownRemaining = Math.max(
      0,
      this._respawnCountdownRemaining - dt
    );

    const countdownEl = document.getElementById("battle-death-countdown");
    if (countdownEl) {
      const secs = Math.ceil(this._respawnCountdownRemaining);
      countdownEl.textContent = `Respawning in ${secs}s`;
    }
  }

  /**
   * 本地玩家成功擊殺時，在畫面上顯示簡單的「KILL」提示。
   */
  showLocalKillPopup(victimId) {
    const existing = document.getElementById("battle-kill-popup");

    let el = existing;
    if (!el) {
      el = document.createElement("div");
      el.id = "battle-kill-popup";
      el.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 18px;
        border-radius: 6px;
        color: #fff;
        font-weight: 900;
        font-size: 28px;
        z-index: 2001;
        background: rgba(220, 20, 60, 0.9);
        border: 2px solid #ffffff;
        text-shadow: 0 0 8px rgba(0,0,0,0.8);
      `;
      document.body.appendChild(el);
    }

    el.textContent = "KILL!";
    if (victimId) {
      el.textContent += ` (${victimId})`;
    }

    el.style.opacity = "1";
    el.style.display = "block";

    // 幾秒後自動淡出隱藏
    setTimeout(() => {
      const node = document.getElementById("battle-kill-popup");
      if (node) {
        node.style.display = "none";
      }
    }, 1200);
  }

  showMatchResults(reason) {
    console.log("Match ended:", reason, this.gameState);

    const existing = document.getElementById("battle-result-overlay");

    let el = existing;
    if (!el) {
      el = document.createElement("div");
      el.id = "battle-result-overlay";
      el.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 2100;
      `;

      const title = document.createElement("div");
      title.id = "battle-result-title";
      title.style.cssText = `
        font-size: 40px;
        font-weight: 800;
        margin-bottom: 8px;
        text-shadow: 0 0 10px rgba(0,0,0,0.9);
      `;
      el.appendChild(title);

      const sub = document.createElement("div");
      sub.id = "battle-result-sub";
      sub.style.cssText = `
        font-size: 22px;
        margin-bottom: 12px;
      `;
      el.appendChild(sub);

      const score = document.createElement("div");
      score.id = "battle-result-score";
      score.style.cssText = `
        font-size: 20px;
        margin-bottom: 24px;
      `;
      el.appendChild(score);

      const btnRow = document.createElement("div");
      btnRow.style.cssText = `
        display: flex;
        gap: 16px;
      `;

      const btnLobby = document.createElement("button");
      btnLobby.id = "battle-result-btn-lobby";
      btnLobby.textContent = "Back to Lobby";
      btnLobby.style.cssText = `
        padding: 10px 20px;
        font-size: 18px;
        font-weight: 700;
        border-radius: 6px;
        border: 2px solid #ffffff;
        background: #0241e2;
        color: #ffffff;
        cursor: pointer;
      `;

      const btnReplay = document.createElement("button");
      btnReplay.id = "battle-result-btn-replay";
      btnReplay.textContent = "Play Again";
      btnReplay.style.cssText = `
        padding: 10px 20px;
        font-size: 18px;
        font-weight: 700;
        border-radius: 6px;
        border: 2px solid #ffffff;
        background: #00a86b;
        color: #ffffff;
        cursor: pointer;
      `;

      btnRow.appendChild(btnLobby);
      btnRow.appendChild(btnReplay);
      el.appendChild(btnRow);

      document.body.appendChild(el);

      const self = this;
      btnLobby.onclick = () => {
        self.onClickResultBackToLobby();
      };
      btnReplay.onclick = () => {
        self.onClickResultPlayAgain();
      };
    }

    const titleEl = document.getElementById("battle-result-title");
    const subEl = document.getElementById("battle-result-sub");
    const scoreEl = document.getElementById("battle-result-score");

    const aScore = this.gameState.teamA.score;
    const bScore = this.gameState.teamB.score;
    const localTeam = this.localPlayer?.team ?? null;

    let winTeam = null;
    if (reason === "team_a_win") winTeam = "A";
    if (reason === "team_b_win") winTeam = "B";

    const isDraw = !winTeam || aScore === bScore;
    const isLocalWin =
      !!localTeam && !!winTeam && localTeam === winTeam && !isDraw;

    if (titleEl) {
      if (isDraw) {
        titleEl.textContent = "DRAW";
      } else {
        titleEl.textContent = `TEAM ${winTeam} WINS`;
      }
    }

    if (subEl) {
      if (!localTeam) {
        subEl.textContent = "";
      } else if (isDraw) {
        subEl.textContent = "Game ended in a draw.";
      } else if (isLocalWin) {
        subEl.textContent = "You Win!";
      } else {
        subEl.textContent = "You Lose.";
      }
    }

    if (scoreEl) {
      scoreEl.textContent = `Score  A: ${aScore}  B: ${bScore}`;
    }

    el.style.display = "flex";
  }

  hideMatchResultsOverlay() {
    const el = document.getElementById("battle-result-overlay");
    if (el) {
      el.style.display = "none";
    }
  }

  onClickResultBackToLobby() {
    this.hideMatchResultsOverlay();
    if (!this.network) return;

    // 清除戰場並回到 Lobby 頻道
    this.resetToLobby();

    (async () => {
      try {
        await this.network.enterLobby();
      } catch (e) {
        console.error("[BattleGame] Failed to enter lobby from result screen", e);
      }
    })();
  }

  onClickResultPlayAgain() {
    this.hideMatchResultsOverlay();
    if (!this.network) return;

    // 由 Host 透過 SDK 的 gameRestart() 重新啟動一局；
    // 所有玩家會收到 game-restart / countdown 事件並在 onGameRestart 中 resetToLobby。
    if (
      this.isRoomLeader() &&
      this.network.multiplayer?.currentClient?.game?.gameRestart
    ) {
      (async () => {
        try {
          await this.network.multiplayer.currentClient.game.gameRestart();
        } catch (e) {
          console.error("[BattleGame] Failed to call gameRestart from result screen", e);
        }
      })();
    }
  }

  createShootEffect(position, direction, weaponType) {
    if (!position || !direction) return;

    const len = 8;
    const start = new pc.Vec3(position.x, position.y, position.z);
    const dir = new pc.Vec3(direction.x, direction.y, direction.z).normalize();
    const end = start.clone().add(dir.clone().mulScalar(len));
    const mid = start.clone().add(end).mulScalar(0.5);

    const beam = new pc.Entity("bullet-trace");
    beam.addComponent("render", {
      type: "box"
    });

    const dist = start.distance(end);
    beam.setLocalScale(0.1, 0.1, dist);

    // 讓光束朝向射擊方向
    beam.setPosition(mid);
    beam.lookAt(end);

    const material = new pc.StandardMaterial();
    material.emissive = weaponType === "sniper"
      ? new pc.Color(0, 1, 1)
      : weaponType === "rocket"
      ? new pc.Color(1, 0.5, 0)
      : new pc.Color(1, 1, 0);
    material.update();
    beam.render.material = material;

    this.app.root.addChild(beam);

    // 極短暫的視覺效果
    setTimeout(() => {
      if (!beam.destroyed) {
        beam.destroy();
      }
    }, 100);
  }
}
