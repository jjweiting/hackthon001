import ViverseSdkClient from "./viverse-sdk-client.mjs";

class MultiPlayerClient {
  constructor(manager, appId) {
    if (MultiPlayerClient.instance) {
      return MultiPlayerClient.instance;
    }

    this.appId = appId;
    this.manager = manager;
    this.currentClient = null;
    this.isConnected = false; 
    MultiPlayerClient.instance = this;
  }

  addEventListeners() {
    if (!this.currentClient) {
      return;
    }

    this.currentClient.general.onMessage((message) => {
      const parsed =
        typeof message !== "string" ? message : JSON.parse(message);
      this.manager.fire("receive-message", parsed);
      // console.log('🦊📩 onMessage:', parsed); 
    });
  }

  async createClient(roomId) {
    if (this.currentClient) {
      console.warn("🦊 Client already exists");
      return;
    }


    const client = await ViverseSdkClient.instance.newMultiplayerClient(
      roomId,
      this.appId
    );

    // NOTE: Can't get onConnected event, need to check with SDK team
    client.onConnected(() => {
      this.isConnected = true;
      this.addEventListeners();
      console.log("🦊 Multiplayer client connected.");
    });

    await client.init();
    this.currentClient = client;
    console.log("🦊 Multiplayer client created:", client);
  }

  async removeClient() {
    if (this.currentClient) {
      await this.currentClient.disconnect();
      this.currentClient = null;
      this.isConnected = false;
    }
  }

  sendMessage(player, message) {
    if (!this.currentClient) {
      console.warn("🦊 No connected client to send message");
      return;
    }

    // NOTE: Can't get onConnected event, need to check with SDK team
    if (!this.isConnected) {
      return;
    }

    const stringifiedMessage = JSON.stringify({ player, ...message });
    this.currentClient.general.sendMessage(stringifiedMessage);
    // console.log('🦊📤 Sent message:', stringifiedMessage);
  }
}

export default MultiPlayerClient;
