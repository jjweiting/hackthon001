import * as pc from "playcanvas";
import { Script } from "playcanvas";
import { WeaponSystem } from "./weapon-system.mjs";

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
    this.rayStartOffset = new pc.Vec3(0, 1.6, 0);

    this.weaponSystem = this.entity.script?.weaponSystem;
    if (!this.weaponSystem) {
      this.entity.script.create(WeaponSystem);
      this.weaponSystem = this.entity.script.weaponSystem;
    }
  }

  update(dt) {
    if (!this.battleManager || !this.battleManager.network) {
      return;
    }

    if (this.app.mouse.isPressed(pc.MOUSEBUTTON_LEFT)) {
      this.tryFire();
    }
  }

  tryFire() {
    const localPlayer = this.battleManager.localPlayer;
    if (!localPlayer || !localPlayer.isAlive) return;

    const now = this.app.clock.now();
    const weaponConfig = this.weaponSystem.getWeaponConfig(localPlayer.currentWeapon);
    const fireInterval = weaponConfig.fireRate;

    if (now - this.lastShotTime < fireInterval) return;
    this.lastShotTime = now;

    const from = this.entity.getPosition().clone().add(this.rayStartOffset);
    const forward = this.entity.forward.clone().normalize();
    const to = from.clone().add(forward.mulScalar(weaponConfig.range));

    const result = this.app.systems.rigidbody.raycastFirst(from, to);

    if (result && result.entity) {
      const targetEntity = result.entity;
      const targetId = targetEntity?.script?.remotePlayerNetwork?.sessionId;
      if (targetId && this.battleManager.network) {
        this.battleManager.network.sendMessage("player-hit", {
          targetId,
          damage: weaponConfig.damage,
          shooterId: this.battleManager.network.sessionId
        });
      }
    }

    if (this.battleManager.network) {
      this.battleManager.network.sendMessage("player-shoot", {
        playerId: this.battleManager.network.sessionId,
        direction: forward,
        weaponType: localPlayer.currentWeapon,
        position: from
      });
    }
  }
}
