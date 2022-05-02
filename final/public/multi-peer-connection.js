// if (process.env.DEBUG) {
//   const SimplePeer = require("simple-peer");
// }

class MultiPeerConnection {
  constructor({
    socket,
    streams,
    onStream,
    onData,
    onPeerConnect,
    onPeerDisconnect,
    host,
    videoBitrate = null,
    audioBitrate = null,
  }) {
    this.peers = new Map();
    this.streams = streams || new Set();

    this.socket = socket || (host ? io.connect(host) : io.connect());

    this.socket.on("peer_disconnect", (data) => {
      this.peers.delete(data);
      onPeerDisconnect && onPeerDisconnect(data);
    });

    // Receive list results from server
    this.socket.on("user-list", (data) => {
      for (let [, id] of data) {
        if (id !== this.socket.id) {
          let peer = new SimplePeerWrapper(
            true,
            id,
            this.socket,
            this.streams,
            onPeerConnect,
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
          this.streams,
          onPeerConnect,
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

  addStream(stream) {
    this.streams.add(stream);
    for (let peer of this.peers.values()) {
      peer.addStream(stream);
    }
  }

  removeStream(stream) {
    for (let peer of this.peers.values()) {
      peer.removeStream(stream);
    }
    this.streams.delete(stream);
  }

  removeStreamsTo(id) {
    const peer = this.peers.get(id);

    if (peer) {
      if (this.streams) {
        this.streams.forEach((stream) => {
          peer.removeStream(stream);
        });
      }
    }
  }

  close() {
    for (let peer of this.peers.values()) {
      peer.destroy();
    }

    this.peers.clear();
  }
}

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {
  constructor(
    initiator,
    socket_id,
    socket,
    streams,
    peerConnectCallback,
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

    this.connected = false;

    // Their socket id, our unique id for them
    this.socket_id = socket_id;

    // Socket.io Socket
    this.socket = socket;

    // Our video stream - need getters and setters for this
    this.streams = streams;

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
      this.connected = true;
      // Let's give them our stream
      if (streams) {
        streams.forEach((stream) => {
          this.addStream(stream);
        });
      }
      peerConnectCallback && peerConnectCallback(this);
    });

    // Stream coming in to us
    this.simplepeer.on("stream", (stream) => {
      streamCallback && streamCallback(stream, this);
    });

    this.simplepeer.on("data", (data) => {
      dataCallback && dataCallback(data, this);
    });
  }

  inputsignal(sig) {
    this.simplepeer.signal(sig);
  }

  sendData(data) {
    this.simplepeer.send(data);
  }

  addStream(stream) {
    if (!this.connected) return;

    try {
      this.simplepeer.addStream(stream);
    } catch (e) {
      console.error(e);
    }
  }

  removeStream(stream) {
    try {
      this.simplepeer.removeStream(stream);
    } catch (e) {
      console.error(e);
    }
  }

  destroy() {
    try {
      this.simplepeer.destroy();
    } catch (e) {
      console.error(e);
    }
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
      return sdp;
    }

    // Pass the m line
    line++;

    // Skip i and c lines
    while (lines[line].indexOf("i=") === 0 || lines[line].indexOf("c=") === 0) {
      line++;
    }

    // If we're on a b line, replace it
    if (lines[line].indexOf("b") === 0) {
      lines[line] = "b=AS:" + bitrate;
      return lines.join("\n");
    }

    // Add a new b line
    let newLines = lines.slice(0, line);
    newLines.push("b=AS:" + bitrate);
    newLines = newLines.concat(lines.slice(line, lines.length));
    return newLines.join("\n");
  }
}
