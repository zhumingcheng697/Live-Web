// Express is a node module for building HTTP servers
var express = require("express");
var app = express();

// Tell Express to look in the "public" folder for any files first
app.use(express.static("public"));

// Here is the actual HTTP server
var http = require("http");
// We pass in the Express object
var httpServer = http.createServer(app);
// Listen on port provided by Glitch
httpServer.listen(process.env.PORT);

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require("socket.io")(httpServer);

const users = new Map();
const userlist = () => [...users.values()];

io.sockets.on("connection", function (socket) {
  socket.on("post", function (data) {
    const user = users.get(socket.id);
    let shouldPushList = false;

    if (user) {
      shouldPushList = Date.now() - user.lastActive > 15 * 1000;
      user.lastActive = Date.now();
    }

    const list = userlist();
    if (shouldPushList) {
      socket.emit("userlist", list);
      socket.broadcast.emit("post", data, list);
    } else {
      socket.broadcast.emit("post", data);
    }
  });

  socket.on("unsend", function (data) {
    const user = users.get(socket.id);
    let shouldPushList = false;

    if (user) {
      shouldPushList = Date.now() - user.lastActive > 15 * 1000;
      user.lastActive = Date.now();
    }

    const list = userlist();
    if (shouldPushList) {
      socket.emit("userlist", list);
      socket.broadcast.emit("unsend", data, list);
    } else {
      socket.broadcast.emit("unsend", data);
    }
  });

  socket.on("block", function (data) {
    const user = users.get(socket.id);

    if (user) {
      user.lastActive = Date.now();
      user.isBlocked = true;
    }

    const list = userlist();
    socket.emit("userlist", list);
    socket.broadcast.emit("block", data, list);
  });

  socket.on("unblock", function (data) {
    const user = users.get(socket.id);

    if (user) {
      user.isBlocked = false;
    }

    const list = userlist();
    socket.emit("userlist", list);
    socket.broadcast.emit("unblock", data, list);
  });

  socket.on("back", function ({ username, joinedTime, isBlocked }) {
    users.set(socket.id, {
      username,
      joinedTime,
      lastActive: Date.now(),
      isBlocked,
    });

    io.emit("userlist", username, userlist());
  });

  socket.on("join", function ({ username, joinedTime, lastActive, isBlocked }) {
    users.set(socket.id, {
      username,
      joinedTime,
      lastActive: lastActive || Date.now(),
      isBlocked,
    });

    const list = userlist();
    socket.emit("userlist", list);
    socket.broadcast.emit("join", username, list);
  });

  socket.on("disconnect", function () {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      socket.broadcast.emit("leave", user.username, userlist());
    }
  });

  socket.on("heartbeat", function ({ username, joinedTime, isBlocked }) {
    users.set(socket.id, {
      username,
      joinedTime,
      lastActive: Date.now(),
      isBlocked,
    });
  });
});

setInterval(() => {
  io.emit("userlist", userlist());
}, 60 * 1000);
