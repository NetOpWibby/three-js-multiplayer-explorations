var server = require("http").createServer();

// Init socketio for the node http server and allow CORS for our local environment
// https://socket.io/docs/v3/handling-cors/
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Player state of connected players, colors, and locations
const players = {};

const createPlayer = (id, color) => ({
  id,
  color,
  position: { x: 250, y: 250 } // all players begin in the center of the board
});

function numPlayers() {
  return Object.keys(players).length;
}

// Tracking variables for the update loop
let stateChanged = false;
let isEmittingUpdates = false;
const stateUpdateInterval = 300;

function emitStateUpdateLoop() {
  isEmittingUpdates = true;
  // Reduce usage by only send state update if state has changed
  if (stateChanged) {
    stateChanged = false;
    io.emit("stateUpdate", players);
  }

  if (numPlayers() > 0) {
    setTimeout(emitStateUpdateLoop, stateUpdateInterval);
  } else {
    // Stop the setTimeout loop if there are no players left
    isEmittingUpdates = false;
  }
}

io.sockets.on("connection", function(socket) {
  socket.on("disconnect", function() {
    // Remove player from state on disconnect
    stateChanged = true;
    delete players[socket.id];
  });

  socket.on("positionUpdate", function(positionData) {
    stateChanged = true;
    let player = players[socket.id];
    player.position = positionData;
  });

  socket.on("initialize", function(data) {
    stateChanged = true;
    var id = socket.id;

    // Create a new player object
    var newPlayer = createPlayer(id, data.color);

    // Add the newly created player to game state.
    players[id] = newPlayer;

    //On first player joined, start update emit loop
    if (numPlayers() === 1 && !isEmittingUpdates) {
      emitStateUpdateLoop();
    }
  });
});

console.log("Server started.");
server.listen(3000);
