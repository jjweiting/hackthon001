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

    // 若在 Editor 沒有手動綁定屬性，則自動用子節點名稱尋找
    if (!this.healthText) {
      this.healthText = this.entity.findByName("HealthText");
    }
    if (!this.scoreText) {
      this.scoreText = this.entity.findByName("ScoreText");
    }
    if (!this.timerText) {
      this.timerText = this.entity.findByName("TimerText");
    }

    // 把三個文字元素放大並置中堆疊，確保看得見
    this._setupCenteredText(this.healthText, 60, 40);
    this._setupCenteredText(this.scoreText, 48, 0);
    this._setupCenteredText(this.timerText, 48, -40);

    this._loggedFirstUpdate = false;

    console.log("[BattleHud] initialize", {
      entityName: this.entity?.name,
      hasBattleManager: !!this.battleManager,
      healthTextName: this.healthText?.name,
      scoreTextName: this.scoreText?.name,
      timerTextName: this.timerText?.name
    });
  }

  _setupCenteredText(entity, fontSize, offsetY) {
    if (!entity || !entity.element) return;

    const el = entity.element;
    el.enabled = true;
    el.fontSize = fontSize;
    el.color.set(1, 1, 1); // 白色
    el.opacity = 1;

    // 置中 anchor / pivot
    el.anchor.set(0.5, 0.5, 0.5, 0.5);
    el.pivot.set(0.5, 0.5);

    // 以畫面中心為基準，上下堆疊
    entity.setLocalPosition(0, offsetY, 0);
  }

  update(dt) {
    if (!this.battleManager) {
      if (!this._loggedFirstUpdate) {
        console.warn("[BattleHud] No BattleGameManager found (check game-manager tag on GameManager entity)");
        this._loggedFirstUpdate = true;
      }
      return;
    }

    if (!this._loggedFirstUpdate) {
      console.log("[BattleHud] first update tick", {
        hasHealthText: !!this.healthText,
        hasScoreText: !!this.scoreText,
        hasTimerText: !!this.timerText
      });
      this._loggedFirstUpdate = true;
    }

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
