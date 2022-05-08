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
const requests = new Map();
const rooms = new Map();

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

function checkRequest(id, action = 0, force = false) {
  const request = requests.get(id);
  if (!request) return;

  if (action === 1) {
    request.approval += 1;
  } else if (action === -1) {
    request.denial += 1;
  }

  const { roomToJoin, approval, denial } = request;

  if (!rooms.has(roomToJoin)) {
    io.to(id).emit("approved");
    io.to(roomToJoin).emit("cancel-request", id);
    requests.delete(id);
    return;
  }

  if (force) {
    io.to(roomToJoin).emit("cancel-request", id);
    if (approval >= denial) {
      io.to(id).emit("approved");
    } else {
      io.to(id).emit("denied");
    }
    return;
  }

  if (approval >= getPeersInRoom(roomToJoin).size * 0.5) {
    io.to(roomToJoin).emit("cancel-request", id);
    io.to(id).emit("approved");
    return;
  }

  if (denial > getPeersInRoom(roomToJoin).size * 0.5) {
    io.to(roomToJoin).emit("cancel-request", id);
    io.to(id).emit("denied");
    return;
  }
}

function removeRequest(id) {
  const request = requests.get(id);

  if (request) {
    io.to(request.roomToJoin).emit("cancel-request", id);

    clearTimeout(request.timeoutId);
    requests.delete(id);

    const roomRequests = rooms.get(request.roomToJoin);

    if (roomRequests) {
      roomRequests.delete(id);
    }
  }
}

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on(
  "connection",

  // We are given a websocket object in our function
  (socket) => {
    let room;

    console.log(`Peer ${socket.id} joined`);

    socket.on("request", (roomToJoin, msg) => {
      const timeoutId = setTimeout(() => {
        checkRequest(socket.id, 0, true);
        requests.delete(socket.id);
      }, 30 * 1000);

      requests.set(socket.id, {
        roomToJoin,
        approval: 0,
        denial: 0,
        timeoutId,
      });

      const roomRequests = rooms.get(roomToJoin);

      if (roomRequests) {
        roomRequests.add(socket.id);
      }

      socket.broadcast
        .to(roomToJoin)
        .emit("request", socket.id, (peers.get(socket.id) || {}).username, msg);
    });

    socket.on("cancel-request", (roomToJoin) => {
      removeRequest(socket.id);

      socket.broadcast.to(roomToJoin).emit("cancel-request", socket.id);
    });

    socket.on("approve-request", (id) => {
      checkRequest(id, 1);
    });

    socket.on("deny-request", (id) => {
      checkRequest(id, -1);
    });

    socket.on("join", (username) => {
      socket.emit("rooms", [...rooms.keys()]);

      if (peers.has(socket.id)) return;
      peers.set(socket.id, { username, report_count: 0 });
    });

    socket.on("join-room", (roomName) => {
      removeRequest(socket.id);

      socket.emit(
        "user-list",
        [...getPeersInRoom(roomName)].map((id) => [
          (peers.get(id) || {}).username,
          id,
        ])
      );

      if (!rooms.has(roomName)) {
        rooms.set(roomName, new Set());
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

      const roomRequests = rooms.get(room);

      if (roomRequests) {
        roomRequests.forEach((id) => {
          checkRequest(id);
        });
      }

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

        const roomRequests = rooms.get(room);

        if (roomRequests) {
          roomRequests.forEach((id) => {
            checkRequest(id);
          });
        }

        removeRequest(socket.id);
      }

      peers.delete(socket.id);
      room = null;
    });
  }
);
