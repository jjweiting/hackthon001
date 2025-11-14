import * as pc from "playcanvas";
import { Script } from "playcanvas";

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
    this.generate(initialSeed);
  }

  regenerate(seed) {
    this.cleanup();
    this.generate(seed);
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

  generate(seed) {
    this.seed = seed;
    const rng = new SeededRandom(seed);

    this.createFloor();
    this.createWalls();
    this.createObstacles(rng);
    this.createSpawnPoints();
    this.createWeaponBoxSpawns(rng);
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
}

