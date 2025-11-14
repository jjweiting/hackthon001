import { Script } from "playcanvas";

export class HealthSystem extends Script {
  static scriptName = "healthSystem";

  /**
   * @attribute
   * @title Max Health
   * @type {number}
   */
  maxHealth = 100;

  initialize() {
    this.currentHealth = this.maxHealth;
  }

  applyDamage(amount) {
    this.currentHealth -= amount;
    if (this.currentHealth < 0) {
      this.currentHealth = 0;
    }

    this.entity.fire("health:changed", this.currentHealth);

    if (this.currentHealth <= 0) {
      this.entity.fire("health:dead");
    }
  }

  resetHealth() {
    this.currentHealth = this.maxHealth;
    this.entity.fire("health:changed", this.currentHealth);
  }
}

