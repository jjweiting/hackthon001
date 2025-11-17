import { Script } from "playcanvas";

export class WeaponPickup extends Script {
  static scriptName = "weaponPickup";

  /**
   * @attribute
   * @title Weapon Type
   * @type {string}
   * @enum [{"pistol":"pistol"},{"shotgun":"shotgun"},{"rifle":"rifle"},{"sniper":"sniper"},{"rocket":"rocket"}]
   */
  weaponType = "rifle";

  /**
   * @attribute
   * @title Spawn Index
   * @type {number}
   */
  spawnIndex = -1;

  initialize() {
    const managerEntity = this.app.root.findByTag("game-manager")[0];
    this.battleManager = managerEntity?.script?.battleGameManager ?? null;

    if (this.entity.collision && this.entity.collision.enabled) {
      this.entity.collision.on("triggerenter", this.onTriggerEnter, this);
    }

    this.on("destroy", () => {
      if (this.entity.collision) {
        this.entity.collision.off("triggerenter", this.onTriggerEnter, this);
      }
    });
  }

  onTriggerEnter(other) {
    if (!this.battleManager || !this.battleManager.network) return;

    // 僅本地玩家可以撿起：用 battleManager.localPlayer 的 entity 判斷，而不是 script 名稱
    const localPlayerEntity = this.battleManager.localPlayer?.entity;
    const root = other.getRoot ? other.getRoot() : other;
    const isLocalPlayer = localPlayerEntity && (other === localPlayerEntity || root === localPlayerEntity);
    if (!isLocalPlayer) {
      return;
    }

    const playerId = this.battleManager.network.sessionId;

    // 立即更新本地狀態
    if (this.battleManager.localPlayer) {
      this.battleManager.localPlayer.currentWeapon = this.weaponType;
    }

    // 廣播給其他玩家
    this.battleManager.network.sendMessage("weapon-pickup", {
      playerId,
      weaponType: this.weaponType,
      boxName: this.entity.name,
      spawnIndex: this.spawnIndex
    });

    console.log("[WeaponPickup] picked up", this.weaponType, "by", playerId);

    // 移除武器箱
    this.entity.destroy();
  }
}
