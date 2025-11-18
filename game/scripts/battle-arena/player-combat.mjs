import * as pc from "playcanvas";
import { Script } from "playcanvas";
import { WeaponSystem } from "./weapon-system.mjs";
import { ViverseApp } from "@viverse/core";

export class PlayerCombat extends Script {
  static scriptName = "playerCombat";

  /**
   * @attribute
   * @title Battle Manager
   * @type {entity}
   */
  battleManager = null;

  /**
   * @attribute
   * @title Fire Button
   * @type {string}
   */
  fireButton = "mouse0";

  initialize() {
    this.lastShotTime = 0;
    this.rayStartOffset = new pc.Vec3(0, 0, 0);

    this.viverseApp = ViverseApp.getApplication();

    this.weaponSystem = this.entity.script?.weaponSystem;
    if (!this.weaponSystem) {
      this.entity.script.create(WeaponSystem);
      this.weaponSystem = this.entity.script.weaponSystem;
    }

    this._avatarLogged = false;
    this._rightHand = null;
  }

  update(dt) {
    if (
      !this.battleManager ||
      !this.battleManager.network ||
      this.battleManager.gameState?.phase !== "playing"
    ) {
      return;
    }

    // 只在「按下當下」觸發射擊，不允許長按連發
    if (this.app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
      this.tryFire();
    }
  }

  tryFire() {
    const localPlayer = this.battleManager.localPlayer;
    if (!localPlayer || !localPlayer.isAlive) return;

    const now = this.app.time; // time in seconds since app start
    const weaponConfig = this.weaponSystem.getWeaponConfig(localPlayer.currentWeapon);
    const fireInterval = weaponConfig.fireRate;

    if (now - this.lastShotTime < fireInterval) return;
    this.lastShotTime = now;

    const from = this._getShootOrigin();
    const forward = this._getShootDirection();
    const to = from.clone().add(forward.mulScalar(weaponConfig.range));

    // Debug: 印出本地 Avatar 與射線資訊，協助確認碰撞判斷
    const localAvatar =
      this.viverseApp?.systems?.localPlayer?.modules?.localAvatar;
    const activeAvatar = localAvatar?.activeAvatar;
    const avatarEntity = activeAvatar?.entity;
    if (avatarEntity) {
      console.log("[PlayerCombat] local avatar & shoot", {
        avatarPos: avatarEntity.getPosition().clone(),
        shootFrom: from.clone(),
        shootDir: forward.clone(),
        range: weaponConfig.range
      });
    } else {
      console.log("[PlayerCombat] no avatar entity, shoot info", {
        shootFrom: from.clone(),
        shootDir: forward.clone(),
        range: weaponConfig.range
      });
    }

    // 簡化：不用物理 raycast，直接用幾何計算射線到遠端玩家位置的最近距離
    const dir = forward.clone().normalize();
    const maxDist = weaponConfig.range;
    const candidates = this.battleManager.network?.actorEntityMap || new Map();

    let closestId = null;
    let closestDist = Number.MAX_VALUE;
    const hitRadius = 1.1; // 視覺上玩家半徑，略大一點方便命中

    for (const [sessionId, ent] of candidates.entries()) {
      if (!ent || ent.destroyed) continue;
      // 跳過自己（actorEntityMap 通常只放遠端，但保險檢查）
      if (sessionId === this.battleManager.network.sessionId) continue;

      const pos = ent.getPosition().clone();
      const v = pos.clone().sub(from);
      const t = Math.max(0, Math.min(maxDist, v.dot(dir))); // 射線上對應距離
      const closestPoint = from.clone().add(dir.clone().mulScalar(t));
      const dist = closestPoint.distance(pos);

      console.log("[PlayerCombat] geom candidate", {
        sessionId,
        entityName: ent.name,
        playerPos: pos,
        closestPoint,
        dist
      });

      if (dist <= hitRadius && dist < closestDist) {
        closestDist = dist;
        closestId = sessionId;
      }
    }

    if (closestId && this.battleManager.network) {
      console.log("[PlayerCombat] geom hit remote player", {
        targetId: closestId,
        damage: weaponConfig.damage
      });

      this.battleManager.network.sendMessage("player-hit", {
        targetId: closestId,
        damage: weaponConfig.damage,
        shooterId: this.battleManager.network.sessionId
      });
    } else {
      console.log("[PlayerCombat] miss (no geom hit)");
    }

    if (this.battleManager.network) {
      this.battleManager.network.sendMessage("player-shoot", {
        playerId: this.battleManager.network.sessionId,
        direction: { x: forward.x, y: forward.y, z: forward.z },
        weaponType: localPlayer.currentWeapon,
        position: { x: from.x, y: from.y, z: from.z }
      });
    }

    // 本地玩家也顯示射擊光束
    if (typeof this.battleManager.createShootEffect === "function") {
      this.battleManager.createShootEffect(
        { x: from.x, y: from.y, z: from.z },
        { x: forward.x, y: forward.y, z: forward.z },
        localPlayer.currentWeapon
      );
    }

    console.log("[PlayerCombat] shoot", {
      weapon: localPlayer.currentWeapon,
      from,
      to
    });
  }

  _getShootDirection() {
    // 優先使用 Avatar 的朝向（角色眼前方向）
    const localAvatar =
      this.viverseApp?.systems?.localPlayer?.modules?.localAvatar;
    const activeAvatar = localAvatar?.activeAvatar;
    const avatarEntity = activeAvatar?.entity;

    if (avatarEntity) {
      const rot = avatarEntity.getRotation();
      const dir = new pc.Vec3(0, 0, -1);
      rot.transformVector(dir, dir);
      return dir.normalize();
    }

    // fallback: 使用當前 entity 的 forward
    return this.entity.forward.clone().normalize();
  }

  _getShootOrigin() {
    // 優先使用 Avatar 右手骨骼位置
    const localAvatar =
      this.viverseApp?.systems?.localPlayer?.modules?.localAvatar;
    const activeAvatar = localAvatar?.activeAvatar;
    const avatarEntity = activeAvatar?.entity;

    if (avatarEntity) {
      // 首次射擊時，印出 Avatar Hierarchy，方便查名稱
      if (!this._avatarLogged) {
        this._logAvatarHierarchy(avatarEntity);
        this._avatarLogged = true;
      }

      // 搜尋並快取右手骨骼
      if (!this._rightHand) {
        this._rightHand = this._findRightHandBone(avatarEntity);
        if (this._rightHand) {
          console.log("[PlayerCombat] Found right hand bone:", this._rightHand.name);
        } else {
          console.warn("[PlayerCombat] Right hand bone not found, fallback to avatar center.");
        }
      }

      if (this._rightHand) {
        return this._rightHand.getPosition().clone();
      }

      // 找不到手骨時，使用 Avatar 中心略往前一點
      const pos = avatarEntity.getPosition().clone();
      const dir = this._getShootDirection();
      return pos.add(dir.mulScalar(0.3));
    }

    // 再退一步用 player entity 位置
    return this.entity.getPosition().clone().add(this.rayStartOffset);
  }

  _logAvatarHierarchy(root) {
    console.log("[PlayerCombat] Avatar root:", root.name);

    const stack = [{ ent: root, depth: 0 }];
    const maxDepth = 4;

    while (stack.length > 0) {
      const { ent, depth } = stack.pop();
      if (depth > maxDepth) continue;

      const indent = "  ".repeat(depth);
      console.log(`[PlayerCombat] Avatar node: ${indent}${ent.name}`);

      const children = ent.children || [];
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ ent: children[i], depth: depth + 1 });
      }
    }
  }

  _findRightHandBone(root) {
    const stack = [root];
    while (stack.length > 0) {
      const ent = stack.pop();
      const name = ent.name || "";
      const lower = name.toLowerCase();

      // 嘗試用名稱判斷右手骨：包含 "righthand" 或 同時有 "right" 和 "hand"
      if (lower.includes("righthand") || (lower.includes("right") && lower.includes("hand"))) {
        return ent;
      }

      const children = ent.children || [];
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
    return null;
  }
}
