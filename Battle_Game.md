# Battle Arena Game - 完整開發文件

## 遊戲概述

**Battle Arena** 是一款多人射擊競技場遊戲，玩家在程式化生成的競技場中進行團隊對戰。遊戲充分利用 VIVERSE SDK 的 Matchmaking 和 Multiplayer 功能，所有場景元素都通過程式動態創建。

### 核心特色

- ✅ **2v2 或 4v4 團隊對戰**
- ✅ **動態生成的競技場佈局**（每場比賽地圖不同）
- ✅ **多種武器系統**（霰彈槍、步槍、狙擊槍、火箭筒）
- ✅ **即時同步戰鬥**（射擊、傷害、擊殺）
- ✅ **計分與排行榜系統**
- ✅ **完全程式化創建**（無需手動放置物件）

---

## 遊戲流程

```
玩家進入大廳
    ↓
選擇遊戲模式 (2v2 / 4v4)
    ↓
Matchmaking 配對
    ↓
進入房間等待區
    ↓
自動分配隊伍 (Team A / Team B)
    ↓
倒數開始
    ↓
競技場生成 (使用 seed 確保一致性)
    ↓
遊戲進行 (10 分鐘或先達到目標分數)
    ↓
顯示結果與統計
    ↓
返回大廳
```

---

## 技術架構

### 專案結構

```
game/
├── managers/
│   ├── battle-game-manager.mjs      # 戰鬥遊戲主管理器
│   └── battle-state-manager.mjs     # 遊戲狀態管理
├── scripts/
│   ├── battle-arena/
│   │   ├── arena-generator.mjs      # 競技場生成器
│   │   ├── weapon-system.mjs        # 武器系統
│   │   ├── player-combat.mjs        # 玩家戰鬥邏輯
│   │   ├── health-system.mjs        # 生命值系統
│   │   ├── spawn-manager.mjs        # 重生管理器
│   │   ├── scoreboard.mjs           # 計分板
│   │   └── weapon-pickup.mjs        # 武器拾取
│   └── ui/
│       ├── battle-hud.mjs           # 戰鬥 HUD
│       ├── team-select-ui.mjs       # 隊伍選擇 UI
│       └── match-results-ui.mjs     # 比賽結果 UI
└── factories/
    ├── obstacle-factory.mjs         # 障礙物工廠
    ├── weapon-factory.mjs           # 武器工廠
    └── projectile-factory.mjs       # 發射物工廠
```

---

## 核心系統實作

## 1. Battle Game Manager

管理整個戰鬥遊戲的生命週期，整合 Network Manager。

```javascript
// game/managers/battle-game-manager.mjs
import { Script } from "playcanvas";
import { ViverseApp } from "@viverse/core";

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
  matchDuration = 600; // 10 分鐘

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
    this.gameManager = this.app.root.findByTag("game-manager")[0].script.gameManager;
    this.network = this.gameManager.network;
    
    // 遊戲狀態
    this.gameState = {
      phase: 'waiting', // 'waiting', 'countdown', 'playing', 'finished'
      teamA: { score: 0, players: [] },
      teamB: { score: 0, players: [] },
      matchTime: 0,
      mapSeed: null
    };

    // 玩家資料
    this.players = new Map(); // sessionId -> playerData
    this.localPlayer = null;

    // 設置網路事件監聽
    this.setupNetworkEvents();
    
    // 當玩家準備好時初始化
    const playerEntity = this.viverseApp.systems.localPlayer?.playerEntity;
    if (playerEntity) {
      this.initializeLocalPlayer(playerEntity);
    } else {
      this.viverseApp.once("player:ready", this.initializeLocalPlayer, this);
    }
  }

  initializeLocalPlayer(playerEntity) {
    this.localPlayer = {
      entity: playerEntity,
      sessionId: this.network.sessionId,
      team: null,
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      currentWeapon: 'pistol',
      isAlive: true
    };

    // 添加戰鬥腳本到玩家實體
    playerEntity.script.create('playerCombat', {
      attributes: {
        battleManager: this
      }
    });

    playerEntity.script.create('healthSystem', {
      attributes: {
        maxHealth: 100
      }
    });
  }

  setupNetworkEvents() {
    // 監聽房間相關事件
    this.network.on('room-actor-changed', this.onRoomActorChanged, this);
    this.network.on('game-start', this.onGameStart, this);
    
    // 監聽戰鬥事件
    this.network.on('receive-message', this.onNetworkMessage, this);
  }

  onRoomActorChanged(actors) {
    console.log('🎮 Room actors changed:', actors);
    
    // 分配隊伍
    this.assignTeams(actors);
  }

  assignTeams(actors) {
    const maxPlayersPerTeam = this.gameMode === '2v2' ? 2 : 4;
    
    this.gameState.teamA.players = [];
    this.gameState.teamB.players = [];

    actors.forEach((actor, index) => {
      const team = index % 2 === 0 ? 'A' : 'B';
      
      if (team === 'A' && this.gameState.teamA.players.length < maxPlayersPerTeam) {
        this.gameState.teamA.players.push(actor.session_id);
      } else if (team === 'B' && this.gameState.teamB.players.length < maxPlayersPerTeam) {
        this.gameState.teamB.players.push(actor.session_id);
      }

      // 設置本地玩家的隊伍
      if (actor.session_id === this.network.sessionId) {
        this.localPlayer.team = team;
        console.log(`🎮 Local player assigned to Team ${team}`);
      }
    });

    // 同步隊伍分配
    if (this.isRoomLeader()) {
      this.broadcastTeamAssignment();
    }
  }

  onGameStart() {
    console.log('🎮 Game starting!');
    this.startCountdown();
  }

  startCountdown() {
    this.gameState.phase = 'countdown';
    this.gameState.mapSeed = Date.now();
    
    // 生成競技場
    this.generateArena(this.gameState.mapSeed);
    
    // 顯示倒數計時
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      console.log(`Game starts in ${countdown}...`);
      this.showCountdownUI(countdown);
      
      countdown--;
      if (countdown < 0) {
        clearInterval(countdownInterval);
        this.startMatch();
      }
    }, 1000);
  }

  startMatch() {
    this.gameState.phase = 'playing';
    this.gameState.matchTime = 0;
    
    console.log('🎮 Match started!');
    
    // 傳送玩家到重生點
    this.respawnPlayer(this.localPlayer);
    
    // 啟動計時器
    this.startMatchTimer();
  }

  startMatchTimer() {
    this.on('update', (dt) => {
      if (this.gameState.phase !== 'playing') return;
      
      this.gameState.matchTime += dt;
      
      // 檢查是否達到時間限制
      if (this.gameState.matchTime >= this.matchDuration) {
        this.endMatch('time_limit');
      }
      
      // 檢查是否達到分數目標
      if (this.gameState.teamA.score >= this.targetScore) {
        this.endMatch('team_a_win');
      } else if (this.gameState.teamB.score >= this.targetScore) {
        this.endMatch('team_b_win');
      }
    });
  }

  generateArena(seed) {
    // 創建或獲取 ArenaGenerator
    let arenaGenerator = this.entity.script.arenaGenerator;
    if (!arenaGenerator) {
      this.entity.script.create('arenaGenerator', {
        attributes: {
          seed: seed,
          battleManager: this
        }
      });
    } else {
      arenaGenerator.regenerate(seed);
    }
  }

  onNetworkMessage(message) {
    const { type, player } = message;

    switch (type) {
      case 'player-shoot':
        this.handlePlayerShoot(message);
        break;
      case 'player-hit':
        this.handlePlayerHit(message);
        break;
      case 'player-killed':
        this.handlePlayerKilled(message);
        break;
      case 'score-update':
        this.handleScoreUpdate(message);
        break;
      case 'weapon-pickup':
        this.handleWeaponPickup(message);
        break;
      case 'team-assignment':
        this.handleTeamAssignment(message);
        break;
    }
  }

  handlePlayerShoot(message) {
    const { playerId, direction, weaponType, position } = message;
    
    // 如果不是本地玩家，顯示射擊效果
    if (playerId !== this.network.sessionId) {
      this.createShootEffect(position, direction, weaponType);
    }
  }

  handlePlayerHit(message) {
    const { targetId, damage, shooterId } = message;
    
    // 如果是本地玩家被擊中
    if (targetId === this.network.sessionId) {
      this.localPlayer.health -= damage;
      this.showDamageEffect();
      
      if (this.localPlayer.health <= 0) {
        this.onLocalPlayerDeath(shooterId);
      }
    }
  }

  handlePlayerKilled(message) {
    const { victimId, killerId } = message;
    
    console.log(`💀 Player ${victimId} killed by ${killerId}`);
    
    // 更新擊殺者的分數
    if (killerId === this.network.sessionId) {
      this.localPlayer.kills++;
    }
    
    // 更新隊伍分數
    const killerTeam = this.getPlayerTeam(killerId);
    if (killerTeam === 'A') {
      this.gameState.teamA.score++;
    } else if (killerTeam === 'B') {
      this.gameState.teamB.score++;
    }
  }

  handleScoreUpdate(message) {
    const { team, score } = message;
    
    if (team === 'A') {
      this.gameState.teamA.score = score;
    } else if (team === 'B') {
      this.gameState.teamB.score = score;
    }
  }

  handleWeaponPickup(message) {
    const { playerId, weaponType } = message;
    
    if (playerId === this.network.sessionId) {
      this.localPlayer.currentWeapon = weaponType;
    }
  }

  handleTeamAssignment(message) {
    const { assignments } = message;
    
    Object.keys(assignments).forEach(sessionId => {
      const team = assignments[sessionId];
      if (sessionId === this.network.sessionId) {
        this.localPlayer.team = team;
      }
    });
  }

  onLocalPlayerDeath(killerId) {
    this.localPlayer.isAlive = false;
    this.localPlayer.deaths++;
    this.localPlayer.health = 0;
    
    // 廣播死亡事件
    this.network.multiplayer.sendMessage(this.localPlayer, {
      type: 'player-killed',
      victimId: this.network.sessionId,
      killerId: killerId
    });
    
    // 顯示死亡畫面
    this.showDeathScreen(killerId);
    
    // 安排重生
    setTimeout(() => {
      this.respawnPlayer(this.localPlayer);
    }, this.respawnTime * 1000);
  }

  respawnPlayer(player) {
    player.health = player.maxHealth;
    player.isAlive = true;
    player.currentWeapon = 'pistol';
    
    // 獲取重生點
    const spawnPoint = this.getSpawnPoint(player.team);
    player.entity.setPosition(spawnPoint);
    
    console.log(`♻️ Player respawned at Team ${player.team} spawn`);
  }

  getSpawnPoint(team) {
    const spawnPoints = this.entity.script.arenaGenerator?.spawnPoints || {};
    const teamSpawns = spawnPoints[team] || [];
    
    if (teamSpawns.length > 0) {
      // 隨機選擇一個重生點
      const index = Math.floor(Math.random() * teamSpawns.length);
      return teamSpawns[index].clone();
    }
    
    // 預設重生點
    return team === 'A' 
      ? new pc.Vec3(-20, 2, 0) 
      : new pc.Vec3(20, 2, 0);
  }

  getPlayerTeam(sessionId) {
    if (this.gameState.teamA.players.includes(sessionId)) return 'A';
    if (this.gameState.teamB.players.includes(sessionId)) return 'B';
    return null;
  }

  isRoomLeader() {
    const room = this.network.currentRoom;
    if (!room || !room.actors || room.actors.length === 0) return false;
    return room.actors[0].session_id === this.network.sessionId;
  }

  broadcastTeamAssignment() {
    const assignments = {};
    
    this.gameState.teamA.players.forEach(sessionId => {
      assignments[sessionId] = 'A';
    });
    
    this.gameState.teamB.players.forEach(sessionId => {
      assignments[sessionId] = 'B';
    });
    
    this.network.multiplayer.sendMessage(this.localPlayer, {
      type: 'team-assignment',
      assignments: assignments
    });
  }

  endMatch(reason) {
    this.gameState.phase = 'finished';
    
    console.log(`🏁 Match ended: ${reason}`);
    
    // 顯示結果
    this.showMatchResults(reason);
  }

  showCountdownUI(count) {
    // TODO: 實作倒數 UI
    console.log(`⏱️ ${count}`);
  }

  showDamageEffect() {
    // TODO: 實作受傷視覺效果（紅邊框閃爍等）
  }

  showDeathScreen(killerId) {
    // TODO: 實作死亡畫面
    console.log(`💀 You were killed by ${killerId}`);
  }

  showMatchResults(reason) {
    // TODO: 實作比賽結果 UI
    console.log('📊 Match Results:', this.gameState);
  }

  createShootEffect(position, direction, weaponType) {
    // TODO: 實作射擊特效
  }
}
```

---

## 2. Arena Generator

程式化生成競技場，包含地板、牆壁、障礙物、重生點和武器箱。

```javascript
// game/scripts/battle-arena/arena-generator.mjs
import * as pc from 'playcanvas';
import { Script } from 'playcanvas';

export class ArenaGenerator extends Script {
  static scriptName = "arenaGenerator";

  /**
   * @attribute
   * @title Arena Size
   * @type {number}
   */
  arenaSize = 50;

  /**
   * @attribute
   * @title Obstacle Count
   * @type {number}
   */
  obstacleCount = 20;

  /**
   * @attribute
   * @title Weapon Box Count
   * @type {number}
   */
  weaponBoxCount = 8;

  initialize() {
    this.generatedEntities = [];
    this.spawnPoints = { A: [], B: [] };
    this.weaponSpawnPoints = [];
  }

  regenerate(seed) {
    // 清除舊的競技場
    this.clearArena();
    
    // 生成新的競技場
    this.generate(seed);
  }

  generate(seed) {
    const rng = new SeededRandom(seed);
    
    console.log('🏗️ Generating arena with seed:', seed);
    
    // 1. 創建地板
    this.createFloor();
    
    // 2. 創建邊界牆
    this.createWalls();
    
    // 3. 創建障礙物
    this.createObstacles(rng);
    
    // 4. 創建重生點
    this.createSpawnPoints();
    
    // 5. 創建武器箱生成點
    this.createWeaponBoxSpawns(rng);
    
    // 6. 啟動武器箱生成循環
    this.startWeaponBoxSpawning();
    
    console.log('✅ Arena generated successfully');
  }

  createFloor() {
    const floor = new pc.Entity('arena-floor');
    floor.addComponent('render', {
      type: 'box',
      castShadows: false,
      receiveShadows: true
    });
    floor.setLocalScale(this.arenaSize, 1, this.arenaSize);
    floor.setPosition(0, 0, 0);
    
    // 添加物理
    floor.addComponent('collision', {
      type: 'box',
      halfExtents: new pc.Vec3(this.arenaSize / 2, 0.5, this.arenaSize / 2)
    });
    floor.addComponent('rigidbody', {
      type: 'static',
      friction: 0.5,
      restitution: 0
    });
    
    // 材質
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.3, 0.3, 0.35);
    material.update();
    floor.render.material = material;
    
    floor.tags.add('dynamic', 'arena');
    this.app.root.addChild(floor);
    this.generatedEntities.push(floor);
  }

  createWalls() {
    const wallHeight = 5;
    const wallThickness = 1;
    const halfSize = this.arenaSize / 2;
    
    const wallConfigs = [
      { name: 'north', pos: [0, wallHeight / 2, halfSize], scale: [this.arenaSize, wallHeight, wallThickness] },
      { name: 'south', pos: [0, wallHeight / 2, -halfSize], scale: [this.arenaSize, wallHeight, wallThickness] },
      { name: 'east', pos: [halfSize, wallHeight / 2, 0], scale: [wallThickness, wallHeight, this.arenaSize] },
      { name: 'west', pos: [-halfSize, wallHeight / 2, 0], scale: [wallThickness, wallHeight, this.arenaSize] }
    ];
    
    wallConfigs.forEach(config => {
      const wall = new pc.Entity(`wall-${config.name}`);
      wall.addComponent('render', {
        type: 'box',
        castShadows: true
      });
      wall.setLocalScale(...config.scale);
      wall.setPosition(...config.pos);
      
      wall.addComponent('collision', {
        type: 'box',
        halfExtents: new pc.Vec3(config.scale[0] / 2, config.scale[1] / 2, config.scale[2] / 2)
      });
      wall.addComponent('rigidbody', {
        type: 'static'
      });
      
      // 材質
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.5, 0.5, 0.5);
      material.update();
      wall.render.material = material;
      
      wall.tags.add('dynamic', 'arena', 'wall');
      this.app.root.addChild(wall);
      this.generatedEntities.push(wall);
    });
  }

  createObstacles(rng) {
    const obstacleTypes = ['box', 'tall-box', 'wall', 'cylinder'];
    const halfSize = this.arenaSize / 2 - 5; // 留邊界
    
    for (let i = 0; i < this.obstacleCount; i++) {
      const type = obstacleTypes[Math.floor(rng.random() * obstacleTypes.length)];
      const obstacle = new pc.Entity(`obstacle-${type}-${i}`);
      
      obstacle.addComponent('render', {
        type: type === 'cylinder' ? 'cylinder' : 'box',
        castShadows: true
      });
      
      // 根據類型設置尺寸
      let scale, height;
      switch(type) {
        case 'box':
          scale = [2, 2, 2];
          height = 2;
          break;
        case 'tall-box':
          scale = [2, 5, 2];
          height = 5;
          break;
        case 'wall':
          scale = [4, 3, 1];
          height = 3;
          break;
        case 'cylinder':
          scale = [1.5, 4, 1.5];
          height = 4;
          break;
      }
      
      obstacle.setLocalScale(...scale);
      
      // 隨機位置（避免中心區域）
      let x, z;
      do {
        x = (rng.random() - 0.5) * halfSize * 2;
        z = (rng.random() - 0.5) * halfSize * 2;
      } while (Math.abs(x) < 10 && Math.abs(z) < 10); // 避免太靠近中心
      
      obstacle.setPosition(x, height / 2, z);
      obstacle.setRotation(new pc.Quat().setFromEulerAngles(0, rng.random() * 360, 0));
      
      // 物理
      obstacle.addComponent('collision', {
        type: type === 'cylinder' ? 'cylinder' : 'box',
        halfExtents: new pc.Vec3(scale[0] / 2, scale[1] / 2, scale[2] / 2)
      });
      obstacle.addComponent('rigidbody', {
        type: 'static'
      });
      
      // 隨機顏色
      const material = new pc.StandardMaterial();
      const colorOptions = [
        new pc.Color(0.6, 0.4, 0.3),
        new pc.Color(0.4, 0.4, 0.5),
        new pc.Color(0.5, 0.5, 0.4)
      ];
      material.diffuse = colorOptions[Math.floor(rng.random() * colorOptions.length)];
      material.update();
      obstacle.render.material = material;
      
      obstacle.tags.add('dynamic', 'arena', 'obstacle');
      this.app.root.addChild(obstacle);
      this.generatedEntities.push(obstacle);
    }
  }

  createSpawnPoints() {
    const spawnHeight = 2;
    const spacing = 3;
    
    // Team A 重生點（左側）
    for (let i = 0; i < 4; i++) {
      const x = -20;
      const z = (i - 1.5) * spacing;
      this.spawnPoints.A.push(new pc.Vec3(x, spawnHeight, z));
      
      // 可視化重生點（開發用）
      this.createSpawnMarker('A', i, x, z);
    }
    
    // Team B 重生點（右側）
    for (let i = 0; i < 4; i++) {
      const x = 20;
      const z = (i - 1.5) * spacing;
      this.spawnPoints.B.push(new pc.Vec3(x, spawnHeight, z));
      
      // 可視化重生點（開發用）
      this.createSpawnMarker('B', i, x, z);
    }
  }

  createSpawnMarker(team, index, x, z) {
    const marker = new pc.Entity(`spawn-${team}-${index}`);
    marker.addComponent('render', {
      type: 'cylinder',
      castShadows: false
    });
    marker.setLocalScale(1, 0.1, 1);
    marker.setPosition(x, 0.6, z);
    
    const material = new pc.StandardMaterial();
    material.diffuse = team === 'A' ? new pc.Color(0, 0.5, 1) : new pc.Color(1, 0.5, 0);
    material.emissive = material.diffuse;
    material.update();
    marker.render.material = material;
    
    marker.tags.add('dynamic', 'arena', 'spawn-marker');
    this.app.root.addChild(marker);
    this.generatedEntities.push(marker);
  }

  createWeaponBoxSpawns(rng) {
    const halfSize = this.arenaSize / 2 - 5;
    
    for (let i = 0; i < this.weaponBoxCount; i++) {
      // 隨機位置
      const x = (rng.random() - 0.5) * halfSize * 2;
      const z = (rng.random() - 0.5) * halfSize * 2;
      
      this.weaponSpawnPoints.push({
        position: new pc.Vec3(x, 1, z),
        occupied: false,
        entity: null
      });
    }
  }

  startWeaponBoxSpawning() {
    // 初始生成一些武器箱
    this.weaponSpawnPoints.forEach((spawn, index) => {
      if (Math.random() > 0.5) {
        this.spawnWeaponBox(index);
      }
    });
    
    // 定期檢查並生成新的武器箱
    this.on('update', this.updateWeaponSpawning, this);
  }

  updateWeaponSpawning(dt) {
    // 每 10 秒檢查一次
    if (!this.lastSpawnCheck) this.lastSpawnCheck = 0;
    this.lastSpawnCheck += dt;
    
    if (this.lastSpawnCheck >= 10) {
      this.lastSpawnCheck = 0;
      
      this.weaponSpawnPoints.forEach((spawn, index) => {
        if (!spawn.occupied && Math.random() > 0.6) {
          this.spawnWeaponBox(index);
        }
      });
    }
  }

  spawnWeaponBox(spawnIndex) {
    const spawn = this.weaponSpawnPoints[spawnIndex];
    if (spawn.occupied) return;
    
    const weaponBox = new pc.Entity(`weapon-box-${spawnIndex}`);
    weaponBox.addComponent('render', {
      type: 'box',
      castShadows: true
    });
    weaponBox.setLocalScale(1, 1, 1);
    weaponBox.setPosition(spawn.position);
    
    // 物理
    weaponBox.addComponent('collision', {
      type: 'box',
      halfExtents: new pc.Vec3(0.5, 0.5, 0.5)
    });
    weaponBox.addComponent('rigidbody', {
      type: 'static'
    });
    
    // 發光材質
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(1, 0.8, 0);
    material.emissive = new pc.Color(0.5, 0.4, 0);
    material.update();
    weaponBox.render.material = material;
    
    // 添加拾取腳本
    weaponBox.addComponent('script');
    weaponBox.script.create('weaponPickup', {
      attributes: {
        spawnIndex: spawnIndex,
        arenaGenerator: this
      }
    });
    
    // 旋轉動畫
    weaponBox.addComponent('script');
    weaponBox.script.create('rotateObject', {
      attributes: {
        speed: 50
      }
    });
    
    weaponBox.tags.add('dynamic', 'arena', 'weapon-box');
    this.app.root.addChild(weaponBox);
    this.generatedEntities.push(weaponBox);
    
    spawn.occupied = true;
    spawn.entity = weaponBox;
  }

  onWeaponBoxPickedUp(spawnIndex) {
    const spawn = this.weaponSpawnPoints[spawnIndex];
    spawn.occupied = false;
    spawn.entity = null;
  }

  clearArena() {
    this.generatedEntities.forEach(entity => {
      if (entity && entity.destroy) {
        entity.destroy();
      }
    });
    
    this.generatedEntities = [];
    this.spawnPoints = { A: [], B: [] };
    this.weaponSpawnPoints = [];
  }
}

// 簡單的旋轉腳本
export class RotateObject extends Script {
  static scriptName = "rotateObject";
  
  /**
   * @attribute
   * @title Rotation Speed
   * @type {number}
   */
  speed = 30;
  
  update(dt) {
    this.entity.rotate(0, this.speed * dt, 0);
  }
}

// 種子隨機數生成器（確保所有客戶端生成相同地圖）
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}
```

---

## 3. Player Combat System

處理玩家的射擊、瞄準、武器切換等戰鬥邏輯。

```javascript
// game/scripts/battle-arena/player-combat.mjs
import * as pc from 'playcanvas';
import { Script } from 'playcanvas';

export class PlayerCombat extends Script {
  static scriptName = "playerCombat";

  initialize() {
    this.battleManager = this.app.root.findByTag("battle-manager")[0]?.script.battleGameManager;
    
    if (!this.battleManager) {
      console.error('❌ BattleGameManager not found!');
      return;
    }
    
    // 武器配置
    this.weapons = {
      pistol: { damage: 15, fireRate: 0.5, range: 50, ammo: Infinity },
      shotgun: { damage: 30, fireRate: 1.0, range: 15, ammo: 8, spread: 15 },
      rifle: { damage: 20, fireRate: 0.2, range: 100, ammo: 30 },
      sniper: { damage: 80, fireRate: 1.5, range: 200, ammo: 5 },
      rocket: { damage: 100, fireRate: 2.0, range: 150, ammo: 3, splash: true }
    };
    
    this.currentWeapon = 'pistol';
    this.currentAmmo = Infinity;
    this.lastFireTime = 0;
    this.isAiming = false;
    
    // 設置輸入監聽
    this.setupInput();
    
    // 創建準星
    this.createCrosshair();
  }

  setupInput() {
    // 滑鼠射擊
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, (event) => {
      if (event.button === pc.MOUSEBUTTON_LEFT) {
        this.shoot();
      } else if (event.button === pc.MOUSEBUTTON_RIGHT) {
        this.isAiming = true;
      }
    });
    
    this.app.mouse.on(pc.EVENT_MOUSEUP, (event) => {
      if (event.button === pc.MOUSEBUTTON_RIGHT) {
        this.isAiming = false;
      }
    });
    
    // 鍵盤切換武器
    this.app.keyboard.on(pc.EVENT_KEYDOWN, (event) => {
      if (event.key === pc.KEY_1) this.switchWeapon('pistol');
      if (event.key === pc.KEY_2) this.switchWeapon('shotgun');
      if (event.key === pc.KEY_3) this.switchWeapon('rifle');
      if (event.key === pc.KEY_4) this.switchWeapon('sniper');
      if (event.key === pc.KEY_5) this.switchWeapon('rocket');
      
      // 重新裝填
      if (event.key === pc.KEY_R) this.reload();
    });
  }

  shoot() {
    // 檢查是否可以射擊
    if (!this.canShoot()) return;
    
    const weapon = this.weapons[this.currentWeapon];
    const now = Date.now() / 1000;
    
    // 檢查射速
    if (now - this.lastFireTime < weapon.fireRate) return;
    
    // 檢查彈藥
    if (this.currentAmmo <= 0) {
      console.log('🔫 Out of ammo! Press R to reload');
      return;
    }
    
    this.lastFireTime = now;
    this.currentAmmo--;
    
    // 執行射擊
    this.performShoot(weapon);
    
    // 廣播射擊事件
    this.broadcastShoot();
  }

  performShoot(weapon) {
    const camera = this.entity.camera || this.entity.findByName('Camera')?.camera;
    if (!camera) return;
    
    const cameraEntity = camera.entity;
    const from = cameraEntity.getPosition();
    const forward = cameraEntity.forward;
    
    // 射線檢測
    if (weapon.spread) {
      // 霰彈槍：多發射線
      for (let i = 0; i < 8; i++) {
        const spreadAngle = (Math.random() - 0.5) * weapon.spread;
        const spreadDir = this.applySpread(forward, spreadAngle);
        this.castRay(from, spreadDir, weapon);
      }
    } else {
      // 單發射線
      this.castRay(from, forward, weapon);
    }
    
    // 播放射擊音效和特效
    this.playShootEffect();
  }

  castRay(from, direction, weapon) {
    const to = from.clone().add(direction.clone().mulScalar(weapon.range));
    const result = this.app.systems.rigidbody.raycastFirst(from, to);
    
    if (result) {
      const hitEntity = result.entity;
      
      // 檢查是否擊中玩家
      if (hitEntity.tags.has('player')) {
        const targetPlayer = this.getPlayerFromEntity(hitEntity);
        if (targetPlayer && targetPlayer.team !== this.battleManager.localPlayer.team) {
          // 擊中敵人
          this.onHitPlayer(targetPlayer, weapon.damage, result.point);
        }
      }
      
      // 創建彈孔效果
      this.createBulletHole(result.point, result.normal);
    }
  }

  onHitPlayer(targetPlayer, damage, hitPosition) {
    console.log(`🎯 Hit player ${targetPlayer.sessionId} for ${damage} damage`);
    
    // 廣播傷害事件
    this.battleManager.network.multiplayer.sendMessage(this.battleManager.localPlayer, {
      type: 'player-hit',
      targetId: targetPlayer.sessionId,
      shooterId: this.battleManager.network.sessionId,
      damage: damage,
      hitPosition: [hitPosition.x, hitPosition.y, hitPosition.z]
    });
  }

  broadcastShoot() {
    const camera = this.entity.camera || this.entity.findByName('Camera')?.camera;
    const cameraEntity = camera?.entity;
    
    if (!cameraEntity) return;
    
    this.battleManager.network.multiplayer.sendMessage(this.battleManager.localPlayer, {
      type: 'player-shoot',
      playerId: this.battleManager.network.sessionId,
      weaponType: this.currentWeapon,
      position: this.entity.getPosition().data,
      direction: cameraEntity.forward.data
    });
  }

  applySpread(direction, angle) {
    // 簡單的散射實作
    const quat = new pc.Quat().setFromEulerAngles(0, angle, 0);
    const mat = new pc.Mat4().setFromQuat(quat);
    const spreadDir = mat.transformVector(direction.clone());
    return spreadDir;
  }

  switchWeapon(weaponName) {
    if (!this.weapons[weaponName]) return;
    
    this.currentWeapon = weaponName;
    this.currentAmmo = this.weapons[weaponName].ammo;
    
    console.log(`🔫 Switched to ${weaponName}`);
  }

  reload() {
    const weapon = this.weapons[this.currentWeapon];
    this.currentAmmo = weapon.ammo;
    
    console.log(`🔄 Reloaded ${this.currentWeapon}`);
  }

  canShoot() {
    if (!this.battleManager) return false;
    if (!this.battleManager.localPlayer.isAlive) return false;
    if (this.battleManager.gameState.phase !== 'playing') return false;
    return true;
  }

  getPlayerFromEntity(entity) {
    // 查找對應的玩家數據
    // 這需要根據實際的玩家實體結構調整
    return this.battleManager.localPlayer;
  }

  createCrosshair() {
    // TODO: 創建 2D 準星 UI
  }

  playShootEffect() {
    // TODO: 播放槍口火焰和音效
  }

  createBulletHole(position, normal) {
    // TODO: 創建彈孔貼花
  }

  update(dt) {
    // 可以在這裡處理持續射擊（自動武器）
  }
}
```

---

## 4. Weapon Pickup System

處理武器箱的拾取邏輯。

```javascript
// game/scripts/battle-arena/weapon-pickup.mjs
import { Script } from 'playcanvas';

export class WeaponPickup extends Script {
  static scriptName = "weaponPickup";

  /**
   * @attribute
   * @title Spawn Index
   * @type {number}
   */
  spawnIndex = 0;

  initialize() {
    // 隨機選擇武器類型
    const weaponTypes = ['shotgun', 'rifle', 'sniper', 'rocket'];
    this.weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    
    // 監聽玩家碰撞
    this.entity.collision.on('collisionstart', this.onCollision, this);
    
    console.log(`📦 Weapon box spawned: ${this.weaponType}`);
  }

  onCollision(result) {
    const other = result;
    
    // 檢查是否是本地玩家
    if (other.tags.has('local-player')) {
      this.pickup();
    }
  }

  pickup() {
    const battleManager = this.app.root.findByTag("battle-manager")[0]?.script.battleGameManager;
    if (!battleManager) return;
    
    // 給予武器
    battleManager.localPlayer.currentWeapon = this.weaponType;
    
    // 廣播拾取事件
    battleManager.network.multiplayer.sendMessage(battleManager.localPlayer, {
      type: 'weapon-pickup',
      playerId: battleManager.network.sessionId,
      weaponType: this.weaponType
    });
    
    console.log(`✅ Picked up ${this.weaponType}`);
    
    // 通知 ArenaGenerator
    const arenaGenerator = this.arenaGenerator;
    if (arenaGenerator) {
      arenaGenerator.onWeaponBoxPickedUp(this.spawnIndex);
    }
    
    // 銷毀武器箱
    this.entity.destroy();
  }
}
```

---

## 5. Health System

管理玩家的生命值和傷害顯示。

```javascript
// game/scripts/battle-arena/health-system.mjs
import { Script } from 'playcanvas';

export class HealthSystem extends Script {
  static scriptName = "healthSystem";

  /**
   * @attribute
   * @title Max Health
   * @type {number}
   */
  maxHealth = 100;

  initialize() {
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    
    // 創建血條 UI（如果需要）
    this.createHealthBar();
  }

  takeDamage(amount, attackerId) {
    if (!this.isAlive) return;
    
    this.currentHealth -= amount;
    this.currentHealth = Math.max(0, this.currentHealth);
    
    // 更新血條
    this.updateHealthBar();
    
    // 顯示傷害數字
    this.showDamageNumber(amount);
    
    // 檢查是否死亡
    if (this.currentHealth <= 0) {
      this.die(attackerId);
    }
  }

  heal(amount) {
    this.currentHealth += amount;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth);
    this.updateHealthBar();
  }

  die(killerId) {
    this.isAlive = false;
    console.log(`💀 Player died`);
    
    // 觸發死亡事件
    this.entity.fire('player:death', killerId);
  }

  respawn() {
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    this.updateHealthBar();
  }

  createHealthBar() {
    // TODO: 創建 UI 血條
  }

  updateHealthBar() {
    // TODO: 更新血條顯示
    const healthPercent = (this.currentHealth / this.maxHealth) * 100;
    console.log(`❤️ Health: ${healthPercent.toFixed(0)}%`);
  }

  showDamageNumber(amount) {
    // TODO: 顯示飄血數字特效
  }
}
```

---

## 6. Battle HUD

顯示遊戲中的 UI 資訊（血量、彈藥、分數、時間等）。

```javascript
// game/scripts/ui/battle-hud.mjs
import { Script } from 'playcanvas';

export class BattleHUD extends Script {
  static scriptName = "battleHud";

  initialize() {
    this.battleManager = this.app.root.findByTag("battle-manager")[0]?.script.battleGameManager;
    
    if (!this.battleManager) {
      console.error('❌ BattleGameManager not found for HUD!');
      return;
    }
    
    this.createHUD();
  }

  createHUD() {
    // 創建 HUD 容器
    const hudEntity = new pc.Entity('battle-hud');
    hudEntity.addComponent('screen', {
      referenceResolution: new pc.Vec2(1920, 1080),
      scaleBlend: 0.5,
      scaleMode: pc.SCALEMODE_BLEND,
      screenSpace: true
    });
    
    this.app.root.addChild(hudEntity);
    
    // 血量顯示
    this.createHealthDisplay(hudEntity);
    
    // 彈藥顯示
    this.createAmmoDisplay(hudEntity);
    
    // 分數板
    this.createScoreboard(hudEntity);
    
    // 計時器
    this.createTimer(hudEntity);
    
    // 準星
    this.createCrosshair(hudEntity);
  }

  createHealthDisplay(parent) {
    // TODO: 實作血量 UI
  }

  createAmmoDisplay(parent) {
    // TODO: 實作彈藥 UI
  }

  createScoreboard(parent) {
    // TODO: 實作分數板 UI
  }

  createTimer(parent) {
    // TODO: 實作計時器 UI
  }

  createCrosshair(parent) {
    const crosshair = new pc.Entity('crosshair');
    crosshair.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
      pivot: new pc.Vec2(0.5, 0.5),
      width: 20,
      height: 20,
      color: new pc.Color(1, 1, 1),
      opacity: 0.8
    });
    
    parent.addChild(crosshair);
  }

  update(dt) {
    if (!this.battleManager) return;
    
    // 更新 UI 顯示
    this.updateHealthDisplay();
    this.updateAmmoDisplay();
    this.updateScoreboard();
    this.updateTimer();
  }

  updateHealthDisplay() {
    // TODO: 更新血量顯示
  }

  updateAmmoDisplay() {
    // TODO: 更新彈藥顯示
  }

  updateScoreboard() {
    // TODO: 更新分數顯示
  }

  updateTimer() {
    // TODO: 更新計時器顯示
  }
}
```

---

## 實作步驟

### Phase 1: 基礎架構 (Week 1)
1. ✅ 設置 BattleGameManager
2. ✅ 整合 NetworkManager
3. ✅ 實作隊伍分配系統
4. ✅ 實作基本的房間配對

### Phase 2: 場景生成 (Week 2)
1. ✅ 實作 ArenaGenerator
2. ✅ 程式化生成地板、牆壁
3. ✅ 程式化生成障礙物
4. ✅ 設置重生點系統

### Phase 3: 戰鬥系統 (Week 3)
1. ✅ 實作 PlayerCombat
2. ✅ 射擊邏輯（射線檢測）
3. ✅ 傷害系統
4. ✅ 武器系統
5. ✅ 武器拾取

### Phase 4: 同步與網路 (Week 4)
1. 完善射擊同步
2. 完善傷害同步
3. 實作延遲補償
4. 優化網路頻率

### Phase 5: UI 與回饋 (Week 5)
1. 實作 Battle HUD
2. 實作計分板
3. 實作死亡/重生畫面
4. 實作比賽結果畫面

### Phase 6: 優化與測試 (Week 6)
1. 性能優化
2. 多人測試
3. 平衡性調整
4. Bug 修復

---

## 網路同步設計

### 高頻同步（20 Hz）
- 玩家位置
- 玩家旋轉
- 動畫狀態

### 事件同步（即時）
- 射擊事件
- 傷害事件
- 死亡事件
- 武器拾取
- 分數更新

### 狀態同步（低頻）
- 比賽時間
- 隊伍分數
- 房間狀態

---

## 測試計劃

### 單人測試
- [ ] 競技場生成正確
- [ ] 射擊機制正常
- [ ] UI 顯示正確
- [ ] 武器切換正常

### 雙人測試
- [ ] 配對成功
- [ ] 隊伍分配正確
- [ ] 射擊同步
- [ ] 傷害同步
- [ ] 分數同步

### 多人測試（4-8人）
- [ ] 房間穩定性
- [ ] 網路延遲處理
- [ ] 性能表現
- [ ] 遊戲平衡性

---

## 已知問題與解決方案

### 問題 1: 射擊延遲
**解決方案**: 實作客戶端預測，本地立即顯示射擊效果，伺服器驗證後修正。

### 問題 2: 命中判定不一致
**解決方案**: 使用伺服器時間戳進行延遲補償，回溯玩家位置。

### 問題 3: 地圖生成不一致
**解決方案**: 使用相同的 seed 和 SeededRandom 類確保所有客戶端生成相同地圖。

### 問題 4: 大量實體性能問題
**解決方案**: 
- 使用物件池管理發射物
- 限制同時存在的特效數量
- 優化碰撞檢測範圍

---

## 擴展計劃

### 短期擴展
- [ ] 增加更多武器類型
- [ ] 增加道具系統（護盾、加速、隱身）
- [ ] 增加不同的競技場主題
- [ ] 增加角色能力系統

### 中期擴展
- [ ] 增加遊戲模式（奪旗、據點佔領）
- [ ] 增加成就系統
- [ ] 增加等級和解鎖系統
- [ ] 增加自訂角色外觀

### 長期擴展
- [ ] 錦標賽模式
- [ ] 觀戰系統
- [ ] 重播系統
- [ ] 排名系統

---

## 參考資料

- [PlayCanvas API 文檔](https://api.playcanvas.com/)
- [VIVERSE SDK 文檔](https://developer.viverse.com/)
- [射線檢測最佳實踐](https://developer.playcanvas.com/user-manual/physics/physics-basics/)
- [網路遊戲同步策略](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)

---

**文件版本**: 1.0  
**最後更新**: 2025年11月14日  
**狀態**: 開發中 - Phase 3  
**預計完成**: 2025年12月底
