import ViverseSdkClient from "./viverse-sdk-client.mjs";

class MatchmakingClient {
  constructor(manager, appId, debug = false) {
    if (MatchmakingClient.instance) {
      return MatchmakingClient.instance;
    }

    this.appId = appId;
    this.manager = manager;
    this.currentClient = null;
    this.debug = debug;
    this.isConnected = false;

    MatchmakingClient.instance = this;
  }

  async getAvailableRooms() {
    if (!this.currentClient) {
      throw new Error("No matchmaking client. Call createClient() first.");
    }

    const result = await this.currentClient.getAvailableRooms();
    const rooms = result.rooms || [];
    this.manager.fire("room-list-updated", rooms);
  }

  addEventListeners() {
    if (!this.currentClient) {
      return;
    }

    this.currentClient.on("onRoomListUpdate", (rooms) => {
      this.manager.fire("room-list-updated", rooms);
    });

    this.currentClient.on("onRoomActorChange", (actors) => {
      this.manager.fire("room-actor-changed", actors);
    });

    this.currentClient.on("onGameStartNotify", () => {
      console.log("🐯 Matchmaking game started notify.");
      this.manager.fire("game-start");
    });

    this.currentClient.on("onError", (error) => {
      console.error("🐯 Matchmaking client error:", error);

      // Need to use error code to check
      if (error && `${error}`.includes("Room is full")) {
        this.manager.fire("join-room-full");
      }
    });
  }

  async createClient() {
    if (this.currentClient) {
      console.warn("Client already exists");
      return;
    }

    const client = await ViverseSdkClient.instance.newMatchmakingClient(
      this.appId,
      true
    );
    this.currentClient = client;
    console.log("🐯 Matchmaking client created:", client);

    return new Promise((resolve, reject) => {
      client.on("onConnect", async () => {
        this.isConnected = true;
        this.addEventListeners();

        const sessionId = this.manager.sessionId;
        await this.getAvailableRooms();
        await client.setActor({
          session_id: sessionId,
          name: `Player-${sessionId.substring(0, 5)}`,
        });

        console.log("🐯 Matchmaking client connected.");
        resolve(client);
      });
    });
  }

  removeClient() {
    this.isConnected = false;
    this.currentClient = null;
  }

  createRoom(options) {
    if (!this.currentClient) {
      console.warn("🐯 No connected client to create room");
      return Promise.resolve(null);
    }

    return this.currentClient.createRoom(options);
  }

  joinRoom(roomId) {
    if (!this.currentClient) {
      console.warn("🐯 No connected client to join room");
      return Promise.resolve(null);
    }

    return this.currentClient.joinRoom(roomId);
  }

  startGame() {
    const currentRoom = this.currentClient?.currentRoom;
    if (!currentRoom) return;

    const isCreatedByMe = currentRoom.created_by_me;
    if (!isCreatedByMe) {
      console.warn("Only the room creator can close the room.");
      return;
    }
    return this.currentClient.startGame();
  }

  leaveRoom() {
    if (!this.currentClient) return;

    if (this.currentClient.isJoinedToRoom()) {
      return this.currentClient.leaveRoom();
    }

    return Promise.resolve();
  }
}

export default MatchmakingClient;
