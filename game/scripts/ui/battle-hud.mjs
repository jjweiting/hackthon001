import { Script } from "playcanvas";

export class BattleHud extends Script {
  static scriptName = "battleHud";

  /**
   * @attribute
   * @title Health Text Entity
   * @type {entity}
   */
  healthText = null;

  /**
   * @attribute
   * @title Score Text Entity
   * @type {entity}
   */
  scoreText = null;

  /**
   * @attribute
   * @title Timer Text Entity
   * @type {entity}
   */
  timerText = null;

  initialize() {
    const managerEntity = this.app.root.findByTag("game-manager")[0];
    this.battleManager = managerEntity?.script?.battleGameManager ?? null;
  }

  update(dt) {
    if (!this.battleManager) return;

    const localPlayer = this.battleManager.localPlayer;
    const state = this.battleManager.gameState;

    if (this.healthText?.element && localPlayer) {
      const hp = Math.max(0, Math.floor(localPlayer.health));
      this.healthText.element.text = `HP: ${hp}`;
    }

    if (this.scoreText?.element && state) {
      this.scoreText.element.text = `A: ${state.teamA.score}  B: ${state.teamB.score}`;
    }

    if (this.timerText?.element && state) {
      let remaining = Math.max(
        0,
        Math.floor(this.battleManager.matchDuration - state.matchTime)
      );
      if (state.phase !== "playing") {
        this.timerText.element.text = "Waiting...";
      } else {
        const min = Math.floor(remaining / 60)
          .toString()
          .padStart(2, "0");
        const sec = (remaining % 60).toString().padStart(2, "0");
        this.timerText.element.text = `${min}:${sec}`;
      }
    }
  }
}

