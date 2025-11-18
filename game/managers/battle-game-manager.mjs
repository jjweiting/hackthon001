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
  targetScore = 50;

  /**
   * @attribute
   * @title Respawn Time (seconds)
   * @type {number}
   */
  respawnTime = 5;

  initialize() {
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

    this.players = new Map();
    this.localPlayer = null;

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
    this.network.off("receive-message", this.onNetworkMessage, this);
  }

  initializeLocalPlayer(playerEntity) {
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

      // 當倒數「第一次」進入 0（GO! 瞬間）且自己是房主時：
      // 產生障礙物 / 武器箱，並將 mapConfig 廣播給所有人。
      if (currentInt === 0 && this.isRoomLeader()) {
        this.generateAndBroadcastDynamicArena();
      }
    }
  }

  onCountdownEnd(data) {
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
    this.startMatch();
  }

  startMatch() {
    this.gameState.phase = "playing";
    this.gameState.matchTime = 0;

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

    if (this.gameState.matchTime >= this.matchDuration) {
      this.endMatch("time_limit");
    }

    if (this.gameState.teamA.score >= this.targetScore) {
      this.endMatch("team_a_win");
    } else if (this.gameState.teamB.score >= this.targetScore) {
      this.endMatch("team_b_win");
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

    if (targetId === this.network.sessionId) {
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

    if (this.network && this.localPlayer && killerId === this.network.sessionId) {
      this.localPlayer.kills += 1;
    }

    const killerTeam = this.getPlayerTeam(killerId);
    if (killerTeam === "A") {
      this.gameState.teamA.score += 1;
    } else if (killerTeam === "B") {
      this.gameState.teamB.score += 1;
    }
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

    this.localPlayer.isAlive = false;
    this.localPlayer.deaths += 1;
    this.localPlayer.health = 0;

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

  respawnPlayer(player) {
    player.health = player.maxHealth;
    player.isAlive = true;

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
    this.gameState.phase = "finished";
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
    this.gameState.phase = "waiting";
    this.hideCountdownUI();
    this.hideGameTimeUI();
    this.hideStatusHUD();

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
    // TODO: implement death UI
    console.log("You were killed by", killerId);
  }

  showMatchResults(reason) {
    // TODO: implement match result UI
    console.log("Match ended:", reason, this.gameState);
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
