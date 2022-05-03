// Express is a node module for building HTTP servers
const express = require("express");
const app = express();

// Tell Express to look in the "public" folder for any files first
app.use(express.static("public"));

// If the user just goes to the "route" / then run this function
app.get("/", function (req, res) {
  res.send("Hello World!");
});

const port = process.env.PORT || 8080;

// Here is the actual HTTP server
const http = require("http");

// We pass in the Express object and the options object
const httpServer = http.createServer(app);

// Default HTTPS port
httpServer.listen(port);

/*
 This server simply keeps track of the peers all in one big "room"
 and relays signal messages back and forth.
 */
const peers = new Map();

const rooms = new Set();

// WebSocket Portion
// WebSockets work with the HTTP server
const { Server } = require("socket.io");
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

console.log(`Server started on port ${port}`);

const getPeersInRoom = (roomName) =>
  io.of("/").adapter.rooms.get(roomName) || new Set();

io.of("/").adapter.on("delete-room", (room) => {
  if (rooms.delete(room)) {
    io.emit("delete-room", room);
  }
});

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on(
  "connection",

  // We are given a websocket object in our function
  (socket) => {
    let room;

    console.log(`Peer ${socket.id} joined`);

    socket.emit("rooms", [...rooms]);

    socket.on("join", (username) => {
      if (peers.has(socket.id)) return;
      peers.set(socket.id, { username, report_count: 0 });
    });

    socket.on("join-room", (roomName) => {
      socket.emit(
        "user-list",
        [...getPeersInRoom(roomName)].map((id) => [
          (peers.get(id) || {}).username,
          id,
        ])
      );

      if (!rooms.has(roomName)) {
        rooms.add(roomName);
        io.emit("new-room", roomName);
      }

      socket.join(roomName);
      socket.broadcast
        .to(roomName)
        .emit("join-room", (peers.get(socket.id) || {}).username, socket.id);
      room = roomName;
    });

    socket.on("leave-room", () => {
      if (!room) return;

      socket.broadcast.to(room).emit("peer_disconnect", socket.id);
      socket.leave(room);
      room = null;
    });

    socket.on("remove-stream", (removeVideo) => {
      if (!room) return;

      socket.broadcast.to(room).emit("remove-stream", socket.id, removeVideo);
    });

    // Relay signals back and forth
    socket.on("signal", (to, from, data) => {
      socket.to(to).emit("signal", to, from, data);
    });

    socket.on("report", (idReported) => {
      if (!room) return;

      const peer = peers.get(idReported);
      if (!peer) {
        console.error(`Peer ${idReported} not found`);
        return;
      }

      peer.report_count += 1;

      if (
        peer.report_count >= 3 ||
        peer.report_count >= (getPeersInRoom(room).size - 1) * 0.5
      ) {
        io.to(room).emit("blocked", idReported, peer.username);
      } else {
        socket.to(idReported).emit("reported", socket.id);

        setTimeout(() => {
          const peer = peers.get(idReported);
          if (peer && peer.report_count > 0) {
            peer.report_count -= 1;
          }
        }, 5 * 60 * 1000);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Peer ${socket.id} left`);

      if (room) {
        io.to(room).emit("peer_disconnect", socket.id);
        socket.leave(room);
      }

      peers.delete(socket.id);
      room = null;
    });
  }
);
