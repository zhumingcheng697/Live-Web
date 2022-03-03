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

let userlistIntervalId;
const users = new Map();
const userlist = () => [...users.values()];
const sendUserlist = () => io.emit("userlist", userlist());
const resetUserlistInterval = () => {
  clearInterval(userlistIntervalId);
  userlistIntervalId = setInterval(sendUserlist, 60 * 1000);
};

io.sockets.on("connection", function (socket) {
  ["post", "unsend"].forEach((e) => {
    socket.on(e, function (data) {
      const user = users.get(socket.id);
      let shouldPushList = false;

      if (user) {
        shouldPushList = Date.now() - user.lastActive > 30 * 1000;
        user.lastActive = Date.now();
      }

      const list = userlist();
      if (shouldPushList) {
        resetUserlistInterval();
        socket.emit("userlist", list);
        socket.broadcast.emit(e, data, list);
      } else {
        socket.broadcast.emit(e, data);
      }
    });
  });

  ["block", "unblock"].forEach((e) => {
    socket.on(e, function (data) {
      const user = users.get(socket.id);

      if (user) {
        user.lastActive = Date.now();
        user.isBlocked = true;
      }

      resetUserlistInterval();
      const list = userlist();
      socket.emit("userlist", list);
      socket.broadcast.emit(e, data, list);
    });
  });

  socket.on("back", function ({ username, joinedTime, isBlocked }) {
    users.set(socket.id, {
      username,
      joinedTime,
      lastActive: Date.now(),
      isBlocked,
    });

    resetUserlistInterval();
    sendUserlist();
  });

  socket.on("join", function ({ username, joinedTime, lastActive, isBlocked }) {
    users.set(socket.id, {
      username,
      joinedTime,
      lastActive: lastActive || Date.now(),
      isBlocked,
    });

    resetUserlistInterval();
    const list = userlist();
    socket.emit("userlist", list);
    socket.broadcast.emit("join", username, list);
  });

  socket.on("disconnect", function () {
    const user = users.get(socket.id);
    if (user) {
      resetUserlistInterval();
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

resetUserlistInterval();
