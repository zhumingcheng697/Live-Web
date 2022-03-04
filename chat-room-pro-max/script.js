const enableSocket = false;
const socket =
  enableSocket && io.connect("https://mccoy-zhu-chat-room-pro-max.glitch.me/");

const addClickOrKeyListener = (target, listener) => {
  target.addEventListener("click", listener);
  target.addEventListener("keypress", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      listener(e);
    }
  });
};

const addDoubleClickOrKeyListener = (target, listener) => {
  let lastTime = null;
  let lastTarget = null;
  target.addEventListener("dblclick", listener);
  target.addEventListener("keypress", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (lastTime && Date.now() - lastTime < 500 && lastTarget == e.target) {
        listener(e);
      }
    }
    lastTime = Date.now();
    lastTarget = e.target;
  });
};

window.addEventListener("DOMContentLoaded", () => {
  let joinedTime;
  let lastActive = null;
  let myUsername = "";
  let lastMessageSender = null;
  let lastMessageSentAt = 0;
  let actionCount = 0;
  let blockedTime = 0.5;
  let heartbeatInterval;
  let serverBlockTimeout;

  const introForm = document.getElementById("intro-form");
  const setupForm = document.getElementById("setup-form");
  const usernameInput = document.getElementById("username");
  const generateBtn = document.getElementById("generate-random");
  const messageArea = document.getElementById("message-area");
  const messages = messageArea.querySelector("#messages");
  const usersEl = document.getElementById("users");
  const showHideUserEl = document.querySelector(
    "#user-header-area > span[tabindex]"
  );
  const showUserEl = showHideUserEl.querySelector("#show-all-user");
  const sendForm = document.getElementById("send-form");
  const sendInputs = sendForm.querySelectorAll("input");

  function resetHearbeatInterval() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (
        (!lastActive || Date.now() - lastActive < 30 * 1000) &&
        myUsername &&
        joinedTime
      ) {
        enableSocket &&
          socket.emit("heartbeat", {
            username: myUsername,
            joinedTime,
            isBlocked: isBlocked() || isSeverBlocked(),
          });
      }
    }, 30 * 1000);
  }

  function isBlocked() {
    return document.body.classList.contains("blocked");
  }

  function isSeverBlocked() {
    return document.body.classList.contains("server-blocked");
  }

  function textNode(text) {
    return document.createTextNode(text);
  }

  function strongNode(text) {
    const node = document.createElement("strong");
    node.appendChild(textNode(text));

    return node;
  }

  function didNewAction() {
    ++actionCount;
    handleActionCount();

    setTimeout(() => {
      --actionCount;
    }, 1000 * 30);
  }

  function resetInputs(enable) {
    messages
      .querySelectorAll(".message[id][data-sender]:not(.other) > .content")
      .forEach((e) => {
        if (enable) {
          e.tabIndex = 0;
        } else {
          e.removeAttribute("tabindex");
        }
      });

    sendInputs.forEach((e) => {
      e.disabled = !enable;
    });
  }

  function unblockMyself() {
    resetInputs(true);

    enableSocket && resetHearbeatInterval();
    enableSocket &&
      socket.emit("unblock", { username: myUsername, lastActive });
    unblock(myUsername, true);
  }

  function handleActionCount() {
    const shouldBlock = actionCount >= 15;

    if (shouldBlock && !isBlocked()) {
      blockedTime *= 2;

      resetInputs(false);

      enableSocket && resetHearbeatInterval();
      enableSocket &&
        socket.emit("block", {
          username: myUsername,
          duration: blockedTime,
          lastActive,
        });
      block(myUsername, blockedTime, true);
      document.body.classList.add("blocked");

      setTimeout(() => {
        document.body.classList.remove("blocked");
        if (!isSeverBlocked()) {
          unblockMyself();
        }
      }, 1000 * 60 * blockedTime);
    }
  }

  function serverBlockMyself(duration) {
    resetInputs(false);

    clearTimeout(serverBlockTimeout);
    document.body.classList.add("server-blocked");
    serverBlockTimeout = setTimeout(() => {
      document.body.classList.remove("server-blocked");
      if (!isBlocked()) {
        unblockMyself();
      }
    }, 1000 * 60 * duration);
  }

  function randomNumber(n, base = 10) {
    return [...Array(n)]
      .map(() => Math.floor(Math.random() * base).toString(base))
      .join("");
  }

  function dateToString(date) {
    const today = new Date();
    const showYear = today.getFullYear() != date.getFullYear();
    let showDate =
      showYear ||
      today.getMonth() != date.getMonth() ||
      today.getDate() != date.getDate();
    return date.toLocaleString(undefined, {
      year: showYear ? "numeric" : undefined,
      month: showDate ? "numeric" : undefined,
      day: showDate ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function scrollBottom(el) {
    return el.scrollHeight - el.clientHeight - el.scrollTop;
  }

  function messageElement(
    message,
    type,
    sender = null,
    id = null,
    socketId = null
  ) {
    const shouldHideMetadata =
      sender === lastMessageSender &&
      Date.now() - lastMessageSentAt < 30 * 1000;

    lastMessageSender = sender;
    lastMessageSentAt = Date.now();

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type || "other"}`;
    if (id) messageDiv.id = id;

    const metadata = document.createElement("span");
    metadata.className = `metadata${shouldHideMetadata ? " hidden" : ""}`;
    if (sender) {
      metadata.appendChild(strongNode(sender));
      metadata.appendChild(textNode(" at "));
      messageDiv.dataset.sender = sender;
    }
    if (socketId) {
      messageDiv.dataset.socketId = socketId;
    }
    metadata.appendChild(textNode(dateToString(new Date())));

    const content = document.createElement("span");
    content.className = "content";
    if (type) content.tabIndex = 0;
    if (Array.isArray(message)) {
      message.forEach((e) => {
        content.appendChild(e);
      });
    } else {
      content.appendChild(textNode(message));
    }

    messageDiv.appendChild(metadata);
    messageDiv.appendChild(content);

    return messageDiv;
  }

  function appendMessage(messageEl, forceScroll = false) {
    const pScrollBottom = scrollBottom(messageArea);
    messages.appendChild(messageEl);

    if (pScrollBottom <= 25 || forceScroll) {
      messages.scrollIntoView(false);
    }
  }

  function sendMessage(message) {
    const id = randomNumber(16, 16);
    enableSocket && resetHearbeatInterval();
    enableSocket && socket.emit("post", { message, sender: myUsername, id });
    appendMessage(messageElement(message, "sent", myUsername, id), true);
  }

  function receiveMessage(message, sender, id, socketId) {
    appendMessage(messageElement(message, "received", sender, id, socketId));
  }

  function unsendMessage(user) {
    appendMessage(
      messageElement([strongNode(user), textNode(" unsent a message.")])
    );
  }

  function removeMessage(user) {
    appendMessage(
      messageElement([
        textNode("An inappropriate message from "),
        strongNode(user),
        textNode(" has been removed."),
      ])
    );
  }

  function reportMessage() {
    appendMessage(
      messageElement([
        strongNode(myUsername),
        textNode(" reported a message."),
        document.createElement("br"),
        textNode("(This notification is only visible to you)"),
      ])
    );
  }

  function removePost(id) {
    const el = document.getElementById(id);

    if (el) {
      if (el.nextSibling && !el.children[0].classList.contains("hidden")) {
        el.nextSibling.children[0].classList.remove("hidden");
      }

      el.remove();
    }

    return !!el;
  }

  function removeAllPost(username) {
    messages
      .querySelectorAll(`div.message[data-sender="${username}"]`)
      .forEach((e) => {
        e.remove();
      });
  }

  function joinRoom(user) {
    appendMessage(
      messageElement([strongNode(user), textNode(" joined the room.")])
    );
  }

  function leaveRoom(user) {
    appendMessage(
      messageElement([strongNode(user), textNode(" left the room.")])
    );
  }

  function block(user, duration, forceScroll = false) {
    appendMessage(
      messageElement([
        strongNode(user),
        textNode(
          ` is blocked for ${duration} min for sending or unsending too many messages.`
        ),
      ]),
      forceScroll
    );
  }

  function unblock(user, forceScroll = false) {
    appendMessage(
      messageElement([strongNode(user), textNode(" is now unblocked.")]),
      forceScroll
    );
  }

  function serverBlock(user, duration, forceScroll = false) {
    appendMessage(
      messageElement([
        strongNode(user),
        textNode(
          ` is blocked for ${duration} min for sending inappropriate messages.`
        ),
        document.createElement("br"),
        textNode("All their previous messages have been removed."),
      ]),
      forceScroll
    );
  }

  function updateUserlist(userlist) {
    if (!userlist) return;

    const activeUsers = [];
    const inactiveUsers = [];
    const blockedUsers = [];

    for (let user of userlist) {
      if (user.isBlocked) {
        blockedUsers.push(user);
      } else if (Date.now() - user.lastActive < 45 * 1000) {
        activeUsers.push(user);
      } else {
        inactiveUsers.push(user);
      }
    }

    activeUsers.sort((a, b) => (a.username < b.username ? -1 : 1));
    inactiveUsers.sort((a, b) => (a.username < b.username ? -1 : 1));
    blockedUsers.sort((a, b) => (a.username < b.username ? -1 : 1));

    let resultHtml = "";

    if (activeUsers.length) {
      resultHtml += `<h3>Active (${activeUsers.length}):</h3>`;
      for (let user of activeUsers) {
        resultHtml += `<div class="user">
        <span class="status active"></span>
        <div>
          <span class="username">${user.username}</span>
          <span class="metadata">Joined at ${dateToString(
            new Date(user.joinedTime)
          )}</span>
          <span class="metadata">Active Now</span>
        </div>
      </div>`;
      }
    }

    if (inactiveUsers.length) {
      resultHtml += `<h3>Inactive (${inactiveUsers.length}):</h3>`;
      for (let user of inactiveUsers) {
        resultHtml += `<div class="user">
        <span class="status inactive"></span>
        <div>
          <span class="username">${user.username}</span>
          <span class="metadata">Joined at ${dateToString(
            new Date(user.joinedTime)
          )}</span>
          <span class="metadata">Last Active ${dateToString(
            new Date(user.lastActive)
          )}</span>
        </div>
      </div>`;
      }
    }

    if (blockedUsers.length) {
      resultHtml += `<h3>Blocked (${blockedUsers.length}):</h3>`;
      for (let user of blockedUsers) {
        resultHtml += `<div class="user">
        <span class="status blocked"></span>
        <div>
          <span class="username">${user.username}</span>
          <span class="metadata">Joined at ${dateToString(
            new Date(user.joinedTime)
          )}</span>
          <span class="metadata">${
            Date.now() - user.lastActive < 45 * 1000
              ? "Active Now"
              : `Last Active ${dateToString(new Date(user.lastActive))}`
          }</span>
        </div>
      </div>`;
      }
    }

    const userCount = userlist.length;
    showUserEl.innerHTML = `${userCount} User${
      userCount === 1 ? "" : "s"
    } Online &rsaquo;`;

    usersEl.innerHTML = resultHtml;
  }

  enableSocket &&
    socket.on("post", ({ message, sender, id, socketId }) => {
      receiveMessage(message, sender, id, socketId);
    });

  enableSocket &&
    socket.on("unsend", ({ sender, id }) => {
      if (removePost(id)) {
        unsendMessage(sender);
      }
    });

  enableSocket &&
    socket.on("remove", ({ sender, id }) => {
      if (removePost(id)) {
        removeMessage(sender);
      }
    });

  enableSocket &&
    socket.on("join", (username, userlist) => {
      joinRoom(username);
      updateUserlist(userlist);
    });

  enableSocket &&
    socket.on("leave", (username, userlist) => {
      leaveRoom(username);
      updateUserlist(userlist);
    });

  enableSocket &&
    socket.on("block", ({ username, duration }, userlist) => {
      block(username, duration);
      updateUserlist(userlist);
    });

  enableSocket &&
    socket.on("unblock", ({ username }, userlist) => {
      unblock(username);
      updateUserlist(userlist);
    });

  enableSocket &&
    socket.on("server-block", ({ username, duration }, userlist) => {
      serverBlock(username, duration);
      removeAllPost(username);
      updateUserlist(userlist);

      if (username === myUsername) {
        serverBlockMyself(duration);
      }
    });

  enableSocket &&
    socket.on("reconnect", () => {
      if (myUsername && joinedTime) {
        joinRoom(myUsername);
        enableSocket && resetHearbeatInterval();
        enableSocket &&
          socket.emit("join", {
            username: myUsername,
            joinedTime,
            lastActive,
            isBlocked: isBlocked() || isSeverBlocked(),
          });
      }
    });

  enableSocket &&
    socket.on("disconnect", () => {
      document.body.classList.add("connecting");
      usersEl.innerHTML = "<h3>Connecting to Server…</h3>";
      if (myUsername && joinedTime) {
        leaveRoom(myUsername);
      }
    });

  enableSocket &&
    socket.on("userlist", (userlist) => {
      document.body.classList.remove("connecting");
      updateUserlist(userlist);
    });

  introForm.addEventListener("submit", (e) => {
    e.preventDefault();
    document.body.classList.remove("intro");
    document.body.classList.add("setting-up");
    introForm.parentNode.remove();
  });

  addClickOrKeyListener(generateBtn, () => {
    if (generateBtn.classList.contains("disabled")) return;

    generateBtn.classList.add("disabled");

    fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0")
      .then((res) => res.json())
      .then((txt) => {
        usernameInput.value = txt.join("-");
      })
      .finally(() => {
        generateBtn.classList.remove("disabled");
      });
  });

  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = e.target.username.value;
    if (name) {
      myUsername = `${name}^${randomNumber(3)}`;
      joinedTime = Date.now();
      joinRoom(myUsername);
      document.body.classList.remove("setting-up");
      document.body.classList.add("chatting");
      enableSocket && resetHearbeatInterval();
      enableSocket &&
        socket.emit("join", {
          username: myUsername,
          joinedTime,
          lastActive,
          isBlocked: isBlocked() || isSeverBlocked(),
        });
      setupForm.parentNode.remove();
    }
  });

  sendForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const el = e.target.message;
    if (el.value) {
      sendMessage(el.value);
      didNewAction();

      el.value = "";
    }
  });

  addClickOrKeyListener(showHideUserEl, () => {
    document.body.classList.toggle("show-users");
  });

  document.addEventListener("click", (e) => {
    const activeEl = document.activeElement;
    if (
      [document.body, messageArea, messages].includes(e.target) &&
      activeEl.tagName === "INPUT" &&
      activeEl.type === "text"
    ) {
      activeEl.blur();
    }
  });

  addDoubleClickOrKeyListener(messages, (e) => {
    if (
      document.body.classList.contains("blocked") ||
      document.body.classList.contains("server-blocked")
    ) {
      return;
    }

    const target = e.target;
    if (target.classList.contains("content")) {
      const parent = target.parentElement;
      const id = parent.id;
      const sender = parent.dataset.sender;

      if (id && sender && !parent.classList.contains("other")) {
        removePost(id);
        enableSocket && resetHearbeatInterval();

        if (parent.classList.contains("sent")) {
          enableSocket && socket.emit("unsend", { sender: myUsername, id });
          unsendMessage(myUsername);
          didNewAction();
        } else {
          const socketId = parent.dataset.socketId;
          enableSocket && socket.emit("report", { sender, id, socketId });
          reportMessage();
        }
      }
    }
  });

  window.addEventListener("focus", () => {
    if (Date.now() - lastActive > 30 * 1000 && myUsername && joinedTime) {
      enableSocket && resetHearbeatInterval();
      enableSocket &&
        socket.emit("back", {
          username: myUsername,
          joinedTime,
          isBlocked: isBlocked() || isSeverBlocked(),
        });
    }
    lastActive = null;
  });

  window.addEventListener("blur", () => {
    lastActive = Date.now();
  });
});
