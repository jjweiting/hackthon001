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
    this.roomListContainer = null;
    this.currentRoomInfoContent = null;
    this.statusPill = null;
    this.leaveRoomBtn = null;
    this.startGameBtn = null;
    this.playerMetaEl = null;
    this.toggleButton = null;
    this.isUIVisible = true;
    this.createUI();
    this.createToggleButton();
    this.addEventListeners();

    if (this.networkManager) {
      // 當 Matchmaking 通知遊戲開始時，關閉配對面板並顯示戰鬥 UI
      this.networkManager.on("game-start", this.onGameStart, this);
      // 當 NetworkManager 回到 Lobby 時，重新顯示配對面板
      this.networkManager.on("entered-lobby", this.onEnteredLobby, this);
    }
  }

  createUI() {
    // Add CSS for matchmaking lobby overlay
    this.addResponsiveCSS();

    // Overlay root
    const overlay = document.createElement("div");
    overlay.className = "mm-overlay";
    overlay.id = "network-ui-overlay";
    this.uiContainer = overlay;

    // Main panel
    const panel = document.createElement("div");
    panel.className = "mm-panel";
    overlay.appendChild(panel);

    // Header
    const header = document.createElement("div");
    header.className = "mm-header";
    panel.appendChild(header);

    const titleBlock = document.createElement("div");
    titleBlock.className = "mm-title-block";
    header.appendChild(titleBlock);

    const title = document.createElement("h1");
    title.className = "mm-title";
    title.textContent = "Battle Arena Lobby";
    titleBlock.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "mm-subtitle";
    subtitle.textContent = "Join a room or start a new match";
    titleBlock.appendChild(subtitle);

    const statusPill = document.createElement("div");
    statusPill.className = "mm-status-pill mm-status-lobby";
    statusPill.textContent = "In Lobby";
    header.appendChild(statusPill);
    this.statusPill = statusPill;

    // Main content
    const main = document.createElement("div");
    main.className = "mm-main";
    panel.appendChild(main);

    // Left: player + current room + actions
    const left = document.createElement("div");
    left.className = "mm-left";
    main.appendChild(left);

    const playerCard = document.createElement("div");
    playerCard.className = "mm-player-card";
    left.appendChild(playerCard);

    const playerName = document.createElement("div");
    playerName.className = "mm-player-name";
    playerName.textContent = "Player";
    playerCard.appendChild(playerName);

    const playerMeta = document.createElement("div");
    playerMeta.className = "mm-player-meta";
    playerMeta.textContent = "";
    playerCard.appendChild(playerMeta);
    this.playerMetaEl = playerMeta;

    const roomInfoBox = document.createElement("div");
    roomInfoBox.className = "mm-room-info-box";
    left.appendChild(roomInfoBox);

    const roomInfoTitle = document.createElement("div");
    roomInfoTitle.className = "mm-room-info-title";
    roomInfoTitle.textContent = "Current Room";
    roomInfoBox.appendChild(roomInfoTitle);

    const roomInfoContent = document.createElement("div");
    roomInfoBox.appendChild(roomInfoContent);
    this.currentRoomInfoContent = roomInfoContent;

    const actions = document.createElement("div");
    actions.className = "mm-actions";
    left.appendChild(actions);

    const createRoomBtn = document.createElement("button");
    createRoomBtn.className = "mm-btn mm-btn-secondary";
    createRoomBtn.textContent = "Create Room";
    createRoomBtn.onclick = () => this.createRoom();
    actions.appendChild(createRoomBtn);
    this.createRoomBtn = createRoomBtn;

    const leaveRoomBtn = document.createElement("button");
    leaveRoomBtn.className = "mm-btn mm-btn-ghost";
    leaveRoomBtn.textContent = "Leave Room";
    leaveRoomBtn.disabled = true;
    leaveRoomBtn.onclick = () => this.leaveRoom();
    actions.appendChild(leaveRoomBtn);
    this.leaveRoomBtn = leaveRoomBtn;

    // Start Game button (host only)
    const startGameBtn = document.createElement("button");
    startGameBtn.className = "mm-btn mm-btn-primary";
    startGameBtn.textContent = "Start Game";
    startGameBtn.disabled = true;
    startGameBtn.onclick = () => this.startGame();
    actions.appendChild(startGameBtn);
    this.startGameBtn = startGameBtn;

    // Right: room list
    const right = document.createElement("div");
    right.className = "mm-right";
    main.appendChild(right);

    const rightHeader = document.createElement("div");
    rightHeader.className = "mm-right-header";
    right.appendChild(rightHeader);

    const rightTitle = document.createElement("div");
    rightTitle.className = "mm-right-title";
    rightTitle.textContent = "Available Rooms";
    rightHeader.appendChild(rightTitle);

    const rightControls = document.createElement("div");
    rightControls.className = "mm-right-controls";
    rightHeader.appendChild(rightControls);

    const searchInput = document.createElement("input");
    searchInput.className = "mm-search";
    searchInput.type = "text";
    searchInput.placeholder = "Search room...";
    rightControls.appendChild(searchInput);

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "mm-refresh";
    refreshBtn.textContent = "Refresh";
    refreshBtn.onclick = () => this.refreshRooms();
    rightControls.appendChild(refreshBtn);

    const roomList = document.createElement("div");
    roomList.className = "mm-room-list";
    right.appendChild(roomList);
    this.roomListContainer = roomList;

    // Footer as debug bar
    const footer = document.createElement("div");
    footer.className = "mm-footer";
    panel.appendChild(footer);

    const footerLeft = document.createElement("div");
    footerLeft.textContent = "";
    footer.appendChild(footerLeft);

    const footerRight = document.createElement("div");
    footerRight.textContent = "";
    footer.appendChild(footerRight);
    // Reuse existing debugInfo hook to write into footer right
    this.debugInfo = footerRight;

    document.body.appendChild(overlay);
  }

  createRoomSection() {
    // legacy, no-op with new lobby UI
  }

  createRoomListSection() {
    // legacy, no-op with new lobby UI
  }

  createDebugSection() {
    // legacy, no-op with new lobby UI
  }

  createToggleButton() {
    // Floating toggle button to show / hide the lobby panel
    this.toggleButton = document.createElement("button");
    this.toggleButton.textContent = "◀";
    this.toggleButton.id = "network-ui-toggle";
    this.toggleButton.className = "network-ui-toggle";

    this.toggleButton.onclick = () => this.toggleUI();

    document.body.appendChild(this.toggleButton);
  }

  addResponsiveCSS() {
    // Check if CSS already exists
    if (document.getElementById("network-ui-styles")) return;

    const style = document.createElement("style");
    style.id = "network-ui-styles";
    style.textContent = `
      .mm-overlay {
        position: fixed;
        inset: 0;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        z-index: 1000;
      }

      .mm-panel {
        width: 960px;
        max-width: 100%;
        height: 540px;
        max-height: calc(100vh - 48px);
        background: rgba(255, 255, 255, 0.88);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        backdrop-filter: blur(12px);
      }

      .mm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      .mm-title-block {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .mm-title {
        margin: 0;
        font-size: 22px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #111827;
      }

      .mm-subtitle {
        font-size: 12px;
        color: #4b5563;
      }

      .mm-status-pill {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.7);
        color: #047857;
      }

      .mm-status-pill.mm-status-lobby {
        background: rgba(243, 244, 246, 0.9);
        border-color: rgba(209, 213, 219, 0.9);
        color: #374151;
      }

      .mm-main {
        flex: 1;
        display: flex;
        gap: 18px;
        overflow: hidden;
      }

      .mm-left {
        flex: 0 0 260px;
        background: rgba(249, 250, 251, 0.9);
        border-radius: 18px;
        padding: 14px 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid rgba(209, 213, 219, 0.9);
      }

      .mm-player-card {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .mm-player-name {
        font-weight: 600;
        font-size: 14px;
        color: #111827;
      }

      .mm-player-meta {
        font-size: 11px;
        color: #4b5563;
        line-height: 1.4;
      }

      .mm-room-info-box {
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(243, 244, 246, 0.95);
        border: 1px solid rgba(209, 213, 219, 0.9);
        font-size: 11px;
        line-height: 1.5;
        color: #111827;
      }

      .mm-room-info-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #6b7280;
        margin-bottom: 4px;
      }

      .mm-label {
        color: #6b7280;
      }

      .mm-actions {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mm-btn {
        border: none;
        border-radius: 999px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 10px 14px;
        transition: background 0.15s ease, box-shadow 0.15s ease,
          transform 0.05s ease, opacity 0.15s ease;
      }

      .mm-btn:active {
        transform: translateY(1px);
      }

      .mm-btn-primary {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #fff;
        box-shadow: 0 0 16px rgba(37, 99, 235, 0.4);
      }

      .mm-btn-primary:hover {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        box-shadow: 0 0 22px rgba(37, 99, 235, 0.6);
      }

      .mm-btn-secondary {
        background: rgba(243, 244, 246, 0.95);
        color: #111827;
        border: 1px solid rgba(209, 213, 219, 0.9);
      }

      .mm-btn-secondary:hover {
        background: rgba(229, 231, 235, 0.95);
      }

      .mm-btn-ghost {
        background: transparent;
        color: #6b7280;
        border: 1px dashed rgba(209, 213, 219, 0.9);
      }

      .mm-btn-ghost:hover {
        background: rgba(243, 244, 246, 0.9);
      }

      .mm-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        box-shadow: none;
      }

      .mm-right {
        flex: 1;
        background: rgba(249, 250, 251, 0.96);
        border-radius: 18px;
        padding: 14px 14px 16px;
        border: 1px solid rgba(209, 213, 219, 0.9);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .mm-right-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .mm-right-title {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #111827;
      }

      .mm-right-controls {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .mm-search {
        padding: 6px 8px;
        border-radius: 999px;
        border: 1px solid rgba(209, 213, 219, 0.9);
        background: rgba(255, 255, 255, 0.95);
        color: #111827;
        font-size: 11px;
        min-width: 120px;
      }

      .mm-refresh {
        font-size: 11px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.9);
        background: transparent;
        color: #4b5563;
        cursor: pointer;
      }

      .mm-refresh:hover {
        background: rgba(229, 231, 235, 0.9);
      }

      .mm-room-list {
        margin-top: 6px;
        flex: 1;
        border-radius: 12px;
        background: radial-gradient(circle at top, rgba(255, 255, 255, 0.95) 0, rgba(243, 244, 246, 0.96) 60%);
        padding: 8px 8px 10px;
        overflow-y: auto;
      }

      .mm-room-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(209, 213, 219, 0.9);
        margin-bottom: 8px;
      }

      .mm-room-card-info {
        max-width: 70%;
      }

      .mm-room-name {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 2px;
        color: #111827;
      }

      .mm-room-meta {
        font-size: 11px;
        color: #4b5563;
      }

      .mm-room-tags {
        margin-top: 2px;
        font-size: 10px;
        color: #6b7280;
        opacity: 0.8;
      }

      .mm-room-btn {
        padding: 8px 12px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: #2563eb;
        color: #fff;
        transition: background 0.15s ease;
      }

      .mm-room-btn:hover {
        background: #1d4ed8;
      }

      .mm-room-empty {
        font-size: 11px;
        color: #6b7280;
        text-align: center;
        padding: 20px 6px;
        opacity: 0.8;
      }

      .mm-footer {
        margin-top: 12px;
        font-size: 10px;
        color: #6b7280;
        display: flex;
        justify-content: space-between;
        opacity: 0.85;
      }

      @media (max-width: 900px) {
        .mm-panel {
          height: auto;
        }
        .mm-main {
          flex-direction: column;
        }
        .mm-left {
          flex: 0 0 auto;
          order: 2;
        }
        .mm-right {
          order: 1;
          height: 260px;
        }
      }

      @media (max-width: 640px) {
        .mm-panel {
          padding: 12px 14px;
          border-radius: 18px;
        }
        .mm-title {
          font-size: 18px;
        }
      }

      .network-ui-toggle {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        right: 10px;
        width: 40px;
        height: 40px;
        background: #ffffff;
        color: #111827;
        border: 1px solid #d1d5db;
        border-radius: 50%;
        cursor: pointer;
        z-index: 1001;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.05s ease;
      }

      .network-ui-toggle:hover {
        background: #f3f4f6;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
      }

      @media screen and (max-width: 768px) {
        .network-ui-toggle {
          right: 15px;
          width: 32px;
          height: 32px;
          font-size: 13px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  toggleUI() {
    if (!this.uiContainer || !this.toggleButton) return;

    this.isUIVisible = !this.isUIVisible;

    if (this.isUIVisible) {
      this.uiContainer.style.display = "flex";
      this.toggleButton.textContent = "◀";
    } else {
      this.uiContainer.style.display = "none";
      this.toggleButton.textContent = "▶";
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
    const roomName = `Room-${Date.now()}`;

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

      // 若房間已關閉或遊戲已開始，直接進入 Lobby；否則只離開房間，留在 Lobby 狀態
      if (currentRoom && (currentRoom.is_closed || currentRoom.is_game_started)) {
        await this.networkManager.matchmaking.leaveRoom();
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
    if (!this.roomListContainer) return;

    this.roomListContainer.innerHTML = "";

    const allRooms = rooms || [];
    const openRooms = allRooms.filter(
      (room) => !room.is_closed && !room.is_game_started
    );

    const currentRoom = this.networkManager?.currentRoom;
    const isInRoom = !!currentRoom;

    if (openRooms.length === 0) {
      const empty = document.createElement("div");
      empty.className = "mm-room-empty";
      empty.textContent = "No rooms available yet. Try creating one.";
      this.roomListContainer.appendChild(empty);
      return;
    }

    openRooms.forEach((room) => {
      const card = document.createElement("div");
      card.className = "mm-room-card";

      const info = document.createElement("div");
      info.className = "mm-room-card-info";

      const nameEl = document.createElement("div");
      nameEl.className = "mm-room-name";
      nameEl.textContent = room.name;
      info.appendChild(nameEl);

      const metaEl = document.createElement("div");
      metaEl.className = "mm-room-meta";
      metaEl.textContent = `Players: ${room.actors.length}/${room.max_players}`;
      info.appendChild(metaEl);

      const tagsEl = document.createElement("div");
      tagsEl.className = "mm-room-tags";
      tagsEl.textContent = `Mode: ${room.mode || "N/A"}`;
      info.appendChild(tagsEl);

      const joinBtn = document.createElement("button");
      joinBtn.className = "mm-room-btn";
      joinBtn.textContent = isInRoom ? "In Room" : "Join";
      joinBtn.disabled = isInRoom;

      if (!isInRoom) {
        joinBtn.onclick = (e) => {
          e.stopPropagation();
          this.joinRoom(room.id);
        };
      }

      card.appendChild(info);
      card.appendChild(joinBtn);
      this.roomListContainer.appendChild(card);
    });
  }

  updateCurrentRoomInfo() {
    const currentRoom = this.networkManager?.currentRoom;

    if (!this.currentRoomInfoContent || !this.leaveRoomBtn || !this.startGameBtn) {
      return;
    }

    if (currentRoom) {
      const isHost = !!currentRoom.created_by_me;

      this.currentRoomInfoContent.innerHTML = `
        <div><span class="mm-label">Name:</span> ${currentRoom.name}</div>
        <div><span class="mm-label">Players:</span> ${currentRoom.actors.length}/${currentRoom.max_players}</div>
        <div><span class="mm-label">Role:</span> ${isHost ? "Host" : "Member"}</div>
      `;

      if (this.statusPill) {
        this.statusPill.textContent = "In Room";
      }

      this.startGameBtn.disabled = !isHost;
      this.leaveRoomBtn.disabled = false;

      // 已在房間中時，不能再建立新房間
      if (this.createRoomBtn) {
        this.createRoomBtn.disabled = true;
      }
    } else {
      this.currentRoomInfoContent.innerHTML =
        "<div>No room joined. Create or join one.</div>";

      if (this.statusPill) {
        this.statusPill.textContent = "In Lobby";
      }

      this.startGameBtn.disabled = true;
      this.leaveRoomBtn.disabled = true;

      // 不在任何房間時，才能建立新房間
      if (this.createRoomBtn) {
        this.createRoomBtn.disabled = false;
      }
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

    if (!this.debugInfo) return;

    const sessionId = this.networkManager.sessionId;
    const channel = this.networkManager.currentChannel || "None";
    const appId = this.networkManager.appId;

    this.debugInfo.textContent = `Channel: ${channel} • Session: ${sessionId} • App: ${appId}`;
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
    if (this.networkManager) {
      this.networkManager.off("game-start", this.onGameStart, this);
      this.networkManager.off("entered-lobby", this.onEnteredLobby, this);
    }

    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }
  }

  onGameStart() {
    this.hideMatchmakingUI();
    this.showBattleUI();
  }

  onEnteredLobby() {
    // 回到 Lobby 時重新顯示 matchmaking panel 並刷新當前房間資訊
    this.isUIVisible = true;
    if (this.uiContainer) {
      this.uiContainer.style.display = "flex";
    }
    if (this.toggleButton) {
      this.toggleButton.style.display = "flex";
      this.toggleButton.textContent = "◀";
    }

    // 重新依照 NetworkManager.currentRoom 更新顯示內容
    this.updateUI();
  }

  hideMatchmakingUI() {
    this.isUIVisible = false;

    if (this.uiContainer) {
      this.uiContainer.style.display = "none";
    }
    if (this.toggleButton) {
      this.toggleButton.style.display = "none";
    }
  }

  showBattleUI() {
    // 透過 tag 尋找戰鬥 HUD 的根節點（請在 Editor 中設定）
    const hudRoot =
      this.app.root.findByTag("battle-ui")[0] ||
      this.app.root.findByTag("battle-hud-root")[0];

    if (hudRoot) {
      hudRoot.enabled = true;
    }
  }
}
