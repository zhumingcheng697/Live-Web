class MultiPeerConnection {
  constructor({
    stream,
    onStream,
    onData,
    onPeerDisconnect,
    host,
    videoBitrate = null,
    audioBitrate = null,
  }) {
    this.peers = new Map();
    this.socket = host ? io.connect(host) : io.connect();

    this.socket.on("connect", () => {
      // Tell the server we want a list of the other users
      this.socket.emit("list");
    });

    this.socket.on("peer_disconnect", (data) => {
      this.peers.delete(data);
      onPeerDisconnect(data);
    });

    // Receive list results from server
    this.socket.on("list-results", (data) => {
      for (let id of data) {
        if (id !== this.socket.id) {
          let peer = new SimplePeerWrapper(
            true,
            id,
            this.socket,
            stream,
            onStream,
            onData,
            videoBitrate,
            audioBitrate
          );

          this.peers.set(id, peer);
        }
      }
    });

    this.socket.on("signal", (to, from, data) => {
      // to should be us
      if (to !== this.socket.id) {
        console.error("Socket IDs don't match");
        return;
      }

      const peer = this.peers.get(from);

      if (peer) {
        peer.inputsignal(data);
      } else {
        const peer = new SimplePeerWrapper(
          false,
          from,
          this.socket,
          stream,
          onStream,
          onData,
          videoBitrate,
          audioBitrate
        );

        this.peers.set(from, peer);

        // Tell the new peer that signal
        peer.inputsignal(data);
      }
    });
  }

  sendData(data) {
    for (let peer of this.peers.values()) {
      peer.sendData(data);
    }
  }
}

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {
  constructor(
    initiator,
    socket_id,
    socket,
    stream,
    streamCallback,
    dataCallback,
    videoBitrate = null,
    audioBitrate = null
  ) {
    if (!videoBitrate && !audioBitrate) {
      this.simplepeer = new SimplePeer({
        initiator: initiator,
        trickle: false,
      });
    } else {
      this.simplepeer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        sdpTransform: (sdp) => {
          let newSDP = sdp;
          if (videoBitrate) {
            newSDP = this.setMediaBitrate(sdp, videoBitrate, "video");
          }
          if (audioBitrate) {
            newSDP = this.setMediaBitrate(newSDP, audioBitrate, "audio");
          }
          return newSDP;
        },
      });
    }

    // Their socket id, our unique id for them
    this.socket_id = socket_id;

    // Socket.io Socket
    this.socket = socket;

    // Our video stream - need getters and setters for this
    this.stream = stream;

    // Callback for when we get a stream from a peer
    this.streamCallback = streamCallback;

    // Callback for when we get data form a peer
    this.dataCallback = dataCallback;

    // simplepeer generates signals which need to be sent across socket
    this.simplepeer.on("signal", (data) => {
      this.socket.emit("signal", this.socket_id, this.socket.id, data);
    });

    // When we have a connection, send our stream
    this.simplepeer.on("connect", () => {
      // Let's give them our stream
      if (stream) {
        this.simplepeer.addStream(stream);
      }
    });

    // Stream coming in to us
    this.simplepeer.on("stream", (stream) => {
      streamCallback(stream, this);
    });

    this.simplepeer.on("data", (data) => {
      dataCallback(data, this);
    });
  }

  inputsignal(sig) {
    this.simplepeer.signal(sig);
  }

  sendData(data) {
    this.simplepeer.send(data);
  }

  // Borrowed from after https://webrtchacks.com/limit-webrtc-bandwidth-sdp/
  setMediaBitrate(sdp, bitrate, mediaType = "video") {
    const lines = sdp.split("\n");
    let line = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf("m=" + mediaType) === 0) {
        line = i;
        break;
      }
    }
    if (line === -1) {
      console.debug("Could not find the m line for", mediaType);
      return sdp;
    }
    console.debug("Found the m line for", mediaType, "at line", line);

    // Pass the m line
    line++;

    // Skip i and c lines
    while (lines[line].indexOf("i=") === 0 || lines[line].indexOf("c=") === 0) {
      line++;
    }

    // If we're on a b line, replace it
    if (lines[line].indexOf("b") === 0) {
      console.debug("Replaced b line at line", line);
      lines[line] = "b=AS:" + bitrate;
      return lines.join("\n");
    }

    // Add a new b line
    console.debug("Adding new b line before line", line);
    let newLines = lines.slice(0, line);
    newLines.push("b=AS:" + bitrate);
    newLines = newLines.concat(lines.slice(line, lines.length));
    return newLines.join("\n");
  }
}
