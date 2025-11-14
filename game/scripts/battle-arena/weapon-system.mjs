import { Script } from "playcanvas";

export class WeaponSystem extends Script {
  static scriptName = "weaponSystem";

  /**
   * @attribute
   * @title Default Weapon
   * @type {string}
   */
  defaultWeapon = "pistol";

  initialize() {
    this.weapons = {
      pistol: {
        name: "Pistol",
        damage: 15,
        fireRate: 0.4,
        range: 60
      },
      shotgun: {
        name: "Shotgun",
        damage: 8,
        pellets: 6,
        fireRate: 0.9,
        range: 25
      },
      rifle: {
        name: "Rifle",
        damage: 20,
        fireRate: 0.25,
        range: 70
      },
      sniper: {
        name: "Sniper",
        damage: 60,
        fireRate: 1.2,
        range: 120
      },
      rocket: {
        name: "Rocket Launcher",
        damage: 80,
        splashRadius: 4,
        fireRate: 1.5,
        range: 80
      }
    };
  }

  getWeaponConfig(type) {
    return this.weapons[type] || this.weapons[this.defaultWeapon];
  }
}

