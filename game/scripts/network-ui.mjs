import * as pc from "playcanvas"

export class NetworkUI extends pc.Script {
  static scriptName = "networkUI"; 

  /**
   * @attribute
   * @type {number}
   */
  maxPlayer = 4;

  /**
   * @attribute
   * @type {number}
   */
  minPlayer = 1;

  initialize() {
    const managerEntity = this.app.root.findByTag("game-manager")[0];
    const gameManager = managerEntity ? managerEntity.script.gameManager : null;
    if (gameManager == null) {
      console.error("Game Manager not found for LocalPlayerNetwork script.");
      return;
    }

    this.networkManager = gameManager.network;
    this.uiContainer = null;
    this.toggleButton = null;
    this.roomListContainer = null;
    this.currentRoomInfo = null;
    this.isUIVisible = true;
    this.createToggleButton();
    this.createUI();
    this.addEventListeners();
  }

  createUI() {
    // Add CSS for responsive design
    this.addResponsiveCSS();

    // Create main UI container
    this.uiContainer = document.createElement("div");
    this.uiContainer.id = "network-ui";
    this.uiContainer.className = "network-ui-container";

    // Current Room Info
    this.currentRoomInfo = document.createElement("div");
    this.currentRoomInfo.style.cssText =
      "margin-bottom: 15px; padding: 8px; background: #021542; border-radius: 4px; border: 1px solid #0241e2;";
    this.uiContainer.appendChild(this.currentRoomInfo);

    this.uiContainer.addEventListener("wheel", (e) => {
      e.stopPropagation();
    });

    this.uiContainer.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    // Room Creation Section
    this.createRoomSection();

    // Room List Section
    this.createRoomListSection();

    // Debug Info
    this.createDebugSection();

    document.body.appendChild(this.uiContainer);
  }

  createRoomSection() {
    const roomSection = document.createElement("div");
    roomSection.style.cssText =
      "margin-bottom: 15px; padding: 10px; background: #021542; border-radius: 4px; border: 1px solid #0241e2;";

    const roomTitle = document.createElement("h4");
    roomTitle.textContent = "Room Management";
    roomTitle.style.cssText = "margin: 0 0 10px 0; color: #ffffff;";
    roomSection.appendChild(roomTitle);

    // Room name input
    const roomNameInput = document.createElement("input");
    roomNameInput.type = "text";
    roomNameInput.placeholder = "Room name";
    roomNameInput.id = "room-name-input";
    roomNameInput.style.cssText =
      "width: 100%; padding: 5px; margin-bottom: 8px; border: 1px solid #0241e2; border-radius: 3px; background: #000000; color: white;";
    roomSection.appendChild(roomNameInput);
    roomNameInput.addEventListener("keydown", (e) => e.stopPropagation());

    // Create room button
    const createRoomBtn = document.createElement("button");
    createRoomBtn.textContent = "Create Room";
    createRoomBtn.style.cssText =
      "width: 48%; padding: 8px; margin-right: 4%; background: #0241e2; color: white; border: none; border-radius: 3px; cursor: pointer;";
    createRoomBtn.onclick = () => this.createRoom();
    roomSection.appendChild(createRoomBtn);

    // Leave room button
    const leaveRoomBtn = document.createElement("button");
    leaveRoomBtn.textContent = "Leave Room";
    leaveRoomBtn.id = "leave-room-btn";
    leaveRoomBtn.style.cssText =
      "width: 48%; padding: 8px; background: #ff534b; color: white; border: none; border-radius: 3px; cursor: pointer; opacity: 0.5;";
    leaveRoomBtn.disabled = true;
    leaveRoomBtn.onclick = () => this.leaveRoom();
    roomSection.appendChild(leaveRoomBtn);

    // Start Game button
    const startGameBtn = document.createElement("button");
    startGameBtn.textContent = "Start Game";
    startGameBtn.id = "start-game-btn";
    startGameBtn.style.cssText =
      "width: 100%; padding: 8px; margin-top: 8px; background: #ff534b; color: white; border: none; border-radius: 3px; cursor: pointer; opacity: 0.5;";
    startGameBtn.disabled = true;
    startGameBtn.onclick = () => this.startGame();
    roomSection.appendChild(startGameBtn);

    this.uiContainer.appendChild(roomSection);
  }

  createRoomListSection() {
    const listSection = document.createElement("div");
    listSection.style.cssText = "margin-bottom: 15px;";

    const listTitle = document.createElement("h4");
    listTitle.textContent = "Available Rooms";
    listTitle.style.cssText = "margin: 0 0 10px 0; color: #ffffff;";
    listSection.appendChild(listTitle);

    // Refresh button
    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh Rooms";
    refreshBtn.style.cssText =
      "width: 100%; padding: 8px; margin-bottom: 10px; background: #0241e2; color: white; border: none; border-radius: 3px; cursor: pointer;";
    refreshBtn.onclick = () => this.refreshRooms();
    listSection.appendChild(refreshBtn);

    // Room list container
    this.roomListContainer = document.createElement("div");
    this.roomListContainer.style.cssText =
      "max-height: 200px; overflow-y: auto; border: 1px solid #021542; border-radius: 3px; padding: 5px; background: #021542;";
    listSection.appendChild(this.roomListContainer);

    this.uiContainer.appendChild(listSection);
  }

  createDebugSection() {
    const debugSection = document.createElement("div");
    debugSection.style.cssText =
      "padding: 10px; background: #021542; border-radius: 4px; border: 1px solid #0241e2;";

    const debugTitle = document.createElement("h4");
    debugTitle.textContent = "Debug Info";
    debugTitle.style.cssText = "margin: 0 0 10px 0; color: #ccc;";
    debugSection.appendChild(debugTitle);

    this.debugInfo = document.createElement("div");
    this.debugInfo.style.cssText =
      "font-size: 10px; color: #ccc; line-height: 1.4;";
    debugSection.appendChild(this.debugInfo);

    this.uiContainer.appendChild(debugSection);
  }

  createToggleButton() {
    // Create toggle button
    this.toggleButton = document.createElement("button");
    this.toggleButton.textContent = "◀";
    this.toggleButton.id = "network-ui-toggle";
    this.toggleButton.className = "network-ui-toggle";

    this.toggleButton.onclick = () => this.toggleUI();

    this.toggleButton.addEventListener("mouseenter", () => {
      this.toggleButton.style.background = "#0241e2";
    });

    this.toggleButton.addEventListener("mouseleave", () => {
      this.toggleButton.style.background = "#021542";
    });

    document.body.appendChild(this.toggleButton);
  }

  addResponsiveCSS() {
    // Check if CSS already exists
    if (document.getElementById("network-ui-styles")) return;

    const style = document.createElement("style");
    style.id = "network-ui-styles";
    style.textContent = `
      .network-ui-container {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        right: 60px;
        width: 350px;
        background: #000000;
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 1000;
        max-height: 80dvh;
        overflow-y: auto;
        border: 2px solid #021542;
        transition: all 0.3s ease;
      }

      .network-ui-toggle {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        right: 10px;
        width: 40px;
        height: 40px;
        background: #021542;
        color: white;
        border: 2px solid #0241e2;
        border-radius: 50%;
        cursor: pointer;
        z-index: 1001;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      /* Mobile styles */
      @media screen and (max-width: 768px) {
        .network-ui-container {
          right: 10px;
          left: 10px;
          width: auto;
          max-height: 60vh;
          padding: 10px;
          font-size: 10px;
        }
        
        .network-ui-toggle {
          right: 15px;
          left: auto;
          width: 30px;
          height: 30px;
          font-size: 12px;
        }
      }

      /* Small mobile styles */
      @media screen and (max-width: 480px) {
        .network-ui-container {
          max-height: 50vh;
          padding: 8px;
          font-size: 9px;
        }
        
        .network-ui-toggle {
          width: 28px;
          height: 28px;
          font-size: 11px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  toggleUI() {
    this.isUIVisible = !this.isUIVisible;

    if (this.isUIVisible) {
      this.uiContainer.style.display = "block";
      this.toggleButton.textContent = "◀";
      this.toggleButton.style.right = "10px";
    } else {
      this.uiContainer.style.display = "none";
      this.toggleButton.textContent = "▶";
      this.toggleButton.style.right = "10px";
    }
  }

  addEventListeners() {
    if (this.networkManager) {
      this.setupNetworkListeners();
      this.updateUI();
    }
  }

  setupNetworkListeners() {
    this.networkManager.on("room-list-updated", (rooms) => {
      this.updateRoomList(rooms);
    });

    this.networkManager.on("room-actor-changed", (actors) => {
      this.updateCurrentRoomInfo();
    });

    this.networkManager.on("room-closed", () => {
      this.updateCurrentRoomInfo();
    });

    this.networkManager.on("join-room-full", () => {
      this.showMessage("Failed to join room: Room is full");
    });
  }

  async createRoom() {
    const roomName =
      document.getElementById("room-name-input").value || `Room-${Date.now()}`;

    try {
      await this.networkManager.createRoom(roomName, {
        maxPlayers: this.maxPlayer ?? 4,
        minPlayers: this.minPlayer ?? 1,
        mode: "solo",
      });
      this.updateUI();
      this.showMessage("Room created successfully!", "success");
    } catch (error) {
      this.showMessage(`Failed to create room: ${error.message}`, "error");
    }
  }

  async startGame() {
    try {
      await this.networkManager.startGame();
      this.updateUI();
      this.showMessage("Game started successfully!", "success");
    } catch (error) {
      this.showMessage(`Failed to start game: ${error.message}`, "error");
    }
  }

  async joinRoom(roomId) {
    try {
      await this.networkManager.joinRoom(roomId);
      this.updateUI();
      this.showMessage("Joined room successfully!", "success");
    } catch (error) {
      this.showMessage(`Failed to join room: ${error.message}`, "error");
    }
  }

  async refreshRooms() {
    try {
      await this.networkManager.matchmaking.getAvailableRooms();
      this.showMessage("Room list refreshed!", "success");
    } catch (error) {
      this.showMessage(`Failed to refresh rooms: ${error.message}`, "error");
    }
  }

  async leaveRoom() {
    try {
      const currentRoom = this.networkManager?.currentRoom;

      // 如果房間已關閉，進入大廳；否則離開房間
      if (currentRoom && currentRoom.is_closed) {
        await this.networkManager.enterLobby();
        this.showMessage("Room was closed, entered lobby!", "success");
      } else {
        await this.networkManager.matchmaking.leaveRoom();
        this.showMessage("Left room successfully!", "success");
      }

      this.updateUI();
    } catch (error) {
      this.showMessage(`Failed to leave room: ${error.message}`, "error");
    }
  }

  updateRoomList(rooms) {
    this.roomListContainer.innerHTML = "";

    if (!rooms || rooms.length === 0) {
      const noRooms = document.createElement("div");
      noRooms.textContent = "No rooms available";
      noRooms.style.cssText = "text-align: center; color: #888; padding: 10px;";
      this.roomListContainer.appendChild(noRooms);
      return;
    }

    const openRooms = rooms.filter((room) => !room.is_closed && !room.is_game_started);
    const currentRoom = this.networkManager?.currentRoom;
    const isInRoom = !!currentRoom;

    openRooms.forEach((room) => {
      const roomElement = document.createElement("div");
      roomElement.style.cssText =
        "padding: 8px; margin-bottom: 5px; background: #000000; border-radius: 3px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 1px solid #0241e2;";

      const roomInfo = document.createElement("div");
      roomInfo.innerHTML = `
        <strong>${room.name}</strong><br>
        <small>Players: ${room.actors.length}/${room.max_players} | Mode: ${room.mode}</small>
      `;

      const joinBtn = document.createElement("button");
      joinBtn.textContent = isInRoom ? "Leave current room first" : "Join";
      joinBtn.disabled = isInRoom;
      joinBtn.style.cssText = `
        padding: 4px 8px; 
        background: ${isInRoom ? "#666" : "#0241e2"}; 
        color: white; 
        border: none; 
        border-radius: 2px; 
        cursor: ${isInRoom ? "not-allowed" : "pointer"}; 
        font-size: 10px;
        opacity: ${isInRoom ? "0.5" : "1"};
      `;

      if (!isInRoom) {
        joinBtn.onclick = (e) => {
          e.stopPropagation();
          this.joinRoom(room.id);
        };
      }

      roomElement.appendChild(roomInfo);
      roomElement.appendChild(joinBtn);
      this.roomListContainer.appendChild(roomElement);
    });
  }

  updateCurrentRoomInfo() {
    const currentRoom = this.networkManager?.currentRoom;

    if (currentRoom) {
      this.currentRoomInfo.innerHTML = `
        <strong>Current Room:</strong> ${currentRoom.name}<br>
        <small>ID: ${currentRoom.id}</small><br>
        <small>Players: ${currentRoom.actors.length}/${
        currentRoom.max_players
      }</small><br>
        <small>Created by me: ${
          currentRoom.created_by_me ? "Yes" : "No"
        }</small>
      `;

      // Start Game button (only for room creator)
      document.getElementById("start-game-btn").disabled =
        !currentRoom.created_by_me;
      document.getElementById("start-game-btn").style.opacity =
        currentRoom.created_by_me ? "1" : "0.5";

      // Leave room button (available for all room members)
      document.getElementById("leave-room-btn").disabled = false;
      document.getElementById("leave-room-btn").style.opacity = "1";
    } else {
      this.currentRoomInfo.innerHTML = "<em>No room joined</em>";

      document.getElementById("start-game-btn").disabled = true;
      document.getElementById("start-game-btn").style.opacity = "0.5";
      document.getElementById("leave-room-btn").disabled = true;
      document.getElementById("leave-room-btn").style.opacity = "0.5";
    }
  }

  updateUI() {
    if (!this.networkManager) return;

    // Update current room info
    this.updateCurrentRoomInfo();

    // Update debug info
    this.updateDebugInfo();
  }

  updateDebugInfo() {
    if (!this.networkManager) return;

    const debugText = `
Session ID: ${this.networkManager.sessionId}<br>
Current Channel: ${this.networkManager.currentChannel || "None"}<br>
Active Players: ${this.networkManager.actorEntityMap.size}<br>
App ID: ${this.networkManager.appId}
    `;
    this.debugInfo.innerHTML = debugText.trim();
  }

  showMessage(text, type = "info") {
    const message = document.createElement("div");
    message.textContent = text;
    message.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 1001;
      background: ${
        type === "success"
          ? "#0241e2"
          : type === "error"
          ? "#ff534b"
          : "#021542"
      };
      border: 1px solid ${
        type === "success"
          ? "#0241e2"
          : type === "error"
          ? "#ff534b"
          : "#0241e2"
      };
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      document.body.removeChild(message);
    }, 3000);
  }

  update(dt) {
    // Update UI periodically
    if (this.networkManager) {
      this.updateDebugInfo();
    }
  }

  destroy() {
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }
  }
}
