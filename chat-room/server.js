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

let users = new Map();

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on(
  "connection",
  // We are given a websocket object in our function
  function (socket) {
    console.log(users);

    console.log("We have a new client: " + socket.id);

    socket.on("post", function (data) {
      // Send it to all of the clients
      socket.broadcast.emit("post", data);
    });

    socket.on("unsend", function (data) {
      // Send it to all of the clients
      socket.broadcast.emit("unsend", data);
    });

    socket.on("join", function (username) {
      users.set(socket.id, username);
      socket.broadcast.emit("join", username);
    });

    socket.on("disconnect", function () {
      const id = users.get(socket.id);
      if (id) {
        socket.broadcast.emit("leave", id);
        users.delete(socket.id);
      }
    });
  }
);
