const app = require("express")();
const http = require("http").createServer(app);

const io = require("socket.io")(http);

var players = {};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);
  players[socket.id] = { id: socket.id, object: {} };

  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.id} disconnected`);
    delete players[socket.id];
  });

  // Main script //
  socket.on("senddata", (data) => {
    players[socket.id].object = data;
  });
});

setInterval(() => {
  io.emit("playerdata", players);
}, 10);

http.listen(3000, () => {
  console.log("listening on localhost:3000");
});
