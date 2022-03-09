# Chat Room Pro

**Live Web Midterm Project**

[![Chat Room Pro Video Thumbnail](https://i1.ytimg.com/vi/qD7ZrZYIx18/maxresdefault.jpg)](https://www.youtube.com/watch?v=qD7ZrZYIx18)

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/chat-room-pro) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-chat-room-pro)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/chat-room-pro) & [Glitch](https://mccoy-zhu-chat-room-pro.glitch.me/)

Like I envisioned in my midterm proposal, I developed on my previous chat room assignment and made it safer and more powerful.

I was able to achieve about all the features I wanted add, including randomizing usernames, real-time user list, message reporting and user blocking, photo capture with camera selection and auto on-off, and small cosmetic improvements like tooltips and README.

I also added anothter two useful feature where users can click on an image to enlarge it on the screen, and an alert/notification that will show up at the bottom of the screen if there are any unread new messages (inspiration taken from what Brandon had).

> I decided not to allow users to change usernames because people may abuse it to work around the privacy aspect and act as if they were new users by constantly switching their usernames while still having access to all the previous messages. If you want to change your username, you’ll have to refresh the page and join again, which intentionally wipes out previous messages.

> Last week during the proposal review, one of the classmates pointed out that the IP locating feature would actually go completely against my whole privacy theme so I also scraped that. Somehow I did not realize this when I came up with the proposal.

> Professor pointed out during class on Monday that using the `cursor: pointer;` style may encourage users to accidently unsend or report messages so I made those `cursor: helper;` instead to encourage users to wait for the tooltip to appear and read the text.

Like I said in my midterm proposal, I want this chat room to be a safe and anonymous place for people from all over the world to meet. You just join, chat, and leave. No need to worry about creating accounts or being cyber stalked. There is also a robust system to prevent users from spamming or sending inappropriate messages.

I am more familiar with plain HTML/CSS/JavaScript and I am interested in how WebSocket can add to traditional web-based interaction and how some of the practical real-world features we have seen in chat apps could be implemented through WebSockets, so I did that instead doing something more visual with p5 or canvas.

I also spent a lot of time on CSS and responsive design because it really bugs me if I can’t get the layout right on mobile devices.

The core of this project is pretty simple. A socket.io server and a socket.io client. New text messages, new images, unsending, reporting, and blocking are all done with difference socket events.

## User List

Each user keeps track of their own status like what is their username and when they are last active, and these information are sent to the server at least every 30 seconds.

```javascript
// client side

setInterval(() => {
  socket.emit("heartbeat", {
    username: MY_USER_NAME,
    joinedTime: WHEN_I_JOINED,
    lastActive: WHEN_I_WAS_LAST_ACTIVE,
    isBlocked: AM_I_BLOCKED,
  });
}, 30 * 1000);
```

On the server side, an ES6 Map is used to keep track of the status of all users.

```javascript
// server side

const users = new Map();
```

Everytime a client sends over these status, the server updates what it has.

```javascript
// server side

socket.on("heartbeat", (userStatus) => {
  users.set(socket.id, userStatus);
});
```

At least every minute, the server will broadcast all the data it has obtained to every client.

```javascript
// server side

setInterval(() => {
  io.emit("userlist", [...users.values()]);
}, 60 * 1000);
```

When the clients obtain this list, they will use it to update the visual list on the front end.

```javascript
// client side

socket.on("userlist", (userlist) => {
  // Update HTML based on `userlist`
});
```

If the socket connection ends, the user’s information will be cleared from the server side to preserve memory and hopefully the user still has their information and can send to the server again when they reconnects.

```javascript
// server side

socket.on("disconnect", () => {
  users.delete(socket.id);
});
```

> The actual logic is a bit more complicated in reality, especially with the scheduling of the `"heartbeat"` and `"userlist"` event. For example, when a user who has been inactive for a long time becomes active again, an event is immediately emitted and the server immediately broadcasts the updated user list to every connected client. Similarly, when a user joins, quits, or become blocked, the server immediately broadcast a new list to all connected clients. After each “forced” update, a timer is reset through `clearInterval` so that the client and/or server do not have to emit another event within, say, 10 more seconds, and can wait another full 30 or 60 seconds, respectively.
>
> ```javascript
> // client side
>
> let heartbeatInterval;
>
> function resetHearbeatInterval() {
>   clearInterval(heartbeatInterval);
>   heartbeatInterval = setInterval(() => {
>     // Send heartbeat
>   }, 30 * 1000);
> }
> ```
>
> Furthermore, instead of having to always emit separate `"heartbeat"` or `"userlist"` events, the client and the server can also send the status data in the payload of other events like `"join"` or `"block"` to lower the total number of events to emit.
>
> ```javascript
> // server side
>
> socket.on("block", (data) => {
>   // Update `users` Map with `data`
>
>   // Reset user list broadcasting interval
>
>   const userlist = [...users.values()];
>   socket.emit("userlist", userlist);
>   socket.broadcast.emit("block", data, userlist);
> });
> ```

## Reporting and Blocking

Reporting and blocking is achieved similarly to how user list is achieved.

```javascript
// server side

const reports = new Map();
```

A nested Map is created on the server side to store the number of times each message from each user has been report.

```javascript
{
  "understated-kick": {
    "774aca19ec7e9e90": 1, // Post with this id from understated-kick has been reported once
    "total_removal": 0 // 0 of the posts from understated-kick has been removed
  },
  "ideal-uncertainty": {
    "2e7e7eb512d0187b": 2, // Post with this id from ideal-uncertainty has been reported twice
    "6ffa3fb3cf2e2ec0": 1, // Post with this id from ideal-uncertainty has been reported once
    "total_removal": 1 // 1 of the posts from ideal-uncertainty has been removed
  },
  "last-bisector": {
    "766e2beda16c102a": 2, // Post with this id from last-bisector has been reported twice
    "total_removal": 0 // 0 of the posts from last-bisector has been removed
  }
}
```

If a message has been reported 3 times or more or if more than 50% of all active users other than the sender has reported a message, this message will be deemed as inappropriate and will be removed from every user’s history.

Everytime a user has had their message removed, this Map will also be updated. If a user has had more than 5 messages removed in the past 5 minutes, a `"server-block"` event will be emitted by the server and the client who has a matching username will be restrained from sending messages for an exponentially growing number of minutes (ie. 1, 2, 4, 8, etc.) each time they become blocked.

```javascript
// server side

socket.on("report", ({ sender, id }) => {
  // Update `reports` Map and do some computation

  if (THIS_MESSAGE_HAS_BEEN_REPORTED_A_LOT) {
    if (THIS_SENDER_HAS_HAD_MANY_MESSAGES_REMOVED) {
      io.emit("server-block", {
        username: sender,
        duration: TIME_TO_BLOCK,
      });
    } else {
      io.emit("remove", { sender, id });
    }
  }
});
```

To prevent disconnected users from being blocked indefinitely, clients actually keep a timer themselves and unblock themselves by emitting an `"unblock"` event to the server when the time comes instead of listening for such event from the server.

```javascript
// Client side

socket.on("server-block", ({ username, duration }) => {
  if (username === MY_USER_NAME) {
    // Block myself for `duration` minutes

    setTimeout(() => {
      socket.emit("unblock", { username: MY_USER_NAME });
    }, duration * 60 * 1000);
  }

  // Updates HTML, remove all messages from `username`
});
```

> As explained earlier in the [User List section](#user-list), the user list and user status are actually contained in the payload of some of these events as well, but they are removed here for the sake of simplicity. Furthermore, users might be blocked again before getting unblocked so in reality we have to do a `clearTimeout` to reset timers as well.
>
> ```javascript
> // client side
>
> let serverBlockTimeout;
>
> function resetServerUnblock(duration) {
>   clearTimeout(serverBlockTimeout);
>   serverBlockTimeout = setTimeout(() => {
>     socket.emit("unblock", { username: MY_USER_NAME });
>   }, duration * 60 * 1000);
> }
> ```

## Camera Selection

With the `MediaDevices.enumerateDevices()` API, a list of all available inputs is obtained and an HTML `<select>` element is updated with available video streams as `<option>` child nodes.

```javascript
navigator.mediaDevices.enumerateDevices().then((devices) => {
  const videoDevices = devices.filter((e) => e.kind === "videoinput");
  // Update `<select>` HTML with `videoDevices`
});
```

```html
<select>
  <option value="Front Camera">Front Camera</option>
  <option value="Back Camera">Back Camera</option>
</select>
```

When the user select a video stream, the `deviceId` of that stream will be used in the `getUserMedia` call to start that specific stream. The name of the stream will also be cached so that the next time the user start the stream, the system will try to use the same camera.

```javascript
navigator.mediaDevices
  .getUserMedia({
    audio: false,
    video: { deviceId: PREFERRED_DEVICE_ID },
  })
  .then((stream) => {
    captureVideoEl.srcObject = stream;
  });
```

> In reality, things are, again, a bit more complicated. `deviceId`s returned by `enumerateDevices` seem to be only valid for a limited amount of time. After a while, all previously returned `deviceId`s seem to be all invalidated. To circumvent this, I actually keep track of the `label` of the preferred device (eg. `"Front Camera"`), and, when the user wants to start the video capture, I call `enumerateDevices` first, find the device whose `label` matches, and call `getUserMedia` with the `deviceId` of that device. Another limitation is that browsers do not give you a `deviceId` after calling `enumerateDevices` if you have never called `getUserMedia` and gained the user’s camera permission before, or if your last `getUserMedia` call was a very long time ago, so I have to start the capture with a random camera first, and if the camera happens to be a different one from what the user selected last time, try to end the video stream, look for the correct `deviceId`, and start another stream. If the preferred stream still cannot be selected, then I will stop retrying instead of possibly getting stuck in an infintie loop.

## Turning Camera Off

Turning camera capture off is actually pretty straightforward. You can just iterate through the `MediaStreamTrack`s in the `srcObject` of the `<video>` element by calling the `MediaStream.getTracks()` API, stop each track, and remove the track from the video stream. Once all tracks have been removed (there should actually only be one if we have video-only stream), the capture will stop and the green camera-indicator on Macs will also shut down.

```javascript
captureVideoEl.srcObject.getTracks().forEach((e) => {
  e.stop();
  captureVideoEl.srcObject.removeTrack(e);
});

captureVideoEl.srcObject = undefined;
```

## Randomized Username

I originally used the random word API [random-word-api.herokuapp.com](https://random-word-api.herokuapp.com/word?number=2&swear=0) that can return an array of random words and I chained them together to form the username.

```javascript
fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0")
  .then((res) => res.json())
  .then((words) => {
    usernameInput.value = words.join("-");
  });
```

However, words returned by this API is completely random and what show up are often words I don’t know. Later on, I switch to another API [random-word-form.herokuapp.com](https://random-word-form.herokuapp.com/random) that allows you to choose adjectives or nouns and I start to use this one by default and only use the other one mentioned earlier as a fail-safe if this one does not work.

```javascript
Promise.all(
  ["adjective", "noun"].map((e) =>
    fetch(`https://random-word-form.herokuapp.com/random/${e}`)
      .then((res) => res.json())
      .then(([word]) => word)
  )
)
  .then((words) => {
    usernameInput.value = words.join("-");
  })
  .catch(() => {
    // Call the fail-safe API
  });
```

The only limitation with this API is that adjectives and nouns cannot be generated with a single API call so I had to do a `Promise.all` to wait for both API calls to resolve.

## Automatic Message Scrolling

Scrolling is actually really easy with only one line of code.

```javascript
messages.scrollIntoView(false);
```

This will scroll the `messages` element so that its bottom is visible.

The only issue is that images require some time to load and if I call this function as soon as I have the Base64 data set to the `src` attribute of an `<image>`, the image would still have zero height and I may scroll a couple hundred pixel fewer than necessary.

What’s more, because I only automatically scroll the messages if the user has already scrolled to almost the end of the messages or for certain important events like when the current user has been blocked, this couple hundred pixels will very likely prevent the messages from ever scrolling again until the user manually scroll to the end.

```javascript
function scrollBottom(el) {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

if (scrollBottom(messageArea) <= 25 || IMPORTANT_EVENT_OCCURRED) {
  messages.scrollIntoView(false);
}
```

What I did was that I listen for the images’ `"load"` event and only scroll after the images have finished loading, assuming that there really is an image.

```javascript
function scrollMessages(e) {
  if (e.target.tagName === "IMG") {
    messages.scrollIntoView(false);
  }
  messageEl.removeEventListener("load", scrollMessages, true);
}

if (MESSAGE_CONTAINS_IMAGE) {
  messageEl.addEventListener("load", scrollMessages, true);
} else {
  messages.scrollIntoView(false);
}
```

Instead of having an event listener on the `<image>` itself, I added the listner on its parent element `messageEl` that I have direct acess to so that I don’t need to write extra code to go down the DOM tree.

I remove the event listener as soon as the event listener has been fired once to prevent any possible reloads from unintentioanlly scrolling the messages.

I added a new listner each time an image is added because not all images would “force” a scroll and if I added the event listner higher up in the hierarchy and never remove it, each image load will force a scroll, which is not what I want.

---

In the future, it would seem natural to me if I can add more advanced chat app features like sending voice messages, recording videos, sending images and videos stored on users’ device/photo library, and maybe even making voice calls and video calls with SFUs.

I orignally thought about adding DM/PM, replying, @ing, #ing, and message searching. However, most of these features seem to have not a lot to do with sockets and will be a nightmare for me to structure, design, and layout, so I’ll probably skip them for now. DM/PM is nice to have but may require too much changes on the front-end and may complicate the navigation too much especially for the mobile side.

Jiwon’s idea of adding translation is wonderful but I may just do it the conventional way, using some translation API to convert foriegn languages to a language of the user’s choice. However, too many API calls may be needed if every message is automatically translated, so I’ll probably have to translate on-demand for what users choose.
