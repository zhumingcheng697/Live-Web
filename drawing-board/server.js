// Express is a node module for building HTTP servers
var express = require("express");
var app = express();

// Tell Express to look in the "public" folder for any files first
app.use(express.static("public"));

// If the user just goes to the "route" / then run this function
app.get("/", function (req, res) {
  res.send("Hello World!");
});

// Here is the actual HTTP server
var http = require("http");
// We pass in the Express object
var httpServer = http.createServer(app);
// Listen on port provided by Glitch
httpServer.listen(process.env.PORT);

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require("socket.io")(httpServer);

const curveDB = new Map();
const dotDB = new Map();

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on(
  "connection",
  // We are given a websocket object in our function
  function (socket) {
    console.log("We have a new client: " + socket.id);

    socket.emit("curves", [...curveDB.values()]);
    socket.emit("dots", [...dotDB.values()]);

    socket.on("curve", function (data) {
      if (curveDB.has(socket.id)) {
        curveDB.get(socket.id).push(data);
      } else {
        curveDB.set(socket.id, [data]);
      }

      // Send it to all of the clients
      socket.broadcast.emit("curve", data);
    });

    socket.on("dot", function (data) {
      if (dotDB.has(socket.id)) {
        dotDB.get(socket.id).push(data);
      } else {
        dotDB.set(socket.id, [data]);
      }

      // Send it to all of the clients
      socket.broadcast.emit("dot", data);
    });

    socket.on("disconnect", function () {
      // Send it to all of the clients
      setTimeout(() => {
        curveDB.delete(socket.id);
        dotDB.delete(socket.id);
      }, 1000 * 60 * 5);
    });
  }
);
