import * as pc from "playcanvas";
import { VrmAvatar, PlayerNameTag } from "@viverse/local-player";
import { ViverseApp } from "@viverse/core";

// Conversion tables for animation parameters
const integerToHorizontalDir = {
  0: "stop",
  1: "forward",
  2: "backward",
  3: "strafeLeft",
  4: "strafeRight",
  5: "forwardDiagonalLeft",
  6: "forwardDiagonalRight",
  7: "backwardDiagonalLeft",
  8: "backwardDiagonalRight",
};

const integerToVerticalState = {
  1: "up",
  0: "neutral",
  "-1": "down",
};

export class RemotePlayerAvatar extends pc.Script {
  static scriptName = "remotePlayerAvatar";

  /**
   * @attribute
   * @type {string}
   */
  avatarUrl = "";

  /**
   * @attribute
   * @type {string}
   */
  displayName = "";

  initialize() {
    const managerEntity = this.app.root.findByTag("game-manager")[0];
    this.gameManager = managerEntity ? managerEntity.script.gameManager : null;
    if (this.gameManager == null) {
      console.error("Game Manager not found for LocalPlayerNetwork script.");
      return;
    }

    this.avatar = null;
    this.nameTag = null;
    this.nameTagHeight = 2.2; // Default height for name tag positioning
    this.viverseApp = ViverseApp.getApplication();

    // Track previous animation parameters to avoid unnecessary updates
    this.previousAnimationParams = {
      isFalling: null,
      isFlying: null,
      isGrounded: null,
      isSprinting: null,
      jump: null,
      horizontalDir: null,
      verticalState: null,
    };

    this.createNameTag();

    if (this.avatarUrl) this.loadAvatar(this.avatarUrl);

    this.entity.on("update-profile", this.updateProfile, this);
    this.entity.on("update-animation", this.updateAnimation, this);

    this.on("destroy", () => {
      this.entity.off("update-profile", this.updateProfile, this);
      this.entity.off("update-animation", this.updateAnimation, this);
    });
  }

  updateProfile(data) {
    const { profile } = data;

    if (profile.avatarUrl && profile.avatarUrl !== this.avatarUrl) {
      this.avatarUrl = profile.avatarUrl;
      this.loadAvatar(this.avatarUrl);
    }

    if (profile.displayName && profile.displayName !== this.displayName) {
      this.displayName = profile.displayName;
      this.updateNameTagText();
    }

    if (profile.nameTagHeight && profile.nameTagHeight !== this.nameTagHeight) {
      this.nameTagHeight = profile.nameTagHeight;
      if (this.nameTag) this.nameTag.updateHeight(this.nameTagHeight);
    }
  }

  updateAnimation(data) {
    const { animationParams } = data;

    if (!this.avatar) return;

    // Only update parameters that have changed
    if (this.previousAnimationParams.isFalling !== animationParams.isFalling) {
      this.avatar.setFalling(animationParams.isFalling);
      this.previousAnimationParams.isFalling = animationParams.isFalling;
    }

    if (this.previousAnimationParams.isFlying !== animationParams.isFlying) {
      this.avatar.setFlying(animationParams.isFlying);
      this.previousAnimationParams.isFlying = animationParams.isFlying;
    }

    if (
      this.previousAnimationParams.isGrounded !== animationParams.isGrounded
    ) {
      this.avatar.setGrounded(animationParams.isGrounded);
      this.previousAnimationParams.isGrounded = animationParams.isGrounded;
    }

    if (
      this.previousAnimationParams.isSprinting !== animationParams.isSprinting
    ) {
      this.avatar.setSprinting(animationParams.isSprinting);
      this.previousAnimationParams.isSprinting = animationParams.isSprinting;
    }

    if (this.previousAnimationParams.jump !== animationParams.jump) {
      if (animationParams.jump) this.avatar.jump();
      this.previousAnimationParams.jump = animationParams.jump;
    }

    if (
      this.previousAnimationParams.horizontalDir !==
      animationParams.horizontalDir
    ) {
      // Convert integer to direction enum if needed
      const direction =
        integerToHorizontalDir[animationParams.horizontalDir] ||
        animationParams.horizontalDir;
      this.avatar.setHorizontalDirection(direction);
      this.previousAnimationParams.horizontalDir =
        animationParams.horizontalDir;
    }

    if (
      this.previousAnimationParams.verticalState !==
      animationParams.verticalState
    ) {
      // Convert integer to vertical state enum if needed
      const state =
        integerToVerticalState[animationParams.verticalState] ||
        animationParams.verticalState;
      this.avatar.setVerticalState(state);
      this.previousAnimationParams.verticalState =
        animationParams.verticalState;
    }
  }

  createNameTag() {
    PlayerNameTag.create(this.app, {
      text: this.displayName || "Remote Player",
      entityName: `NameTag_${this.entity.name}`,
    }).then((nameTag) => {
      this.nameTag = nameTag;
      this.nameTag.setup(this.entity, this.nameTagHeight);
    });
  }

  updateNameTagText() {
    if (this.nameTag && this.displayName) {
      this.nameTag.setText(this.displayName);
    }
  }

  async loadAvatar(avatarUrl) {
    this.avatar = new VrmAvatar({
      name: this.displayName || "Remote Player",
      avatarUrl,
    });

    window.avatar = this.avatar;

    const avatarEntity = await this.avatar.create(this.app);
    this.entity.addChild(avatarEntity);
  }

  update(dt) {
    if (this.nameTag) {
      const states = this.viverseApp?.systems.localPlayer?.store.getState();
      const viewPosition = states?.viewPosition;
      if (viewPosition) this.nameTag.updateViewPosition(viewPosition);
    }
  }
}
