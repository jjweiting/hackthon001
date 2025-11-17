Precondition
Before using any Multiplayer APIs, you must:

Initialize the Play client instance.

Construct a MultiplayerClient instance with a valid room ID and App ID.

Call init() to establish the multiplayer session.

Initialize Multiplayer Client
Parameters

 

 

 

RoomID

string

The ID of the room the player joined via Matchmaking.

required

GameID

string

The App ID

required

UserSessionID

string

Set user session ID; generate a random UUID if not set.

optional



// initialize multiplayer client instance
const roomId = 'example_room';   // obtained from matchmaking
const appId = 'example_game';    // App ID from Creator Studio
const userSessionId = 'cutom_userSessionID' // optional, set user session id
globalThis.multiplayerClient = new globalThis.play.newMultiplayerClient(roomId, appId, userSessionId);
💡 MultiplayerClient is a global class under the play namespace and is not created via playClient. However, Play SDK must still be initialized first.

Parameters

 

 

 

options

object

enable multiplayer functions, default all modules disable

optional



// init options, optional
const options = {
  'modules': {
    'game': { enabled: true, desc: 'game description', ready_time: 3, start_delay_time: 0.5, play_time: 30, total_player: 4, change_second: 10, min_total_player: 2, max_total_player: 4, wait_player_timeout: 100},
    'networkSync': { enabled: true, desc: 'networkSync description'},
    'actionSync': { enabled: true, desc: 'actionSync description'},
    'leaderboard': { enabled: true, desc: 'leaderboard description'}
  }
}
const info = await multiplayerClient.init(options);
/*
info example data(include user session id)
{
    "session_id": "user_session_id",
    "room_id": "example_room",
    "app_id": "example_game"
    "modules": [
        {
            "type": "game",
            "desc": "game description",
            "ready_time": 3,
            "start_delay_time": 0.5,
            "play_time": 30,
            "total_player": 4,
            "change_second": 10,
            "min_total_player": 2,
            "max_total_player": 4,
            "wait_player_timeout": 100
        },
        {
            "type": "network_sync",
            "desc": "network sync description"
        },
        {
            "type": "action_sync",
            "desc": "action sync description"
        },
        {
            "type": "leaderboard",
            "desc": "leaderboard description"
        }
    ]
}
*/
APIs
Category

API Name

Description

Connection Control

disconnect()

Manually disconnect the multiplayer client instance.

onConnected(callback)

Triggered when the multiplayer client connects.

onClientConnected(userSessionID)

Invoked when a new client connects, allowing you to track who is currently online.

onClientDisconnected(userSessionID)

Invoked when a client disconnects, allowing you to track who goes offline.

General

sendMessage
Sends message to peers.

onMessage
Receives message from peers

Game

gameStart

Trigger Game Start

gameEnd

Trigger Game End

gameUpdate

Trigger Game Update

gameRestart

Trigger Restart Game

getRoomInfo

Get current game room info

onCountdownToStart

When the room host starts the game, all clients receive a countdown-to-start event.

onCountdownToEnd

Invoked automatically after the onCountdownToStart completes.
Clients receive onCountdownToEnd event indicating the countdown has finished and the game is starting.

onGameTimeUp

Game time’s up

onGameEnd

When the room host trigger gameEnd

onGameRestart

When the room host trigger restart

onErrorNotify

Receive error notification

NetworkSync

onNotifyPositionUpdate()

Receive position/state updates.

onNotifyRemove()

Receive notifications when an entity is removed.

ActionSync

competition()

Submit an action to trigger arbitration.

onCompetition()

Triggered when a competition result is returned from the server.

Real-time Leaderboard

leaderboardUpdate(score)

Submit new score to real-time leaderboard.

onLeaderboardUpdate

Receive latest leaderboard update

Connection Control
Handles the multiplayer client’s connection lifecycle.
Use these APIs to detect when the client is ready and to manually disconnect when needed.

Disconnect
Manually disconnects the multiplayer client instance.
Useful for cleanup or leaving the session before navigating away.



multiplayerClient.disconnect();
 

Connect Event
Triggered when the multiplayer client establishes a connection.
Use this to perform setup logic after the session is ready.



multiplayerClient.onConnected(() => {
  console.log("Multiplayer client connected.");
});
 

Client Connect
Invoked when a new client connects, allowing you to track who is currently online.



multiplayerClient.onClientConnected(userSessionID => 
   appendLog(`onClientConnected, userSessionID: ${userSessionID}`)
);
 

Client Disconnect
Invoked when a client disconnects, allowing you to track who goes offline.



multiplayerClient.onClientDisconnected(peerId => 
   appendLog(`onClientDisconnected, userSessionID: ${userSessionID}`)
);
General
The General module lets creators send and receive custom messages between peers in multiplayer scenes.
Use this flexible channel when you need to define your own data format for syncing data, triggering events, or implementing custom game logic.

sendMessage
Sends message to peers

Request Parameters

Parameters

 

 

 

message

any

e.g.: {x: 1, y: 2, z: 3, w: 4}

required



multiplayerClient.general.sendMessage(message);
onMessage
Receives message from peers



multiplayerClient.general.onMessage((message) => {
   console.log(`📩 onMessage: ${message}`);
});
 

Game
Game modules can control game time

gameStart
Trigger Game Start



multiplayerClient.game.gameStart()
gameEnd
Trigger Game End



multiplayerClient.game.gameEnd()
gameUpdate
Trigger Game Update and update number of total player 

Request Parameters

Parameters

 

 

 

number of total player 

number

ex: 4

required



multiplayerClient.game.gameUpdate(4)
gameRestart
Trigger Restart Game



multiplayerClient.game.gameRestart()
getRoomInfo
Get current game room info



multiplayerClient.game.getRoomInfo()


{
    "app_id": "app_id",
    "connected_clients": [
        "client_a",
        "client_b"
    ],
    "game_status": "player_all_ready",
    "master_user": "client_a",
    "room_id": "cuurent_room_id"
}
onCountdownToStart
When the room host starts the game, all clients receive a countdown-to-start event.



multiplayerClientRef.current.game.onCountdownToStart((data: any) =>
      appendLog(`⏳ game/onCountdownToStart: ${data.second}s`)
);
onCountdownToEnd
Invoked automatically after the onCountdownToStart completes.

Clients receive onCountdownToEnd event indicating the countdown has finished and the game is starting.



multiplayerClientRef.current.game.onCountdownToEnd((data: any) =>
      appendLog(`⌛️ game/onCountdownToEnd: ${data.second}s`)
);
onGameTimeUp
Game time’s up



multiplayerClientRef.current.game.onGameTimeUp(() => {
      appendLog("🛑 game/onGameTimeUp")
});
onGameEnd
When the room host trigger gameEnd



multiplayerClientRef.current.game.onGameEnd(() => {
      appendLog("⏹ game/onGameEnd")
});
onGameRestart
When the room host trigger restart



multiplayerClientRef.current.game.onGameRestart(() => {
      appendLog("🔄 game/onGameRestart")
});
onErrorNotify
Receive error notification



multiplayerClientRef.current.game.onErrorNotify((data: any) =>
      appendLog(`🚨 game/onErrorNotify: [${data.error_type}] ${data.error_msg}`)
);
 

NetworkSync
Synchronizes real-time position and entity state across players.
This module is commonly used to update user or object positions in multiplayer scenes.

updateMyPosition
Sends my position request to the server.

Request Parameters

Parameters

 

 

 

positionData

json

e.g.: {x: 1, y: 2, z: 3, w: 4}

required



const positionData = {x: 1, y: 2, z: 3, w: 4}
multiplayerClient.networksync.updateMyPosition(positionData);
updateEntityPosition
Sends entity’s position request to the server.

Request Parameters

Parameters

 

 

`

entity_id

string

A unique identifier for the specific entity

required

positionData

json

e.g.: {x: 1, y: 2, z: 3, w: 4}

required



const positionData = {x: 1, y: 2, z: 3, w: 4}
multiplayerClient.networksync.updateEntityPosition('entity_id', positionData);
 

onNotifyPositionUpdate
Triggered when a user or entity's position or state is updated in the scene.

Callback Payload: (data: NetworkSyncEvent)



multiplayerClient.networksync.onNotifyPositionUpdate((data: NetworkSyncEvent) => {
   if  (data.entity_type == 1) {
      console.log("networksync/notify_position/ update user: ", data.user_id, data.data);
   } else if (data.entity_type == 2) {
      console.log("networksync/notify_position/ update entity: ", data.entity_id, data.data);
   } 
});
Callback Response:

EntityType: 1 (User)



{
    "event": "notify_position",
    "user_id": "4632ca40-577e-45da-a969-a50c2431c664",
    "entity_type": 1,
    "data": {
        "w": 61,
        "x": 31,
        "y": 73,
        "z": 91
    },
    "timestamp": 1747645601354
}
EntityType: 2 (Entity)



{
    "event": "notify_position",
    "user_id": "4632ca40-577e-45da-a969-a50c2431c664",
    "entity_type": 2,
    "data": {
        "w": 64,
        "x": 46,
        "y": 67,
        "z": 10
    },
    "entity_id": "entity_id_1",
    "timestamp": 1747645637502
}
 

onNotifyRemove
Triggered when a user or an entity is removed from the scene.

Callback Payload: (data: NetworkSyncEvent)



multiplayerClient.networksync.onNotifyRemove((data: NetworkSyncEvent) => {
   if (data.entity_type == 1) {
      console.log("networksync/notify_remove/ remove user: ", data.user_id);
   }
   else if (data.entity_type == 2) {
      console.log("networksync/notify_remove/ remove user: ", data.user_id ," entityId: ", data.entity_id);
   }
});
Callback Response:

EntityType: 1 (User)



{
    "event": "notify_remove",
    "user_id": "ed73622c-c62d-4840-aa69-3e47fec0fa93",
    "entity_type": 1
}
EntityType: 2 (Entity)



{
    "event": "notify_remove",
    "user_id": "ed73622c-c62d-4840-aa69-3e47fec0fa93",
    "entity_id": "entity_id_1",
    "entity_type": 2
}
 

ActionSync
Handles action-level communication and arbitration between players.

Use this module when multiple players may trigger the same event (e.g., interacting with an object), and only one action should take effect — a process known as competition.

competition
Sends an action request to the server for arbitration.
💡 All three parameters must match across clients to be recognized as the same competition event.

Request Parameters

Parameters

 

 

 

actionName

string

The type of action (e.g., "pickup", "interact")

required

actionMsg

string

Custom message or payload for the action

required

actionId

string

A unique identifier for the specific action instance

required



multiplayerClient.actionsync.competition(actionName, actionMsg, actionId);
 

onCompetition
Triggered when a competition result is returned from the server.
💡 Use this to determine which player won the arbitration and proceed accordingly in your game logic (e.g., only the winner picks up the item).

Callback Payload: (data: ActionSyncCompetitionEvent)



multiplayerClient.actionsync.onCompetition((data) => {
  console.log("actionsync/competition:", data);
});
Callback Response:



{
    "competition": {
        "successor": "7794e184-9e3c-48f4-866d-9dc6e197ea42",
        "action_name": "pickupExtinguisher",
        "action_id": "4ac20fa1-a8a8-4b7a-90ad-571b89c6a10b",
        "action_msg": "viverse",
        "update_time": 1747645510990
    }
}
 

Real-time Leaderboard
Handles real-time score reporting and live leaderboard updates across players during gameplay.

Use this module to update a player’s score and receive ranking changes in real time.

leaderboardUpdate
Submits a new score to the real-time leaderboard.

Request Parameters

Parameters

 

 

 

score

number

The player’s latest score

required



multiplayerClient.leaderboard.leaderboardUpdate(score);
 

onLeaderboardUpdate
Triggered when the leaderboard is updated and a new score ranking is available.

Callback Payload: (data: LeaderboardData)



multiplayerClient.leaderboard.onLeaderboardUpdate((data) => {
  console.log("leaderboard/update_record:", data);
});
Callback Response:



{
    "leaderboard": [
        {
            "user_id": "72f3a185-fbc0-4fdb-b64d-4e147de893e3",
            "score": 92,
            "rank": 1
        },
        {
            "user_id": "a1c5faad-87ab-4b6e-a5e8-b9ae723fce78",
            "score": 22,
            "rank": 2
        }
    ]
}