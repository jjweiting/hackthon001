import * as pc from "playcanvas";
import { Script } from "playcanvas";
import { WeaponPickup } from "./weapon-pickup.mjs";

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

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
  weaponBoxCount = 10;

  /**
   * @attribute
   * @title Seed
   * @type {number}
   */
  seed = 0;

  /**
   * @attribute
   * @title Enable Debug Markers
   * @type {boolean}
   */
  enableDebugMarkers = true;

  initialize() {
    this.generatedEntities = [];
    this.spawnPoints = { A: [], B: [] };
    this.weaponSpawnPoints = [];

    const initialSeed = this.seed || Date.now();
    this.generateStatic(initialSeed);
  }

  regenerate(seed) {
    this.cleanup();
    this.generateStatic(seed);
  }

  cleanup() {
    this.generatedEntities.forEach((entity) => {
      if (entity && !entity.destroyed) {
        entity.destroy();
      }
    });
    this.generatedEntities.length = 0;
    this.spawnPoints.A.length = 0;
    this.spawnPoints.B.length = 0;
    this.weaponSpawnPoints.length = 0;
  }

  /**
   * 僅產生「基礎競技場」：地板、外牆、出生點（與 debug marker）
   * 不產生障礙物與武器箱。
   */
  generateStatic(seed) {
    this.seed = seed;
    this.createFloor();
    this.createWalls();
    this.createSpawnPoints();
  }

  /**
   * 產生「動態物件」：障礙物、武器箱出生點與初始武器箱。
   * 通常在倒數結束時由 Room Host 呼叫，並搭配 exportMapConfig() 廣播給所有人。
   */
  generateDynamic(seed) {
    const useSeed = typeof seed === "number" ? seed : this.seed || Date.now();
    this.seed = useSeed;
    const rng = new SeededRandom(useSeed);
    this.createObstacles(rng);
    this.createWeaponBoxSpawns(rng);
    this.createInitialWeaponBoxes(rng);
  }

  generate(seed) {
    this.seed = seed;
    const rng = new SeededRandom(seed);

    this.createFloor();
    this.createWalls();
    this.createObstacles(rng);
    this.createSpawnPoints();
    this.createWeaponBoxSpawns(rng);
    this.createInitialWeaponBoxes(rng);
  }

  /**
   * 匯出目前場景的配置，供 Host 廣播給所有玩家用來重建地圖
   */
  exportMapConfig() {
    const obstacles = [];
    const weaponBoxes = [];

    this.generatedEntities.forEach((ent) => {
      if (!ent || ent.destroyed) return;

      if (ent.tags?.has("obstacle")) {
        const pos = ent.getPosition();
        const scale = ent.getLocalScale();
        const euler = ent.getEulerAngles();
        obstacles.push({
          type: ent.render?.type || "box",
          position: { x: pos.x, y: pos.y, z: pos.z },
          scale: { x: scale.x, y: scale.y, z: scale.z },
          rotationY: euler.y || 0
        });
      } else if (ent.tags?.has("weapon-box")) {
        const pos = ent.getPosition();
        const pickup = ent.script?.weaponPickup;
        weaponBoxes.push({
          name: ent.name,
          weaponType: pickup?.weaponType || "rifle",
          spawnIndex: pickup?.spawnIndex ?? -1,
          position: { x: pos.x, y: pos.y, z: pos.z }
        });
      }
    });

    const spawnPoints = {
      A: this.spawnPoints.A.map((v) => ({ x: v.x, y: v.y, z: v.z })),
      B: this.spawnPoints.B.map((v) => ({ x: v.x, y: v.y, z: v.z }))
    };

    return {
      obstacles,
      weaponBoxes,
      spawnPoints
    };
  }

  /**
   * 依照 Host 廣播的 mapConfig 重建場景，避免各端自己亂數生成造成不一致
   */
  generateFromConfig(mapConfig) {
    if (!mapConfig) return;

    this.cleanup();

    // 地板與外牆為固定結構，可直接重建
    this.createFloor();
    this.createWalls();

    // 重建 spawnPoints 與可視化 marker
    this.spawnPoints.A.length = 0;
    this.spawnPoints.B.length = 0;
    const cfgSpawns = mapConfig.spawnPoints || {};
    (cfgSpawns.A || []).forEach((p) => {
      const v = new pc.Vec3(p.x, p.y, p.z);
      this.spawnPoints.A.push(v);
    });
    (cfgSpawns.B || []).forEach((p) => {
      const v = new pc.Vec3(p.x, p.y, p.z);
      this.spawnPoints.B.push(v);
    });

    if (this.enableDebugMarkers) {
      this.spawnPoints.A.forEach((v, i) =>
        this.createSpawnMarker("A", i, v.x, v.z)
      );
      this.spawnPoints.B.forEach((v, i) =>
        this.createSpawnMarker("B", i, v.x, v.z)
      );
    }

    // 重建障礙物
    (mapConfig.obstacles || []).forEach((o, index) => {
      const obstacle = new pc.Entity(`arena-obstacle-${index}`);
      obstacle.addComponent("render", { type: o.type || "box" });

      const scale = o.scale || { x: 2, y: 2, z: 2 };
      obstacle.setLocalScale(scale.x, scale.y, scale.z);

      const pos = o.position || { x: 0, y: 1, z: 0 };
      obstacle.setPosition(pos.x, pos.y, pos.z);

      const rotY = o.rotationY || 0;
      obstacle.setRotation(
        new pc.Quat().setFromEulerAngles(0, rotY, 0)
      );

      obstacle.addComponent("collision", {
        type: o.type === "cylinder" ? "cylinder" : "box",
        halfExtents: new pc.Vec3(scale.x / 2, scale.y / 2, scale.z / 2)
      });
      obstacle.addComponent("rigidbody", {
        type: "static"
      });

      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.5, 0.5, 0.5);
      material.update();
      obstacle.render.material = material;

      obstacle.tags.add("dynamic", "arena", "obstacle");
      this.app.root.addChild(obstacle);
      this.generatedEntities.push(obstacle);
    });

    // 重建武器箱
    (mapConfig.weaponBoxes || []).forEach((w) => {
      const box = new pc.Entity(w.name || "weapon-box");
      box.addComponent("render", { type: "box" });
      box.setLocalScale(0.8, 0.8, 0.8);

      const pos = w.position || { x: 0, y: 1, z: 0 };
      box.setPosition(pos.x, pos.y, pos.z);

      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.9, 0.8, 0.1);
      material.emissive = material.diffuse;
      material.update();
      box.render.material = material;

      box.addComponent("collision", {
        type: "box",
        halfExtents: new pc.Vec3(0.4, 0.4, 0.4),
        axis: 1,
        isTrigger: true
      });

      box.tags.add("dynamic", "arena", "weapon-box");

      box.addComponent("script");
      const pickup = box.script.create(WeaponPickup);
      pickup.weaponType = w.weaponType || "rifle";
      pickup.spawnIndex = w.spawnIndex ?? -1;

      this.app.root.addChild(box);
      this.generatedEntities.push(box);
    });
  }

  createFloor() {
    const floor = new pc.Entity("arena-floor");
    floor.addComponent("render", {
      type: "box"
    });
    floor.setLocalScale(this.arenaSize, 1, this.arenaSize);
    floor.setPosition(0, -0.5, 0);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.2, 0.2, 0.2);
    material.update();
    floor.render.material = material;

    floor.addComponent("collision", {
      type: "box",
      halfExtents: new pc.Vec3(this.arenaSize / 2, 0.5, this.arenaSize / 2)
    });
    floor.addComponent("rigidbody", {
      type: "static"
    });

    floor.tags.add("dynamic", "arena", "floor");
    this.app.root.addChild(floor);
    this.generatedEntities.push(floor);
  }

  createWalls() {
    const halfSize = this.arenaSize / 2;
    const height = 6;
    const thickness = 1;

    const positions = [
      new pc.Vec3(0, height / 2, -halfSize),
      new pc.Vec3(0, height / 2, halfSize),
      new pc.Vec3(-halfSize, height / 2, 0),
      new pc.Vec3(halfSize, height / 2, 0)
    ];

    const scales = [
      new pc.Vec3(this.arenaSize, height, thickness),
      new pc.Vec3(this.arenaSize, height, thickness),
      new pc.Vec3(thickness, height, this.arenaSize),
      new pc.Vec3(thickness, height, this.arenaSize)
    ];

    for (let i = 0; i < positions.length; i++) {
      const wall = new pc.Entity(`arena-wall-${i}`);
      wall.addComponent("render", { type: "box" });
      wall.setLocalScale(scales[i]);
      wall.setPosition(positions[i]);

      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.3, 0.3, 0.35);
      material.update();
      wall.render.material = material;

      wall.addComponent("collision", {
        type: "box",
        halfExtents: new pc.Vec3(scales[i].x / 2, scales[i].y / 2, scales[i].z / 2)
      });
      wall.addComponent("rigidbody", {
        type: "static"
      });

      wall.tags.add("dynamic", "arena", "wall");
      this.app.root.addChild(wall);
      this.generatedEntities.push(wall);
    }
  }

  createObstacles(rng) {
    const halfSize = this.arenaSize / 2 - 4;

    for (let i = 0; i < this.obstacleCount; i++) {
      const obstacle = new pc.Entity(`arena-obstacle-${i}`);

      const typeIndex = Math.floor(rng.random() * 3);
      const type = typeIndex === 0 ? "box" : typeIndex === 1 ? "cylinder" : "wall";

      if (type === "cylinder") {
        obstacle.addComponent("render", { type: "cylinder" });
      } else {
        obstacle.addComponent("render", { type: "box" });
      }

      let scale;
      let height;
      switch (type) {
        case "box":
          scale = [4, 2, 4];
          height = 2;
          break;
        case "wall":
          scale = [4, 3, 1];
          height = 3;
          break;
        case "cylinder":
          scale = [1.5, 4, 1.5];
          height = 4;
          break;
        default:
          scale = [2, 2, 2];
          height = 2;
      }

      obstacle.setLocalScale(scale[0], scale[1], scale[2]);

      let x;
      let z;
      do {
        x = (rng.random() - 0.5) * halfSize * 2;
        z = (rng.random() - 0.5) * halfSize * 2;
      } while (Math.abs(x) < 10 && Math.abs(z) < 10);

      obstacle.setPosition(x, height / 2, z);
      obstacle.setRotation(new pc.Quat().setFromEulerAngles(0, rng.random() * 360, 0));

      obstacle.addComponent("collision", {
        type: type === "cylinder" ? "cylinder" : "box",
        halfExtents: new pc.Vec3(scale[0] / 2, scale[1] / 2, scale[2] / 2)
      });
      obstacle.addComponent("rigidbody", {
        type: "static"
      });

      const material = new pc.StandardMaterial();
      const colorOptions = [
        new pc.Color(0.6, 0.4, 0.3),
        new pc.Color(0.4, 0.4, 0.5),
        new pc.Color(0.5, 0.5, 0.4)
      ];
      material.diffuse = colorOptions[Math.floor(rng.random() * colorOptions.length)];
      material.update();
      obstacle.render.material = material;

      obstacle.tags.add("dynamic", "arena", "obstacle");
      this.app.root.addChild(obstacle);
      this.generatedEntities.push(obstacle);
    }
  }

  createSpawnPoints() {
    const spawnHeight = 2;
    const spacing = 3;

    for (let i = 0; i < 4; i++) {
      const x = -20;
      const z = (i - 1.5) * spacing;
      this.spawnPoints.A.push(new pc.Vec3(x, spawnHeight, z));
      if (this.enableDebugMarkers) {
        this.createSpawnMarker("A", i, x, z);
      }
    }

    for (let i = 0; i < 4; i++) {
      const x = 20;
      const z = (i - 1.5) * spacing;
      this.spawnPoints.B.push(new pc.Vec3(x, spawnHeight, z));
      if (this.enableDebugMarkers) {
        this.createSpawnMarker("B", i, x, z);
      }
    }
  }

  createSpawnMarker(team, index, x, z) {
    const marker = new pc.Entity(`spawn-${team}-${index}`);
    marker.addComponent("render", {
      type: "cylinder",
      castShadows: false
    });
    marker.setLocalScale(1, 0.1, 1);
    marker.setPosition(x, 0.6, z);

    const material = new pc.StandardMaterial();
    material.diffuse = team === "A" ? new pc.Color(0, 0.5, 1) : new pc.Color(1, 0.5, 0);
    material.emissive = material.diffuse;
    material.update();
    marker.render.material = material;

    marker.tags.add("dynamic", "arena", "spawn-marker");
    this.app.root.addChild(marker);
    this.generatedEntities.push(marker);
  }

  createWeaponBoxSpawns(rng) {
    const halfSize = this.arenaSize / 2 - 5;

    for (let i = 0; i < this.weaponBoxCount; i++) {
      const x = (rng.random() - 0.5) * halfSize * 2;
      const z = (rng.random() - 0.5) * halfSize * 2;

      this.weaponSpawnPoints.push({
        position: new pc.Vec3(x, 1, z),
        occupied: false,
        entity: null
      });
    }
  }

  createInitialWeaponBoxes(rng) {
    const weaponTypes = ["shotgun", "rifle", "sniper", "rocket"];

    this.weaponSpawnPoints.forEach((spawn, index) => {
      if (rng.random() > 0.5) {
        const weaponType =
          weaponTypes[Math.floor(rng.random() * weaponTypes.length)];
        this.spawnWeaponBox(index, weaponType);
      }
    });
  }

  spawnWeaponBox(spawnIndex, weaponType) {
    const spawn = this.weaponSpawnPoints[spawnIndex];
    if (!spawn || spawn.occupied) return;

    const box = new pc.Entity(`weapon-box-${spawnIndex}`);
    box.addComponent("render", {
      type: "box"
    });
    box.setLocalScale(0.8, 0.8, 0.8);
    box.setPosition(spawn.position);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.9, 0.8, 0.1);
    material.emissive = material.diffuse;
    material.update();
    box.render.material = material;

    box.addComponent("collision", {
      type: "box",
      halfExtents: new pc.Vec3(0.4, 0.4, 0.4),
      axis: 1,
      isTrigger: true
    });

    box.tags.add("dynamic", "arena", "weapon-box");

    box.addComponent("script");
    const pickup = box.script.create(WeaponPickup);
    pickup.weaponType = weaponType;
    pickup.spawnIndex = spawnIndex;

    this.app.root.addChild(box);

    spawn.occupied = true;
    spawn.entity = box;
  }
}
