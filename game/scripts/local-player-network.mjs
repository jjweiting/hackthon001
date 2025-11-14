import * as pc from "playcanvas";
import { ViverseApp } from "@viverse/core";

export class LocalPlayerNetwork extends pc.Script {
  static scriptName = "localPlayerNetwork";

  timer = 0;
  sendInterval = 0.1; // seconds
  idleTime = 0.5; // seconds
  movingTime = 0.05; // seconds

  currentPosition = new pc.Vec3();
  currentRotation = new pc.Quat();

  // Add animation parameter tracking
  previousAnimParams = {
    horizontalDir: null,
    horizontalDirChanged: null,
    isFalling: null,
    isFlying: null,
    isGrounded: null,
    isSprinting: null,
    jump: null,
    verticalState: null,
    verticalStateChanged: null,
  };

  initialize() {
    
    const managerEntity = this.app.root.findByTag("game-manager")[0];
    this.gameManager = managerEntity ? managerEntity.script.gameManager : null;
    if (this.gameManager == null) {
      console.error("Game Manager not found for LocalPlayerNetwork script.");
      return;
    }

    this.viverseApp = ViverseApp.getApplication();
    this.currentPosition.copy(this.entity.getPosition());
    this.currentRotation.copy(this.entity.getRotation());

    window.addEventListener("beforeunload", async () => {
      this.entity.destroy();
      this.gameManager.network.sendMessage("actor-leave-channel");
    });
  }

  sendPlayerTransform() {
    const position = this.entity.getPosition();
    const rotation = this.getAvatarRotation() || this.entity.getRotation();

    this.gameManager.network.sendMessage("transform-update", {
      profile: this.getPlayerInfo(),
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w,
      },
    });
  }

  sendPlayerAnimation(animationParams) {
    this.gameManager.network.sendMessage("animation-update", {
      animationParams,
    });
  }

  getAvatarRotation() {
    const localAvatar =
      this.viverseApp?.systems.localPlayer?.modules?.localAvatar;
    if (
      localAvatar &&
      localAvatar.activeAvatar &&
      localAvatar.activeAvatar.entity
    ) {
      return localAvatar.activeAvatar.entity.getRotation();
    }
  }

  getPlayerInfo() {
    const profile = this.viverseApp.context.profile.getState();
    const targetAvatar =
      this.viverseApp?.systems.localPlayer?.modules?.localAvatar?.activeAvatar;

    const offset = 0.25;
    const height = targetAvatar
      ? targetAvatar.boundingBox.halfExtents.y * 2 + offset
      : 2.2;

    if (profile) {
      return {
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        nameTagHeight: height,
      };
    }
  }

  getAnimationState() {
    const targetAvatar =
      this.viverseApp?.systems.localPlayer?.modules?.localAvatar?.activeAvatar;
    const entity = targetAvatar?.entity;
    if (entity) {
      return entity.anim?.baseLayer.activeState;
    }
  }

  checkAnimationParameters() {
    const targetAvatar =
      this.viverseApp?.systems.localPlayer?.modules?.localAvatar?.activeAvatar;
    const entity = targetAvatar?.entity;

    if (!entity || !entity.anim || !entity.anim.parameters) {
      return;
    }

    const parameters = entity.anim.parameters;
    const paramNames = [
      "horizontalDir",
      "horizontalDirChanged",
      "isFalling",
      "isFlying",
      "isGrounded",
      "isSprinting",
      "jump",
      "verticalState",
      "verticalStateChanged",
    ];

    let hasChanged = false;
    const currentParams = {};

    paramNames.forEach((paramName) => {
      if (parameters[paramName]) {
        const currentValue = parameters[paramName].value;
        currentParams[paramName] = currentValue;

        if (this.previousAnimParams[paramName] !== currentValue) {
          hasChanged = true;
        }
      }
    });

    if (hasChanged) {
      this.sendPlayerAnimation(currentParams);
      this.previousAnimParams = { ...currentParams };
    }
  }

  update(dt) {
    const position = this.entity.getPosition();
    const rotation = this.getAvatarRotation() || this.entity.getRotation();

    const needUpdate =
      !this.currentPosition.equalsApprox(position) ||
      !this.currentRotation.equalsApprox(rotation);
    this.sendInterval = needUpdate ? this.movingTime : this.idleTime;

    this.currentPosition.copy(position);
    this.currentRotation.copy(rotation);

    // Check animation parameters for changes
    this.checkAnimationParameters();

    this.timer += dt;
    if (this.timer >= this.sendInterval) {
      this.timer = 0;
      this.sendPlayerTransform();
    }
  }
}
