# Chat Plaza Ultra

**Live Web Final Project**

[![Chat Plaza Ultra Video Thumbnail](https://i1.ytimg.com/vi/NvT8CnNyJ8s/maxresdefault.jpg)](https://www.youtube.com/watch?v=NvT8CnNyJ8s)

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/chat-plaza-ultra) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-chat-plaza-ultra)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/chat-plaza-ultra) & [Glitch](https://mccoy-zhu-chat-plaza-ultra.glitch.me/)

Like I envisioned in my final proposal, I built an alternative version of my midterm project using WebRTC and audio/video streaming.

I was able to achieve about all the features I wanted to add, including:

- toggling audio and video on and off and switching between cameras and microphones
- reordering users’ frames depending on whether their camera and/or microphone is on
- reporting and blocking users (intended to prevent inappropriate content)
- allowing users to create rooms or requst to join existing rooms and switch between rooms
- having users already inside a room vote whether to approve or deny new users’ requests to join
- highlighting the speaking user with the loadest voice

Following professor’s advice, I also added a text box where new users can write a short message when requesting to join a room.

Chat Plaza Ultra is, conceptually similar to my midterm project, intended to be a safe space for people to meet and communicate and has similar features like reporting and blocking users who send inappropriate content.

Through this project, I was able to gain a deeper understanding of more advanced features in `simple-peer` like adding and removing streams on demand instead of having to always have the streams ready before establishing a multi-peer connection. I was also able to experiment with the “room” concept of `socket.io` and allow users in different rooms to communicate independently instead of always having to broadcast to every single connected socket client.

## Adding and Removing Streams

I updated my [`MultiPeerConnection`](https://github.com/zhumingcheng697/MultiPeerConnection) library so that it exposes the `addStream` and `removeStream` functionalities of `simple-peer`.

```js
// MultiPeerConnection.addStream

addStream(stream) {
  this.streams.add(stream);
  for (let peer of this.peers.values()) {
    peer.addStream(stream);
  }
}
```

```js
// MultiPeerConnection.removeStream

removeStream(stream) {
  for (let peer of this.peers.values()) {
    peer.removeStream(stream);
  }
  this.streams.delete(stream);
}
```

The `MultiPeerConnection` class now keeps track of a `Set` of `MediaStream`s that has been added to the existing peers so that when a new peer has joined, these streams will also be automatically added.

```js
// inside SimplePeerWrapper constructor

this.simplepeer.on("connect", () => {
  this.connected = true;

  if (streams) {
    streams.forEach((stream) => {
      this.addStream(stream);
    });
  }
});
```

To prevent a stream from being added twice into a peer (ie. when `MultiPeerConnection.addStream` is being called after a new peer has joined but before the new peer is fully connected), `SimplePeerWrapper.addStream` wraps the actual `SimplePeer.addStream` call in a `try-catch` block and also does not actually add the stream if the peer has not been fully connected. Since `Set`s are passed by reference, the `connect` event listener above will handle the adding and removing stream logic correctly.

```js
// SimplePeerWrapper.addStream

addStream(stream) {
  if (!this.connected) return;

  try {
    this.simplepeer.addStream(stream);
  } catch (e) {
    console.error(e);
  }
}
```

`simple-peer` has a `stream` event that I expose through an `onStream` callback config option in the `MultiPeerConnection` constructor that will fire when a new stream has been added, but `simple-peer` has no built-in event for removing streams so removed streams will show up frozen on the screen if no additional measures are taken.

To fix this, I will always emit a `remove-stream` event with _WebSockets_ when removing a stream and also listen for such events to update the UI correctly.

1. Sending client removes the stream.

   ```js
   socket.emit("remove-stream");
   connection.removeStream(stream);
   ```

2. Socket server broadcasts the event.

   ```js
   socket.on("remove-stream", () => {
     socket.broadcast.emit("remove-stream", socket.id);
   });
   ```

3. Receiving client updates UI.

   ```js
   socket.on("remove-stream", (id) => {
     // Update UI for streams from user with `id`
   });
   ```

This two-step approach to removing streams with work done using both `simple-peer` and WebSocket is necessary because the `simple-peer` aspect makes sure that no additional video or audio stream data is being transmitted but cannot tell the other peers to update the UI (unless using the unreliable data channel), and the WebSocket aspect makes sure that the UI is being updated correctly but cannot stop the peers from transmitting video or audio data by itself.

> I have been handling the video and audio streams completely separately by having a pair of `video` and `audio` HTML elements for each peer, calling `navigator.mediaDevices.getUserMedia` to get video and audio streams separately, and adding and removing video and audio streams separately as well. I might be able to create an empty `MediaStream` and add and remove the `MediaStreamTrack` from the video and audio streams to it but that just seems more complicated and I was worried that it might lead to tons of unexpected behavior for example with calling the `SimplePeer.removeTrack` method and the `MediaStream.removeTrack` method in different orders.

## Reordering Frames

When a new video or audio stream is received or removed from a peer, I will first add or remove the CSS class `.video-ready` and `.audio-ready`, respectively, on that user’s frame.

```js
// When a video stream is received

peerCaptureDiv.classList.add("video-ready");
```

```js
// When an audio stream is removed

peerCaptureDiv.classList.remove("audio-ready");
```

After the CSS classes has been set, I will reorder the frames using the `Node.insertBefore` method in combination with `Document.querySelector`.

The order I choose is `.video-ready.audio-ready` first, followed by `.video-stream:not(.audio-stream)`, then `.audio-stream:not(.video-stream)`, and finally `:not(.video-stream):not(.audio-stream)`.

```js
function insertPeerCaptureDiv(peerCaptureDiv) {
  const videoReady = peerCaptureDiv.classList.contains("video-ready");
  const audioReady = peerCaptureDiv.classList.contains("audio-ready");

  let sibling;

  if (videoReady && audioReady) {
    // Frame to insert has both video and audio

    // Insert to the front
    sibling = streamsDiv.firstChild;
  } else if (videoReady) {
    // Frame to insert has video but no audio

    // Insert before the first node that does not have both video and audio
    // (ie. has either video, or audio, or either, but not both)
    sibling = streamsDiv.querySelector(
      `.stream:not(.video-ready.audio-ready):not(#${peerCaptureDiv.id})`
    );
  } else if (audioReady) {
    // Frame to insert has audio but no video

    // Insert before the first node that does not have video (may or may not have audio)
    sibling = streamsDiv.querySelector(
      `.stream:not(.video-ready):not(#${peerCaptureDiv.id})`
    );
  } else {
    // Frame to insert has no video nor video

    // Insert before the first node that has neither video nor video
    sibling = streamsDiv.querySelector(
      `.stream:not(.video-ready):not(.audio-ready):not(#${peerCaptureDiv.id})`
    );
  }

  // Actual insertion
  streamsDiv.insertBefore(peerCaptureDiv, sibling);
}
```

Special attention is needed to ignore the frame to reorder itself from the query selector (through `:not(#id)`), since otherwise the frame may stay in its original place when it should have been inserted to the front.

## Reporting and Blocking

Reporting and blocking is done similarly to [what I did for my midterm project](https://github.com/zhumingcheng697/Live-Web/tree/main/chat-room-pro#reporting-and-blocking). In fact, since there are no more “messages” to report, and each user has at most two streams (one video and one audio), reports are only counted on users, not their streams.

The only detail worth mentioning is that after being reported, the reported user’s existing streams will not only be hidden from the reporting user, but also stop being transmitted to the reporting user to prevent unnecessary network usage.

The chain of events that makes this possible is:

1.  The reporting user emit a socket event with the id of the user to report and update the UI to hide their streams.

    ```js
    socket.emit("report", idToReport);

    // Update UI to hide streams
    ```

2.  The socket server processes the report (see [what I did for my midterm project](https://github.com/zhumingcheng697/Live-Web/tree/main/chat-room-pro#reporting-and-blocking) for more details), and either tell the user being reported that they have been reported, or broadcast to everyone that the user being reported has been blocked and removed from the room.

    ```js
    socket.on("report", (idReported) => {
      // Process the report and block the user being reported

      if (NEED_TO_BLOCK_USER) {
        io.emit("blocked", idReported);
      } else {
        socket.to(idReported).emit("reported", socket.id);
      }
    });
    ```

3.  The reported user receive the socket event.

    - If the reported user does not need to be blocked, they will remove their existing streams to the reporting user.

      ```js
      socket.on("reported", (idReporting) => {
        connection.removeStreamsTo(idReporting);
      });
      ```

      The actual work of removing the streams to that specific user is delegated to `MultiPeerConnection`.

      ```js
      // MultiPeerConnection.removeStreamsTo

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
      ```

    - If the reported user needs to be blocked, the reported user will close its peer-to-peer connection with everyone and other users will update the UI accordingly.

      ```js
      socket.on("blocked", (idReported) => {
        if (idReported === socket.id) {
          connection.close();
        } else {
          // Update UI to remove user frame
        }
      });
      ```

      The actual work of closing the connection is delegated to `MultiPeerConnection`.

      ```js
      // MultiPeerConnection.close

      close() {
        for (let peer of this.peers.values()) {
          peer.destroy();
        }

        this.peers.clear();
      }
      ```

## Rooms

1. When users set their username, they emit an event to the server.

   ```js
   socket.emit("join", USER_NAME);
   ```

2. The sever sent the users with a list of available rooms, which is kept track of using a `Set`.

   ```js
   const rooms = new Set();
   ```

   ```js
   socket.on("join", (username) => {
     socket.emit("rooms", [...rooms]);
   });
   ```

3. When users join a room (either when they are starting a new room or after their join request has been approved), they emit an event to the server.

   ```js
   socket.emit("join-room", roomName);
   ```

4. The server put them into that room with `Socket.join` and tell them who else is in the room.

   ```js
   const getPeersInRoom = (roomName) =>
     io.of("/").adapter.rooms.get(roomName) || new Set();
   ```

   ```js
   socket.on("join-room", (roomName) => {
     socket.join(roomName);

     socket.emit("user-list", [...getPeersInRoom(roomName)]);

     // Other events
   });
   ```

5. `MultiPeerConnection` on the client side then relies on this returned list of ids to only connect with users in this room.

   ```js
   socket.on("user-list", (ids) => {
     for (let id of ids) {
       if (id !== this.socket.id) {
         // Create `SimplePeerWrapper` instances for each peer in the same room
       }
     }
   });
   ```

6. All socket events that are only relevant in to room will only be broadcast to the room by the server.

   ```js
   socket.on("remove-stream", () => {
     socket.broadcast.to(CURRENT_ROOM).emit("remove-stream", socket.id);
   });
   ```

7. When a new room has been added or when an exisitng room has been removed, the server will broadcast events to the clients to notify such changes.

   ```js
   socket.on("join-room", (roomName) => {
     if (!rooms.has(roomName)) {
       rooms.add(roomName);
       io.emit("new-room", roomName);
     }

     // Other events
   });
   ```

   ```js
   io.of("/").adapter.on("delete-room", (roomName) => {
     if (rooms.has(roomName)) {
       io.emit("delete-room", roomName);
       rooms.delete(roomName);
     }
   });
   ```

## Request to Join Rooms

Requests to join rooms are done really similar to how I did [reporting and blocking](#reporting-and-blocking) as well.

Several details worth mentioning:

- When the user is still requesting to join a certain room, that room might have already cease to exist (if every in that room has left), so special attention has been paid to take care of such edge cases. My implementation is to allow that after to automatically “restart” the room after the everyone has left the room or when they submitted their request, whichever comes last, instead of giving them an error message and asking them to choose another room.

- A new user will be allowed in a room when simple majority has been reached so the new user might already be in the room as you are still reviewing their join request. Similarly, users can cancel their request to join a room so their request might already be invalidated as you are reviewing it. Special attention has been paid to take care of such edge cases. My implementation is to immediately hide such request as soon as the request has become invalidated.

## Highlighting Speaking User

1. I found [this code from StackOverflow](https://stackoverflow.com/a/64650826) that can measure audio volume using the built-in `AudioContext` API and no additional libraries.

   I restructured the code a bit so that it is easier for me to work on multiple changing audio streams.

   ```js
   function createAudioMeter(stream) {
     try {
       const audioContext = new (AudioContext || webkitAudioContext)();
       const audioSource = audioContext.createMediaStreamSource(stream);
       const analyser = audioContext.createAnalyser();
       analyser.fftSize = 1024;
       analyser.minDecibels = -127;
       analyser.maxDecibels = 0;
       analyser.smoothingTimeConstant = 0.4;
       audioSource.connect(analyser);
       const volumes = new Uint8Array(analyser.frequencyBinCount);
       return () => {
         analyser.getByteFrequencyData(volumes);
         let volumeSum = 0;
         for (const volume of volumes) volumeSum += volume;
         return volumeSum / volumes.length;
       };
     } catch (e) {
       console.error(e);
       return () => NaN;
     }
   }
   ```

2. I created the global variable to store the current audio meter.

   ```js
   let audioMeter = null;
   ```

   When ever I start an audio stream, I update the audio meter with it.

   ```js
   audioMeter = createAudioMeter(stream);
   ```

   When ever I stop the audio stream, I reset the audio meter to a falsy value.

   ```js
   audioMeter = null;
   ```

3. I created a `Map` to store the latest volume data from myself and each peer.

   ```js
   const volumes = new Map();
   ```

4. Every 100ms, I measure my current volume and send it to the peers using the data channel and also store it in my local `Map`.

   ```js
   setInterval(() => {
     if (audioMeter) {
       const meterValue = audioMeter();
       connection.sendData(`${meterValue}`);
       volumes.set(socket.id, meterValue);
     } else {
       connection.sendData("NaN");
       volumes.set(socket.id, NaN);
     }
   }, 100);
   ```

5. Whenever I get an updated volume data, I add it to the `Map` and determine which peer has the loadest volume.

   ```js
   function onData(data, simplePeerWrapper) {
     volumes.set(simplePeerWrapper.socket_id, +data);
     checkVolume();
   }
   ```

   ```js
   function checkVolume() {
     let maxId = null;
     let maxVolume = 0;

     for (let id of volumes.keys()) {
       const volume = volumes.get(id);
       if (volume > maxVolume) {
         maxVolume = volume;
         maxId = id;
       }
     }

     if (maxId && maxId !== socket.id && maxVolume > 35) {
       // Update UI for peer with id `maxId`
     }
   }
   ```

   I only highlight the speaking peer if their volume is their volume is higher than 35 on a scale from 0 to 127.

   I haven’t tested this much since WebRTC is disabled in my dorm and I could only test this with different browser tabs on my laptop.

   I might have to tweak this number a bit, change how frequent the data is sent through the data channel, or perhaps do some preprocessing to average the volume out before sending it.

---

I did not have the time to implement an SFU server for now since the whole subscriber-publisher model is quite a bit different from what we have been doing with `simple-peer` so far, but implementing an SFU server would be one of the first things I’ll do when I get the time to do so.

Besides having an SFU server that relays the video streams, I had also been thinking if I could do more with the server, for example, taking snapshot of each users’ stream every minute, composing snapshots from users in each room to a single image on the server side, perhaps using something like [`node-canvas`](https://github.com/Automattic/node-canvas), and sending the composed snapshot back to the clients as a low-res preview image for the room. I’ll have to see if `mediasoup` supports taking snapshot of the streams, though. If that is not supported, I could just have the clients each take their own snapshot using HTML5 canvas like we did in the first half of the semester and only let the server do the composition work.
