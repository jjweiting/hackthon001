# 遊戲設計方案

本文件提出 5 種多人遊戲設計方案，充分利用 VIVERSE SDK 的 **Matchmaking** 和 **Multiplayer** 功能。所有遊戲設計都以**程式化創建 Entity** 為核心原則，避免手動在編輯器中放置物件，確保可擴展性和動態性。

---

## 設計原則

### 核心技術特性
- ✅ **Matchmaking 配對系統**: 房間列表、自動配對、房間狀態管理
- ✅ **Multiplayer 即時同步**: 玩家位置、狀態、遊戲事件即時同步
- ✅ **程式化 Entity 創建**: 所有遊戲物件、場景元素都由程式動態生成
- ✅ **事件驅動架構**: 利用現有的 NetworkManager 事件系統

### 開發限制與優勢
- 🎯 **動態場景生成**: 不依賴預製場景，所有物件程式化生成
- 🎯 **靈活的房間管理**: 利用 Matchmaking 實現不同遊戲模式
- 🎯 **即時狀態同步**: 遊戲進度、分數、物件狀態即時同步所有玩家

---

## 遊戲設計方案

## 🎯 方案一：多人射擊競技場 (Battle Arena)

### 遊戲概念
玩家在動態生成的競技場中進行團隊對戰，利用程式化生成的武器、障礙物和地形進行戰鬥。

### 核心玩法
- **配對系統**: 2v2 或 4v4 團隊對戰，透過 Matchmaking 自動組隊
- **動態場景**: 每場比賽隨機生成不同的競技場佈局
- **武器系統**: 場景中隨機生成武器箱，玩家拾取後獲得不同武器
- **計分系統**: 擊殺得分，先達到目標分數的隊伍獲勝

### SDK 功能應用

#### Matchmaking 應用
```javascript
// 創建房間時設定遊戲模式和隊伍配置
async createArenaRoom(gameMode) {
  const roomOptions = {
    maxPlayers: gameMode === '2v2' ? 4 : 8,
    customProperties: {
      gameType: 'battle-arena',
      mode: gameMode,
      mapSeed: Math.random(), // 用於生成隨機地圖
      teamA: [],
      teamB: []
    }
  };
  await this.matchmaking.createRoom(roomOptions);
}

// 自動分配隊伍
onPlayerJoinRoom(player) {
  const room = this.matchmaking.currentRoom;
  const teamA = room.customProperties.teamA;
  const teamB = room.customProperties.teamB;
  
  // 平衡隊伍人數
  if (teamA.length <= teamB.length) {
    teamA.push(player.sessionId);
    player.team = 'A';
  } else {
    teamB.push(player.sessionId);
    player.team = 'B';
  }
}
```

#### Multiplayer 應用
```javascript
// 同步射擊事件
shootWeapon(direction, weaponType) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'player-shoot',
    direction: direction,
    weaponType: weaponType,
    timestamp: Date.now()
  });
}

// 同步傷害與擊殺
onPlayerHit(targetPlayerId, damage) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'player-hit',
    targetId: targetPlayerId,
    damage: damage,
    position: this.entity.getPosition()
  });
}

// 同步分數更新
updateTeamScore(team, newScore) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'score-update',
    team: team,
    score: newScore
  });
}
```

### 程式化 Entity 創建

```javascript
// 動態生成競技場
class ArenaGenerator extends Script {
  initialize() {
    const room = this.gameManager.network.currentRoom;
    const mapSeed = room.customProperties.mapSeed;
    
    // 使用 seed 生成隨機但一致的地圖
    this.generateArena(mapSeed);
    this.spawnWeaponBoxes();
    this.createSpawnPoints();
  }
  
  generateArena(seed) {
    // 創建地板
    const floor = new pc.Entity('arena-floor');
    floor.addComponent('render', {
      type: 'box',
      material: this.floorMaterial
    });
    floor.setLocalScale(50, 1, 50);
    this.app.root.addChild(floor);
    
    // 隨機生成障礙物
    const rng = new SeededRandom(seed);
    for (let i = 0; i < 20; i++) {
      const obstacle = new pc.Entity(`obstacle-${i}`);
      obstacle.addComponent('render', {
        type: 'box',
        material: this.obstacleMaterial
      });
      obstacle.addComponent('collision', {
        type: 'box'
      });
      obstacle.addComponent('rigidbody', {
        type: 'static'
      });
      
      // 隨機位置
      const x = (rng.random() - 0.5) * 40;
      const z = (rng.random() - 0.5) * 40;
      obstacle.setPosition(x, 2, z);
      obstacle.setLocalScale(2, 4, 2);
      
      this.app.root.addChild(obstacle);
    }
  }
  
  spawnWeaponBoxes() {
    // 定期在隨機位置生成武器箱
    setInterval(() => {
      const weaponBox = new pc.Entity('weapon-box');
      weaponBox.addComponent('render', {
        type: 'box',
        material: this.weaponBoxMaterial
      });
      weaponBox.addComponent('collision', {
        type: 'box',
        halfExtents: new pc.Vec3(0.5, 0.5, 0.5)
      });
      
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      weaponBox.setPosition(x, 1, z);
      
      // 添加拾取邏輯腳本
      weaponBox.addComponent('script');
      weaponBox.script.create('weaponPickup', {
        attributes: {
          weaponType: this.getRandomWeaponType()
        }
      });
      
      this.app.root.addChild(weaponBox);
    }, 10000); // 每 10 秒生成一個
  }
}
```

### 技術挑戰
- 客戶端預測與伺服器驗證（防作弊）
- 擊中判定的同步（延遲補償）
- 大量物件的網路同步優化

---

## 🏁 方案二：多人競速賽車 (Racing Showdown)

### 遊戲概念
玩家駕駛程式化生成的賽車，在動態生成的賽道上競速。透過 Matchmaking 進行配對，支援多種賽道模式。

### 核心玩法
- **配對系統**: 4-8 人競速賽，自動配對或創建私人房間
- **動態賽道**: 每場比賽隨機生成賽道佈局（直道、彎道、障礙）
- **加速道具**: 賽道上隨機生成加速、減速、護盾等道具
- **排名系統**: 實時顯示所有玩家排名和圈數

### SDK 功能應用

#### Matchmaking 應用
```javascript
// 創建賽車房間
async createRaceRoom(trackDifficulty, maxPlayers = 6) {
  const roomOptions = {
    maxPlayers: maxPlayers,
    customProperties: {
      gameType: 'racing',
      trackSeed: Date.now(),
      difficulty: trackDifficulty,
      laps: 3,
      raceStarted: false,
      playerReadyStatus: {}
    }
  };
  await this.matchmaking.createRoom(roomOptions);
}

// 準備狀態管理
setPlayerReady(isReady) {
  const room = this.matchmaking.currentRoom;
  room.customProperties.playerReadyStatus[this.sessionId] = isReady;
  
  // 檢查是否所有玩家都準備好
  if (this.allPlayersReady()) {
    this.startRaceCountdown();
  }
}
```

#### Multiplayer 應用
```javascript
// 同步車輛狀態（高頻更新）
update(dt) {
  this.syncTimer += dt;
  if (this.syncTimer > 0.05) { // 20 次/秒
    this.multiplayer.sendMessage(this.localPlayer, {
      type: 'vehicle-update',
      position: this.vehicle.getPosition(),
      rotation: this.vehicle.getRotation(),
      velocity: this.velocity,
      currentLap: this.currentLap,
      checkpointIndex: this.checkpointIndex
    });
    this.syncTimer = 0;
  }
}

// 同步道具使用
useItem(itemType) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'item-used',
    itemType: itemType,
    targetPosition: this.entity.getPosition()
  });
}

// 同步比賽結果
onRaceFinish(finalTime, finalRank) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'race-finish',
    time: finalTime,
    rank: finalRank
  });
}
```

### 程式化 Entity 創建

```javascript
// 程式化生成賽車
class VehicleSpawner extends Script {
  createVehicle(playerId, spawnIndex) {
    const vehicle = new pc.Entity(`vehicle-${playerId}`);
    
    // 車身
    const body = new pc.Entity('body');
    body.addComponent('render', {
      type: 'box',
      material: this.getPlayerMaterial(spawnIndex)
    });
    body.setLocalScale(2, 1, 3);
    vehicle.addChild(body);
    
    // 輪子
    for (let i = 0; i < 4; i++) {
      const wheel = new pc.Entity(`wheel-${i}`);
      wheel.addComponent('render', {
        type: 'cylinder',
        material: this.wheelMaterial
      });
      wheel.setLocalScale(0.5, 0.3, 0.5);
      wheel.setLocalRotation(new pc.Quat().setFromEulerAngles(0, 0, 90));
      
      const x = i % 2 === 0 ? -1 : 1;
      const z = i < 2 ? 1 : -1;
      wheel.setLocalPosition(x, -0.3, z);
      
      vehicle.addChild(wheel);
    }
    
    // 物理組件
    vehicle.addComponent('rigidbody', {
      type: 'dynamic',
      mass: 100,
      restitution: 0.2
    });
    vehicle.addComponent('collision', {
      type: 'box',
      halfExtents: new pc.Vec3(1, 0.5, 1.5)
    });
    
    // 車輛控制腳本
    vehicle.addComponent('script');
    vehicle.script.create('vehicleController', {
      attributes: {
        maxSpeed: 50,
        acceleration: 10,
        turnSpeed: 2
      }
    });
    
    // 設置起始位置
    const spawnPoint = this.getSpawnPoint(spawnIndex);
    vehicle.setPosition(spawnPoint.position);
    vehicle.setRotation(spawnPoint.rotation);
    
    this.app.root.addChild(vehicle);
    return vehicle;
  }
}

// 程式化生成賽道
class TrackGenerator extends Script {
  generateTrack(seed, difficulty) {
    const rng = new SeededRandom(seed);
    const segments = difficulty === 'easy' ? 8 : 16;
    
    let currentPos = new pc.Vec3(0, 0, 0);
    let currentDir = 0; // 角度
    
    for (let i = 0; i < segments; i++) {
      const segmentType = rng.random() > 0.5 ? 'straight' : 'curve';
      const segment = this.createTrackSegment(segmentType, i);
      
      segment.setPosition(currentPos);
      segment.setRotation(new pc.Quat().setFromEulerAngles(0, currentDir, 0));
      
      this.app.root.addChild(segment);
      
      // 更新下一個片段的位置和方向
      if (segmentType === 'straight') {
        currentPos.add(new pc.Vec3(
          Math.sin(currentDir * pc.math.DEG_TO_RAD) * 20,
          0,
          Math.cos(currentDir * pc.math.DEG_TO_RAD) * 20
        ));
      } else {
        currentDir += (rng.random() > 0.5 ? 45 : -45);
        currentPos.add(new pc.Vec3(
          Math.sin(currentDir * pc.math.DEG_TO_RAD) * 15,
          0,
          Math.cos(currentDir * pc.math.DEG_TO_RAD) * 15
        ));
      }
      
      // 每隔幾個片段添加檢查點
      if (i % 3 === 0) {
        this.createCheckpoint(currentPos, currentDir, i / 3);
      }
      
      // 隨機生成道具
      if (rng.random() > 0.7) {
        this.spawnPowerup(currentPos);
      }
    }
  }
  
  createTrackSegment(type, index) {
    const segment = new pc.Entity(`track-segment-${index}`);
    segment.addComponent('render', {
      type: 'box',
      material: this.trackMaterial
    });
    segment.addComponent('collision', {
      type: 'box'
    });
    segment.addComponent('rigidbody', {
      type: 'static'
    });
    
    if (type === 'straight') {
      segment.setLocalScale(10, 0.5, 20);
    } else {
      segment.setLocalScale(10, 0.5, 15);
    }
    
    return segment;
  }
  
  spawnPowerup(position) {
    const powerup = new pc.Entity('powerup');
    powerup.addComponent('render', {
      type: 'sphere',
      material: this.powerupMaterial
    });
    powerup.setPosition(position.x, 1, position.z);
    powerup.addComponent('script');
    powerup.script.create('powerupPickup');
    this.app.root.addChild(powerup);
  }
}
```

### 技術挑戰
- 物理同步（車輛碰撞、翻車）
- 大量實體的性能優化
- 賽道生成的一致性（所有客戶端相同）

---

## 🧩 方案三：協作解謎逃脫室 (Escape Room Co-op)

### 遊戲概念
2-4 名玩家合作解開動態生成的謎題房間，每個玩家有不同的能力，必須互相協作才能逃脫。

### 核心玩法
- **配對系統**: 小隊配對（2-4 人），支援好友組隊
- **動態謎題**: 每次遊戲隨機生成不同的謎題組合
- **角色能力**: 每個玩家隨機分配不同能力（解鎖、搬運、解碼、探測）
- **時間限制**: 限時逃脫，增加緊張感

### SDK 功能應用

#### Matchmaking 應用
```javascript
// 創建逃脫室房間
async createEscapeRoom(difficulty) {
  const roomOptions = {
    maxPlayers: 4,
    customProperties: {
      gameType: 'escape-room',
      difficulty: difficulty,
      puzzleSeed: Date.now(),
      timeLimit: difficulty === 'easy' ? 600 : 300, // 秒
      startTime: null,
      puzzleStates: {},
      playerRoles: {},
      hintsUsed: 0
    }
  };
  await this.matchmaking.createRoom(roomOptions);
}

// 分配角色
assignPlayerRoles() {
  const roles = ['unlocker', 'carrier', 'decoder', 'detector'];
  const room = this.matchmaking.currentRoom;
  const players = room.actors;
  
  players.forEach((player, index) => {
    room.customProperties.playerRoles[player.sessionId] = roles[index % roles.length];
  });
}
```

#### Multiplayer 應用
```javascript
// 同步謎題交互
interactWithPuzzle(puzzleId, action) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'puzzle-interact',
    puzzleId: puzzleId,
    action: action,
    playerRole: this.playerRole,
    timestamp: Date.now()
  });
}

// 同步物品狀態
moveObject(objectId, newPosition) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'object-moved',
    objectId: objectId,
    position: newPosition,
    rotation: this.entity.getRotation()
  });
}

// 同步謎題解開狀態
onPuzzleSolved(puzzleId) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'puzzle-solved',
    puzzleId: puzzleId,
    solvedBy: this.sessionId,
    remainingTime: this.getRemainingTime()
  });
}

// 請求提示
requestHint() {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'hint-request',
    currentPuzzle: this.currentPuzzleId
  });
}
```

### 程式化 Entity 創建

```javascript
// 程式化生成逃脫室
class EscapeRoomGenerator extends Script {
  initialize() {
    const room = this.gameManager.network.currentRoom;
    const seed = room.customProperties.puzzleSeed;
    const difficulty = room.customProperties.difficulty;
    
    this.generateRoom(seed, difficulty);
    this.createPuzzles(seed, difficulty);
    this.setupPlayerSpawns();
  }
  
  generateRoom(seed, difficulty) {
    const rng = new SeededRandom(seed);
    
    // 創建房間結構
    const roomSize = difficulty === 'easy' ? 15 : 20;
    
    // 地板
    const floor = new pc.Entity('room-floor');
    floor.addComponent('render', {
      type: 'box',
      material: this.floorMaterial
    });
    floor.setLocalScale(roomSize, 0.5, roomSize);
    floor.setPosition(0, 0, 0);
    this.app.root.addChild(floor);
    
    // 牆壁
    this.createWalls(roomSize);
    
    // 隨機生成房間內的物品
    this.generateFurniture(rng, roomSize);
    
    // 創建出口門（初始鎖住）
    this.createExitDoor(roomSize);
  }
  
  createPuzzles(seed, difficulty) {
    const rng = new SeededRandom(seed);
    const puzzleCount = difficulty === 'easy' ? 3 : 6;
    const puzzleTypes = ['colorMatch', 'symbolSequence', 'weightBalance', 'wirePuzzle'];
    
    for (let i = 0; i < puzzleCount; i++) {
      const puzzleType = puzzleTypes[Math.floor(rng.random() * puzzleTypes.length)];
      const puzzle = this.createPuzzle(puzzleType, i, rng);
      
      // 隨機放置謎題
      const x = (rng.random() - 0.5) * 10;
      const z = (rng.random() - 0.5) * 10;
      puzzle.setPosition(x, 1.5, z);
      
      this.app.root.addChild(puzzle);
    }
  }
  
  createPuzzle(type, id, rng) {
    const puzzle = new pc.Entity(`puzzle-${type}-${id}`);
    
    // 謎題視覺呈現
    const panel = new pc.Entity('panel');
    panel.addComponent('render', {
      type: 'box',
      material: this.puzzleMaterial
    });
    panel.setLocalScale(2, 2, 0.2);
    puzzle.addChild(panel);
    
    // 根據類型創建謎題元素
    switch(type) {
      case 'colorMatch':
        this.createColorMatchPuzzle(puzzle, rng);
        break;
      case 'symbolSequence':
        this.createSymbolSequencePuzzle(puzzle, rng);
        break;
      case 'weightBalance':
        this.createWeightBalancePuzzle(puzzle, rng);
        break;
      case 'wirePuzzle':
        this.createWirePuzzle(puzzle, rng);
        break;
    }
    
    // 添加交互腳本
    puzzle.addComponent('script');
    puzzle.script.create('puzzleInteraction', {
      attributes: {
        puzzleId: `${type}-${id}`,
        requiredRole: this.getRequiredRole(type),
        solution: this.generateSolution(type, rng)
      }
    });
    
    return puzzle;
  }
  
  createColorMatchPuzzle(parent, rng) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const solution = [];
    
    for (let i = 0; i < 4; i++) {
      const button = new pc.Entity(`color-button-${i}`);
      button.addComponent('render', {
        type: 'sphere',
        material: this.getMaterial(colors[i])
      });
      button.setLocalScale(0.3, 0.3, 0.3);
      button.setLocalPosition((i - 1.5) * 0.5, 0, 0.2);
      
      button.addComponent('collision', {
        type: 'sphere',
        radius: 0.3
      });
      
      parent.addChild(button);
      solution.push(Math.floor(rng.random() * 4));
    }
    
    return solution;
  }
  
  createExitDoor(roomSize) {
    const door = new pc.Entity('exit-door');
    door.addComponent('render', {
      type: 'box',
      material: this.doorMaterial
    });
    door.setLocalScale(2, 3, 0.3);
    door.setPosition(0, 1.5, roomSize / 2 - 0.5);
    
    door.addComponent('script');
    door.script.create('exitDoor', {
      attributes: {
        isLocked: true,
        requiredPuzzles: ['all']
      }
    });
    
    this.app.root.addChild(door);
  }
}

// 可移動物品系統
class InteractiveObjectManager extends Script {
  createMovableObject(type, position) {
    const obj = new pc.Entity(`movable-${type}`);
    
    obj.addComponent('render', {
      type: type === 'box' ? 'box' : 'cylinder',
      material: this.objectMaterial
    });
    
    obj.addComponent('rigidbody', {
      type: 'dynamic',
      mass: 5
    });
    
    obj.addComponent('collision', {
      type: type === 'box' ? 'box' : 'cylinder'
    });
    
    obj.setPosition(position);
    
    // 添加抓取和移動腳本
    obj.addComponent('script');
    obj.script.create('grabbable', {
      attributes: {
        requiredRole: 'carrier'
      }
    });
    
    this.app.root.addChild(obj);
    return obj;
  }
}
```

### 技術挑戰
- 謎題狀態的同步（多人同時交互）
- 物理物件的同步
- 確保所有客戶端謎題生成一致

---

## 🎲 方案四：派對小遊戲合集 (Party Games Collection)

### 遊戲概念
類似 Fall Guys 或 Mario Party，玩家通過多個快節奏小遊戲競爭，累積分數決定勝負。

### 核心玩法
- **配對系統**: 4-12 人派對房間
- **小遊戲輪換**: 每輪隨機選擇一個小遊戲（3-5 分鐘一輪）
- **積分系統**: 根據排名獲得分數，總分最高者獲勝
- **動態障礙**: 小遊戲中的障礙物和挑戰隨機生成

### SDK 功能應用

#### Matchmaking 應用
```javascript
// 創建派對房間
async createPartyRoom(maxPlayers = 8) {
  const roomOptions = {
    maxPlayers: maxPlayers,
    customProperties: {
      gameType: 'party-games',
      currentRound: 0,
      totalRounds: 5,
      gameSequence: this.generateGameSequence(),
      playerScores: {},
      roundInProgress: false
    }
  };
  await this.matchmaking.createRoom(roomOptions);
}

// 生成遊戲序列
generateGameSequence() {
  const games = [
    'obstacle-race',
    'color-floor',
    'tag-game',
    'platform-jump',
    'memory-match'
  ];
  return this.shuffleArray(games).slice(0, 5);
}

// 回合管理
async startNextRound() {
  const room = this.matchmaking.currentRoom;
  const currentRound = room.customProperties.currentRound;
  const gameType = room.customProperties.gameSequence[currentRound];
  
  room.customProperties.roundInProgress = true;
  
  // 通知所有玩家載入新遊戲
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'round-start',
    round: currentRound + 1,
    gameType: gameType,
    gameSeed: Date.now()
  });
}
```

#### Multiplayer 應用
```javascript
// 同步遊戲狀態
onMiniGameComplete(rank, score) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'minigame-complete',
    playerId: this.sessionId,
    rank: rank,
    score: score,
    completionTime: this.gameTimer
  });
}

// 同步特殊事件（障礙物出現、道具拾取等）
onGameEvent(eventType, eventData) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'game-event',
    eventType: eventType,
    data: eventData,
    timestamp: Date.now()
  });
}

// 顯示回合結果
showRoundResults(rankings) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'round-results',
    rankings: rankings,
    updatedScores: this.calculateScores(rankings)
  });
}
```

### 程式化 Entity 創建

```javascript
// 小遊戲管理器
class MiniGameManager extends Script {
  initialize() {
    this.currentGame = null;
    this.network.on('round-start', (data) => {
      this.loadMiniGame(data.gameType, data.gameSeed);
    });
  }
  
  loadMiniGame(gameType, seed) {
    // 清理上一個遊戲
    if (this.currentGame) {
      this.currentGame.destroy();
    }
    
    // 根據類型創建新遊戲
    switch(gameType) {
      case 'obstacle-race':
        this.currentGame = this.createObstacleRace(seed);
        break;
      case 'color-floor':
        this.currentGame = this.createColorFloor(seed);
        break;
      case 'tag-game':
        this.currentGame = this.createTagGame(seed);
        break;
      case 'platform-jump':
        this.currentGame = this.createPlatformJump(seed);
        break;
      case 'memory-match':
        this.currentGame = this.createMemoryMatch(seed);
        break;
    }
  }
  
  createObstacleRace(seed) {
    const game = new pc.Entity('obstacle-race');
    const rng = new SeededRandom(seed);
    
    // 創建起點和終點
    const start = this.createPlatform(new pc.Vec3(0, 0, 0), 10, 10);
    const finish = this.createPlatform(new pc.Vec3(0, 0, 100), 10, 10);
    game.addChild(start);
    game.addChild(finish);
    
    // 生成障礙物賽道
    for (let i = 0; i < 20; i++) {
      const obstacleType = rng.random() > 0.5 ? 'rotating-bar' : 'moving-wall';
      const obstacle = this.createObstacle(obstacleType, i * 5, rng);
      game.addChild(obstacle);
    }
    
    this.app.root.addChild(game);
    return game;
  }
  
  createObstacle(type, zPosition, rng) {
    const obstacle = new pc.Entity(`obstacle-${type}`);
    
    if (type === 'rotating-bar') {
      // 旋轉橫桿
      const bar = new pc.Entity('bar');
      bar.addComponent('render', {
        type: 'box',
        material: this.obstacleMaterial
      });
      bar.setLocalScale(10, 0.5, 0.5);
      bar.addComponent('collision', {
        type: 'box'
      });
      bar.addComponent('rigidbody', {
        type: 'kinematic'
      });
      obstacle.addChild(bar);
      
      // 添加旋轉腳本
      obstacle.addComponent('script');
      obstacle.script.create('rotatingObstacle', {
        attributes: {
          speed: 30 + rng.random() * 30
        }
      });
      
    } else if (type === 'moving-wall') {
      // 移動牆壁
      const wall = new pc.Entity('wall');
      wall.addComponent('render', {
        type: 'box',
        material: this.obstacleMaterial
      });
      wall.setLocalScale(8, 3, 0.5);
      wall.addComponent('collision', {
        type: 'box'
      });
      wall.addComponent('rigidbody', {
        type: 'kinematic'
      });
      obstacle.addChild(wall);
      
      // 添加移動腳本
      obstacle.addComponent('script');
      obstacle.script.create('movingObstacle', {
        attributes: {
          range: 5,
          speed: 2
        }
      });
    }
    
    obstacle.setPosition(0, 2, zPosition);
    return obstacle;
  }
  
  createColorFloor(seed) {
    const game = new pc.Entity('color-floor');
    const rng = new SeededRandom(seed);
    
    // 創建彩色地板網格
    const gridSize = 10;
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const tile = new pc.Entity(`tile-${x}-${z}`);
        tile.addComponent('render', {
          type: 'box',
          material: this.getMaterial(colors[Math.floor(rng.random() * colors.length)])
        });
        tile.setLocalScale(2, 0.2, 2);
        tile.setPosition(x * 2.2 - gridSize, 0, z * 2.2 - gridSize);
        
        tile.addComponent('collision', {
          type: 'box'
        });
        tile.addComponent('rigidbody', {
          type: 'static'
        });
        
        // 添加地板腳本（隨機消失）
        tile.addComponent('script');
        tile.script.create('disappearingTile', {
          attributes: {
            color: colors[Math.floor(rng.random() * colors.length)],
            lifetime: 2 + rng.random() * 3
          }
        });
        
        game.addChild(tile);
      }
    }
    
    // 添加遊戲邏輯腳本
    game.addComponent('script');
    game.script.create('colorFloorGame', {
      attributes: {
        roundDuration: 60
      }
    });
    
    this.app.root.addChild(game);
    return game;
  }
  
  createPlatformJump(seed) {
    const game = new pc.Entity('platform-jump');
    const rng = new SeededRandom(seed);
    
    let currentHeight = 0;
    let currentPos = new pc.Vec3(0, 0, 0);
    
    // 生成向上的平台序列
    for (let i = 0; i < 30; i++) {
      const platform = new pc.Entity(`platform-${i}`);
      platform.addComponent('render', {
        type: 'box',
        material: this.platformMaterial
      });
      
      const size = 2 + rng.random() * 2;
      platform.setLocalScale(size, 0.3, size);
      
      platform.addComponent('collision', {
        type: 'box'
      });
      platform.addComponent('rigidbody', {
        type: 'static'
      });
      
      // 隨機位置但在可跳躍範圍內
      currentHeight += 1 + rng.random() * 2;
      const offsetX = (rng.random() - 0.5) * 3;
      const offsetZ = (rng.random() - 0.5) * 3;
      
      platform.setPosition(currentPos.x + offsetX, currentHeight, currentPos.z + offsetZ);
      currentPos.set(currentPos.x + offsetX, currentHeight, currentPos.z + offsetZ);
      
      // 某些平台會移動
      if (rng.random() > 0.7) {
        platform.rigidbody.type = 'kinematic';
        platform.addComponent('script');
        platform.script.create('movingPlatform', {
          attributes: {
            range: 2,
            speed: 1
          }
        });
      }
      
      game.addChild(platform);
    }
    
    // 創建終點平台
    const finish = new pc.Entity('finish-platform');
    finish.addComponent('render', {
      type: 'box',
      material: this.finishMaterial
    });
    finish.setLocalScale(5, 0.5, 5);
    finish.setPosition(currentPos.x, currentHeight + 3, currentPos.z);
    game.addChild(finish);
    
    this.app.root.addChild(game);
    return game;
  }
}

// 動態障礙物腳本
class RotatingObstacle extends Script {
  update(dt) {
    this.entity.rotate(0, this.speed * dt, 0);
  }
}

class MovingObstacle extends Script {
  initialize() {
    this.startPos = this.entity.getPosition().clone();
    this.time = 0;
  }
  
  update(dt) {
    this.time += dt * this.speed;
    const offset = Math.sin(this.time) * this.range;
    this.entity.setPosition(this.startPos.x + offset, this.startPos.y, this.startPos.z);
  }
}
```

### 技術挑戰
- 快速切換場景和遊戲模式
- 多種遊戲邏輯的管理
- 確保所有小遊戲的公平性

---

## 🏰 方案五：塔防對戰 (Tower Defense PvP)

### 遊戲概念
2 隊玩家對戰，一方防守（建造防禦塔），一方進攻（派遣怪物），雙方角色定期互換。程式化生成地圖和單位。

### 核心玩法
- **配對系統**: 2v2 或 3v3 對戰
- **雙重角色**: 每輪玩家輪流扮演防守方和進攻方
- **資源系統**: 擊殺怪物或防守成功獲得資源，用於升級
- **動態地圖**: 每場比賽隨機生成不同的路徑和地形

### SDK 功能應用

#### Matchmaking 應用
```javascript
// 創建塔防對戰房間
async createTowerDefenseRoom(teamSize = 2) {
  const roomOptions = {
    maxPlayers: teamSize * 2,
    customProperties: {
      gameType: 'tower-defense-pvp',
      mapSeed: Date.now(),
      currentRound: 1,
      totalRounds: 6,
      teamA: { role: 'defender', score: 0, resources: 1000 },
      teamB: { role: 'attacker', score: 0, resources: 1000 },
      roundInProgress: false
    }
  };
  await this.matchmaking.createRoom(roomOptions);
}

// 切換隊伍角色
switchTeamRoles() {
  const room = this.matchmaking.currentRoom;
  const temp = room.customProperties.teamA.role;
  room.customProperties.teamA.role = room.customProperties.teamB.role;
  room.customProperties.teamB.role = temp;
  
  room.customProperties.currentRound++;
}
```

#### Multiplayer 應用
```javascript
// 同步防禦塔建造
buildTower(towerType, position) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'tower-built',
    towerType: towerType,
    position: position,
    playerId: this.sessionId,
    cost: this.getTowerCost(towerType)
  });
}

// 同步怪物派遣
spawnMonster(monsterType, pathIndex) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'monster-spawned',
    monsterType: monsterType,
    pathIndex: pathIndex,
    playerId: this.sessionId
  });
}

// 同步戰鬥事件
onCombatEvent(eventType, data) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'combat-event',
    eventType: eventType, // 'tower-attack', 'monster-damage', 'base-damage'
    data: data,
    timestamp: Date.now()
  });
}

// 同步資源變化
updateResources(team, amount, reason) {
  this.multiplayer.sendMessage(this.localPlayer, {
    type: 'resource-update',
    team: team,
    amount: amount,
    reason: reason
  });
}
```

### 程式化 Entity 創建

```javascript
// 塔防地圖生成器
class TowerDefenseMapGenerator extends Script {
  initialize() {
    const room = this.gameManager.network.currentRoom;
    const seed = room.customProperties.mapSeed;
    
    this.generateMap(seed);
    this.createBases();
  }
  
  generateMap(seed) {
    const rng = new SeededRandom(seed);
    
    // 創建地形
    const terrain = new pc.Entity('terrain');
    terrain.addComponent('render', {
      type: 'box',
      material: this.terrainMaterial
    });
    terrain.setLocalScale(60, 0.5, 40);
    this.app.root.addChild(terrain);
    
    // 生成攻擊路徑（從攻擊方基地到防守方基地）
    this.paths = [];
    const pathCount = 2 + Math.floor(rng.random() * 2); // 2-3 條路徑
    
    for (let i = 0; i < pathCount; i++) {
      const path = this.generatePath(seed + i, rng);
      this.paths.push(path);
      this.visualizePath(path, i);
    }
    
    // 生成可建造區域（在路徑兩側）
    this.generateBuildZones(rng);
  }
  
  generatePath(seed, rng) {
    const waypoints = [];
    const startX = -25;
    const endX = 25;
    let currentZ = (rng.random() - 0.5) * 20;
    
    waypoints.push(new pc.Vec3(startX, 0.5, currentZ));
    
    let currentX = startX;
    while (currentX < endX - 5) {
      currentX += 5 + rng.random() * 5;
      currentZ += (rng.random() - 0.5) * 10;
      currentZ = pc.math.clamp(currentZ, -18, 18);
      
      waypoints.push(new pc.Vec3(currentX, 0.5, currentZ));
    }
    
    waypoints.push(new pc.Vec3(endX, 0.5, currentZ));
    
    return waypoints;
  }
  
  visualizePath(waypoints, pathIndex) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      
      const segment = new pc.Entity(`path-${pathIndex}-segment-${i}`);
      segment.addComponent('render', {
        type: 'box',
        material: this.pathMaterial
      });
      
      const midpoint = new pc.Vec3().lerp(start, end, 0.5);
      const distance = start.distance(end);
      
      segment.setPosition(midpoint);
      segment.setLocalScale(distance, 0.1, 2);
      segment.lookAt(end);
      
      this.app.root.addChild(segment);
    }
  }
  
  generateBuildZones(rng) {
    // 在路徑兩側生成可建造的格子
    const gridSize = 2;
    
    for (let x = -25; x < 25; x += gridSize) {
      for (let z = -18; z < 18; z += gridSize) {
        const pos = new pc.Vec3(x, 0.5, z);
        
        // 檢查是否離路徑太近
        if (this.isNearPath(pos, 3)) continue;
        
        // 創建建造格子
        const buildSlot = new pc.Entity(`build-slot-${x}-${z}`);
        buildSlot.addComponent('render', {
          type: 'box',
          material: this.buildSlotMaterial
        });
        buildSlot.setLocalScale(1.8, 0.05, 1.8);
        buildSlot.setPosition(pos);
        
        buildSlot.addComponent('collision', {
          type: 'box'
        });
        
        buildSlot.addComponent('script');
        buildSlot.script.create('buildSlot', {
          attributes: {
            gridX: x,
            gridZ: z,
            occupied: false
          }
        });
        
        this.app.root.addChild(buildSlot);
      }
    }
  }
  
  createBases() {
    // 防守方基地（右側）
    const defenderBase = new pc.Entity('defender-base');
    defenderBase.addComponent('render', {
      type: 'box',
      material: this.defenderBaseMaterial
    });
    defenderBase.setLocalScale(5, 5, 5);
    defenderBase.setPosition(25, 2.5, 0);
    
    defenderBase.addComponent('collision', {
      type: 'box'
    });
    
    defenderBase.addComponent('script');
    defenderBase.script.create('baseHealth', {
      attributes: {
        team: 'defender',
        maxHealth: 1000,
        currentHealth: 1000
      }
    });
    
    this.app.root.addChild(defenderBase);
    
    // 攻擊方基地（左側）
    const attackerBase = new pc.Entity('attacker-base');
    attackerBase.addComponent('render', {
      type: 'box',
      material: this.attackerBaseMaterial
    });
    attackerBase.setLocalScale(5, 5, 5);
    attackerBase.setPosition(-25, 2.5, 0);
    
    this.app.root.addChild(attackerBase);
  }
}

// 程式化創建防禦塔
class TowerFactory extends Script {
  createTower(type, position, team) {
    const tower = new pc.Entity(`tower-${type}-${Date.now()}`);
    
    // 塔基座
    const base = new pc.Entity('base');
    base.addComponent('render', {
      type: 'cylinder',
      material: this.getTeamMaterial(team)
    });
    base.setLocalScale(1, 0.5, 1);
    tower.addChild(base);
    
    // 塔身
    const body = new pc.Entity('body');
    body.addComponent('render', {
      type: 'box',
      material: this.getTeamMaterial(team)
    });
    body.setLocalScale(0.8, 2, 0.8);
    body.setLocalPosition(0, 1.25, 0);
    tower.addChild(body);
    
    // 根據類型添加不同的炮塔
    let weapon;
    switch(type) {
      case 'cannon':
        weapon = this.createCannonWeapon();
        break;
      case 'laser':
        weapon = this.createLaserWeapon();
        break;
      case 'missile':
        weapon = this.createMissileWeapon();
        break;
      case 'slow':
        weapon = this.createSlowWeapon();
        break;
    }
    weapon.setLocalPosition(0, 2.5, 0);
    tower.addChild(weapon);
    
    // 添加塔的邏輯腳本
    tower.addComponent('script');
    tower.script.create('towerController', {
      attributes: {
        towerType: type,
        team: team,
        damage: this.getTowerDamage(type),
        range: this.getTowerRange(type),
        fireRate: this.getTowerFireRate(type),
        cost: this.getTowerCost(type)
      }
    });
    
    tower.setPosition(position);
    this.app.root.addChild(tower);
    
    return tower;
  }
  
  createCannonWeapon() {
    const cannon = new pc.Entity('cannon-weapon');
    cannon.addComponent('render', {
      type: 'cylinder',
      material: this.weaponMaterial
    });
    cannon.setLocalScale(0.3, 1, 0.3);
    cannon.setLocalRotation(new pc.Quat().setFromEulerAngles(90, 0, 0));
    return cannon;
  }
}

// 程式化創建怪物
class MonsterFactory extends Script {
  createMonster(type, pathIndex, team) {
    const monster = new pc.Entity(`monster-${type}-${Date.now()}`);
    
    // 怪物外觀
    let body;
    switch(type) {
      case 'basic':
        body = this.createBasicMonster();
        break;
      case 'fast':
        body = this.createFastMonster();
        break;
      case 'tank':
        body = this.createTankMonster();
        break;
      case 'flying':
        body = this.createFlyingMonster();
        break;
    }
    monster.addChild(body);
    
    // 物理組件
    monster.addComponent('collision', {
      type: 'capsule',
      radius: 0.5,
      height: 2
    });
    
    monster.addComponent('rigidbody', {
      type: 'kinematic'
    });
    
    // 怪物邏輯腳本
    monster.addComponent('script');
    monster.script.create('monsterController', {
      attributes: {
        monsterType: type,
        team: team,
        pathIndex: pathIndex,
        health: this.getMonsterHealth(type),
        speed: this.getMonsterSpeed(type),
        reward: this.getMonsterReward(type)
      }
    });
    
    // 設置起始位置
    const path = this.mapGenerator.paths[pathIndex];
    monster.setPosition(path[0]);
    
    this.app.root.addChild(monster);
    return monster;
  }
  
  createBasicMonster() {
    const body = new pc.Entity('body');
    body.addComponent('render', {
      type: 'capsule',
      material: this.monsterMaterial
    });
    return body;
  }
  
  createTankMonster() {
    const body = new pc.Entity('body');
    body.addComponent('render', {
      type: 'box',
      material: this.tankMaterial
    });
    body.setLocalScale(2, 2, 2);
    return body;
  }
}

// 發射物系統
class ProjectileFactory extends Script {
  createProjectile(type, startPos, target, damage) {
    const projectile = new pc.Entity(`projectile-${type}`);
    
    projectile.addComponent('render', {
      type: 'sphere',
      material: this.projectileMaterial
    });
    projectile.setLocalScale(0.2, 0.2, 0.2);
    
    projectile.addComponent('collision', {
      type: 'sphere',
      radius: 0.2
    });
    
    projectile.addComponent('rigidbody', {
      type: 'kinematic'
    });
    
    projectile.addComponent('script');
    projectile.script.create('projectileController', {
      attributes: {
        target: target,
        speed: 20,
        damage: damage,
        type: type
      }
    });
    
    projectile.setPosition(startPos);
    this.app.root.addChild(projectile);
    
    return projectile;
  }
}
```

### 技術挑戰
- 大量單位的同步（怪物、炮塔、發射物）
- 戰鬥邏輯的客戶端一致性
- 性能優化（大量實體）

---

## 實作優先級建議

根據開發難度和 SDK 功能利用程度，建議實作順序：

1. **🏁 多人競速賽車** - 中等難度，網路同步相對簡單
2. **🎲 派對小遊戲合集** - 可以逐個實作小遊戲，迭代開發
3. **🧩 協作解謎逃脫室** - 著重合作體驗，謎題可以簡單開始
4. **🎯 多人射擊競技場** - 需要處理擊中判定和延遲補償
5. **🏰 塔防對戰** - 最複雜，涉及大量單位和戰鬥邏輯

---

## 共通技術架構

所有遊戲設計都會使用以下共通架構：

### 程式化場景管理器
```javascript
class SceneManager extends Script {
  clearScene() {
    // 清除所有動態創建的實體
    const dynamicEntities = this.app.root.findByTag('dynamic');
    dynamicEntities.forEach(entity => entity.destroy());
  }
  
  loadGameScene(gameType, seed) {
    this.clearScene();
    
    switch(gameType) {
      case 'battle-arena':
        this.loadArena(seed);
        break;
      case 'racing':
        this.loadRaceTrack(seed);
        break;
      // ... 其他遊戲類型
    }
  }
}
```

### 網路狀態同步框架
```javascript
class NetworkSyncManager extends Script {
  initialize() {
    this.syncInterval = 0.05; // 20 Hz
    this.syncTimer = 0;
    this.interpolationBuffer = [];
  }
  
  update(dt) {
    this.syncTimer += dt;
    if (this.syncTimer >= this.syncInterval) {
      this.sendStateUpdate();
      this.syncTimer = 0;
    }
    
    this.interpolateRemoteStates(dt);
  }
}
```

### 隨機數生成器（確保一致性）
```javascript
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

## 下一步行動

1. **選擇一個遊戲方案**進行原型開發
2. **實作核心功能**：配對、玩家同步、基本遊戲邏輯
3. **測試多人體驗**：確保網路同步流暢
4. **迭代優化**：根據測試反饋調整
5. **擴展內容**：添加更多地圖、模式、功能

---

**文件版本**: 1.0  
**最後更新**: 2025年11月14日  
**狀態**: 待選擇方案進行開發
