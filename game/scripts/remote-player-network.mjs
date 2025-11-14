import * as pc from "playcanvas";

export class RemotePlayerNetwork extends pc.Script {
  static scriptName = "remotePlayerNetwork";

  initialize() {
    const managerEntity = this.app.root.findByTag("game-manager")[0];
    this.gameManager = managerEntity ? managerEntity.script.gameManager : null;
    if (this.gameManager == null) {
      console.error("Game Manager not found for LocalPlayerNetwork script.");
      return;
    }

    const currentPosition = this.entity.getPosition();
    const currentRotation = this.entity.getRotation();

    this.targetPosition = currentPosition.clone();
    this.targetRotation = currentRotation.clone();
    this.currentPosition = currentPosition.clone();
    this.currentRotation = currentRotation.clone();

    this.lerpSpeed = 5;
    this.rotationLerpSpeed = 10;
    this.teleportThreshold = 5.0;

    this.entity.on("update-transform", this.updateTransform, this);

    this.on("destroy", () => {
      this.entity.off("update-transform", this.updateTransform, this);
    });
  }

  updateTransform(transform) {
    if (transform.position) this.updatePosition(transform.position);
    if (transform.rotation) this.updateRotation(transform.rotation);
  }

  updatePosition(position) {
    this.targetPosition.set(position.x, position.y, position.z);
  }

  updateRotation(rotation) {
    this.targetRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  update(dt) {
    // Smoothly interpolate position
    if (this.targetPosition) {
      const distance = this.currentPosition.distance(this.targetPosition);

      if (distance > this.teleportThreshold) {
        this.currentPosition.copy(this.targetPosition);
        this.entity.setPosition(this.currentPosition);
      } else if (distance > 0.01) {
        this.currentPosition.lerp(
          this.currentPosition,
          this.targetPosition,
          Math.min(this.lerpSpeed * dt, 1.0)
        );
        this.entity.setPosition(this.currentPosition);
      } else {
        this.currentPosition.copy(this.targetPosition);
        this.entity.setPosition(this.currentPosition);
      }
    }

    // Smoothly interpolate rotation
    if (this.targetRotation) {
      this.currentRotation.slerp(
        this.currentRotation,
        this.targetRotation,
        Math.min(this.rotationLerpSpeed * dt, 1.0)
      );

      this.entity.setRotation(this.currentRotation);
    }
  }
}
