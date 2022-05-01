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

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on(
  "connection",

  // We are given a websocket object in our function
  function (socket) {
    console.log(`Peer ${socket.id} joined`);

    socket.on("join", (username) => {
      peers.set(socket.id, { socket, username, report_count: 0 });
      socket.emit(
        "user-list",
        [...peers.values()].map(({ socket, username }) => [username, socket.id])
      );
      socket.broadcast.emit("join", username, socket.id);
    });

    socket.on("remove-stream", (removeVideo) => {
      socket.broadcast.emit("remove-stream", socket.id, removeVideo);
    });

    // Relay signals back and forth
    socket.on("signal", (to, from, data) => {
      const peer = peers.get(to);
      if (peer && peer.socket) {
        peer.socket.emit("signal", to, from, data);
      } else {
        console.error(`Peer ${to} not found`);
      }
    });

    socket.on("report", (to) => {
      const peer = peers.get(to);
      if (!peer || !peer.socket) {
        console.error(`Peer ${to} not found`);
        return;
      }

      peer.report_count += 1;

      if (
        peer.report_count >= 3 ||
        peer.report_count >= (peers.size - 1) * 0.5
      ) {
        peers.delete(to);
        io.emit("blocked", peer.socket.id, peer.username);
      } else {
        peer.socket.emit("reported", socket.id);

        setTimeout(() => {
          const peer = peers.get(to);
          if (peer && peer.report_count > 0) {
            peer.report_count -= 1;
          }
        }, 5 * 60 * 1000);
      }
    });

    socket.on("disconnect", function () {
      console.log(`Peer ${socket.id} left`);
      io.emit("peer_disconnect", socket.id);
      peers.delete(socket.id);
    });
  }
);
