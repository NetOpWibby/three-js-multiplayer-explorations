


/// import

import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

/// constants

const app = express();
const peers = {};
const port = process.env.PORT || 8080;

app.use(express.static("public"));

const server = createServer(app);
const io = new Server(server);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}\n`);
});



/// program

main();



/// helper

function main() {
  setupSocketServer();

  setInterval(() => {
    // update all clients of positions
    io.sockets.emit("positions", peers);
  }, 10);
}

function setupSocketServer() {
  io.on("connection", socket => {
    const peerCount = io.engine.clientsCount;

    console.log(
      `Peer joined with ID ${socket.id}.\n`,
      peerCount === 1 ?
        `There is ${peerCount} peer connected.` :
        `There are ${peerCount} peers connected.`,
      "\n—"
    );

    //Add a new client indexed by their socket id
    peers[socket.id] = {
      position: [0, 0.5, 0],
      rotation: [0, 0, 0, 1], // stored as XYZW values of Quaternion
    };

    // Make sure to send the client their ID and a list of ICE servers for WebRTC network traversal
    socket.emit("introduction", Object.keys(peers));

    // also give the client all existing clients positions:
    socket.emit("userPositions", peers);

    //Update everyone that the number of users has changed
    io.emit("newUserConnected", socket.id);

    // whenever the client moves, update their movements in the clients object
    socket.on("move", data => {
      if (peers[socket.id]) {
        peers[socket.id].position = data[0];
        peers[socket.id].rotation = data[1];
      }
    });

    // Relay simple-peer signals back and forth
    socket.on("signal", (to, from, data) => {
      if (to in peers)
        io.to(to).emit("signal", to, from, data);
      else
        console.log("Peer not found!");
    });

    //Handle the disconnection
    socket.on("disconnect", () => {
      //Delete this client from the object
      delete peers[socket.id];
      const updatedPeerCount = io.engine.clientsCount; /// unsure if necessary...

      io.sockets.emit(
        "userDisconnected",
        updatedPeerCount,
        socket.id,
        Object.keys(peers)
      );

      console.log(
        `User ${socket.id} diconnected.`,
        updatedPeerCount === 1 ?
          `There is ${updatedPeerCount} peer connected.` :
          `There are ${updatedPeerCount} peers connected.`
      );
    });
  });
}



/// base: https://github.com/juniorxsound/THREE.Multiplayer
