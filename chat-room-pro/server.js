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
const reports = new Map();
const users = new Map();
const userlist = () => [...users.values()];
const sendUserlist = () => io.emit("userlist", userlist());
const resetUserlistInterval = () => {
  clearInterval(userlistIntervalId);
  userlistIntervalId = setInterval(sendUserlist, 60 * 1000);
};

io.sockets.on("connection", function (socket) {
  ["post", "image", "unsend"].forEach((e) => {
    socket.on(e, function (data) {
      const user = users.get(socket.id);
      if (user) {
        user.lastActive = Date.now();
      }

      if (e !== "unsend") data.socketId = socket.id;

      socket.broadcast.emit(e, data);
    });
  });

  ["block", "unblock"].forEach((e) => {
    socket.on(e, function (data) {
      const user = users.get(socket.id);

      if (user) {
        user.lastActive = data.lastActive || Date.now();
        user.isBlocked = e === "block";
        resetUserlistInterval();
        const list = userlist();
        socket.emit("userlist", list);
        socket.broadcast.emit(e, data, list);
      }
    });
  });

  socket.on("report", function ({ sender, id, socketId }) {
    let userReport = reports.get(sender);

    let count = 1;
    let total = 0;
    let blockTime = 0.5;

    if (userReport) {
      count = (userReport.get(id) || 0) + 1;
      total = userReport.get("total_removal");
      blockTime = userReport.get("block_time");
      userReport.set(id, count);
    } else {
      const newReport = new Map();
      newReport.set(id, count);
      newReport.set("total_removal", total);
      newReport.set("block_time", blockTime);
      reports.set(sender, newReport);
      userReport = reports.get(sender);
    }

    if (
      count >= 3 ||
      count >=
        [...users.values()].filter(
          (user) =>
            Date.now() - user.lastActive < 45 * 1000 && user.username !== sender
        ).length *
          0.5
    ) {
      total += 1;
      userReport.set("total_removal", total);
      userReport.delete(id);

      if (total >= 5) {
        blockTime *= 2;
        userReport.set("block_time", blockTime);

        const user = users.get(socketId);
        if (user) {
          user.isBlocked = true;
        }

        resetUserlistInterval();
        io.emit(
          "server-block",
          { username: sender, duration: blockTime },
          userlist()
        );
      } else {
        io.emit("remove", { sender, id });
      }

      setTimeout(() => {
        const userReport = reports.get(sender);
        if (userReport) {
          const total = userReport.get("total_removal") || 0;
          if (count > 0) {
            userReport.set("total_removal", total - 1);
          }
        }
      }, 5 * 60 * 1000);
    }
  });

  socket.on("back", function ({ username, joinedTime, lastActive, isBlocked }) {
    users.set(socket.id, {
      username,
      joinedTime,
      lastActive: lastActive || Date.now(),
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
      reports.delete(user.username);
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
