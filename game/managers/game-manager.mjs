import { Script } from "playcanvas";
import { ViverseApp } from "@viverse/core";
import NetworkManager from "./network-manager.mjs";

/**
 * The {@link https://api.playcanvas.com/classes/Engine.Script.html | Script} class is
 * the base class for all PlayCanvas scripts. Learn more about writing scripts in the
 * {@link https://developer.playcanvas.com/user-manual/scripting/ | scripting guide}.
 */
export class GameManager extends Script {
  static scriptName = "gameManager"; 

  /**
   * @attribute
   * @title VIVERSE App Id
   * @type {string}
   */
  appId = "";

  /**
   * @attribute
   * @title Debug Mode
   * @type {boolean}
   */
  debug = false;

  initialize() {
    window.game = this;
    this.entity.tags.add("game-manager");
    this.viverseApp = ViverseApp.getApplication();
    this.network = new NetworkManager(this.viverseApp, this.app, this.appId, this.debug);
    this.network.enterLobby();
  }
}
