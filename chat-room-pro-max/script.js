const enableSocket = true;
const socket =
  enableSocket && io.connect("https://mccoy-zhu-chat-room-pro-max.glitch.me/");

window.addEventListener("DOMContentLoaded", () => {
  let joinedTime;
  let lastActive = null;
  let username = "";
  let lastMessageSender = null;
  let lastMessageSentAt = 0;
  let actionCount = 0;
  let blockedTime = 0.5;
  let heartbeatInterval;

  const introForm = document.getElementById("intro-form");
  const setupForm = document.getElementById("setup-form");
  const usernameInput = document.getElementById("username");
  const generateBtn = document.getElementById("generate-random");
  const messageArea = document.getElementById("message-area");
  const messages = document.getElementById("messages");
  const usersEl = document.getElementById("users");
  const sendForm = document.getElementById("send-form");
  const sendInputs = sendForm.querySelectorAll("input");

  function resetHearbeatInterval() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if ((!lastActive || Date.now() - lastActive < 30 * 1000) && username) {
        enableSocket &&
          socket.emit("heartbeat", {
            username,
            joinedTime,
            isBlocked: isBlocked(),
          });
      }
    }, 30 * 1000);
  }

  function isBlocked() {
    return document.body.classList.contains("blocked");
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

  function handleActionCount() {
    const shouldBlock = actionCount >= 15;

    if (shouldBlock && !isBlocked()) {
      blockedTime *= 2;

      sendInputs.forEach((e) => {
        e.disabled = true;
      });

      enableSocket && resetHearbeatInterval();
      enableSocket && socket.emit("block", { username, duration: blockedTime });
      block(username, blockedTime, true);
      document.body.classList.add("blocked");

      setTimeout(() => {
        sendInputs.forEach((e) => {
          e.disabled = false;
        });

        enableSocket && resetHearbeatInterval();
        enableSocket && socket.emit("unblock", username);
        unblock(username, true);
        document.body.classList.remove("blocked");
      }, 1000 * 60 * blockedTime);
    }
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

  function messageElement(message, type = "other", sender = null, id = null) {
    const shouldHideMetadata =
      sender === lastMessageSender &&
      Date.now() - lastMessageSentAt < 30 * 1000;

    lastMessageSender = sender;
    lastMessageSentAt = Date.now();

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    if (id) messageDiv.id = id;

    const metadata = document.createElement("span");
    metadata.className = `metadata${shouldHideMetadata ? " hidden" : ""}`;
    if (sender) {
      metadata.appendChild(strongNode(sender));
      metadata.appendChild(textNode(" at "));
    }
    metadata.appendChild(textNode(dateToString(new Date())));

    const content = document.createElement("span");
    content.className = "content";
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
    enableSocket && socket.emit("post", { message, sender: username, id });
    appendMessage(messageElement(message, "sent", username, id), true);
  }

  function receiveMessage(message, sender, id) {
    appendMessage(messageElement(message, "received", sender, id));
  }

  function unsendMessage(user) {
    appendMessage(
      messageElement([strongNode(user), textNode(" unsent a message.")])
    );
  }

  function removeMessage(id) {
    const el = document.getElementById(id);

    if (el) {
      if (el.nextSibling && !el.children[0].classList.contains("hidden")) {
        el.nextSibling.children[0].classList.remove("hidden");
      }

      el.remove();
    }

    return !!el;
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

  function updateUserlist(userlist) {
    if (!userlist) return;

    const activeUsers = [];
    const inactiveUsers = [];
    const blockedUsers = [];

    for (let user of userlist) {
      if (user.isBlocked) {
        blockedUsers.push(user);
      } else if (Date.now() - user.lastActive < 90 * 1000) {
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
      resultHtml += "<h3>Active:</h3>";
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
      resultHtml += "<h3>Inactive:</h3>";
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
      resultHtml += "<h3>Blocked:</h3>";
      for (let user of blockedUsers) {
        resultHtml += `<div class="user">
        <span class="status blocked"></span>
        <div>
          <span class="username">${user.username}</span>
          <span class="metadata">Joined at ${dateToString(
            new Date(user.joinedTime)
          )}</span>
          <span class="metadata">${
            Date.now() - user.lastActive < 60 * 1000
              ? "Active Now"
              : `Last Active ${dateToString(new Date(user.lastActive))}`
          }</span>
        </div>
      </div>`;
      }
    }

    usersEl.innerHTML = resultHtml;
  }

  enableSocket &&
    socket.on("post", ({ message, sender, id }, userlist) => {
      receiveMessage(message, sender, id);
      updateUserlist(userlist);
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
    socket.on("unblock", (username, userlist) => {
      unblock(username);
      updateUserlist(userlist);
    });

  enableSocket &&
    socket.on("unsend", ({ sender, id }, userlist) => {
      if (removeMessage(id)) {
        unsendMessage(sender);
      }
      updateUserlist(userlist);
    });

  enableSocket &&
    socket.on("reconnect", () => {
      if (username) {
        joinRoom(username);
        enableSocket && resetHearbeatInterval();
        enableSocket &&
          socket.emit("join", {
            username,
            joinedTime,
            lastActive,
            isBlocked: isBlocked(),
          });
      }
    });

  enableSocket &&
    socket.on("disconnect", () => {
      if (username) {
        leaveRoom(username);
      }
    });

  enableSocket &&
    socket.on("userlist", (userlist) => {
      updateUserlist(userlist);
    });

  introForm.addEventListener("submit", (e) => {
    e.preventDefault();
    document.body.classList.remove("intro");
    document.body.classList.add("setting-up");
    introForm.parentNode.remove();
  });

  generateBtn.addEventListener("click", () => {
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
      username = `${name}^${randomNumber(3)}`;
      joinedTime = Date.now();
      joinRoom(username);
      document.body.classList.remove("setting-up");
      document.body.classList.add("chatting");
      enableSocket && resetHearbeatInterval();
      enableSocket &&
        socket.emit("join", {
          username,
          joinedTime,
          lastActive,
          isBlocked: isBlocked(),
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

  messages.addEventListener("dblclick", (e) => {
    if (document.body.classList.contains("blocked")) {
      return;
    }

    const target = e.target;
    if (target.classList.contains("content")) {
      const parent = target.parentElement;
      const id = parent.id;

      if (id && parent.classList.contains("sent")) {
        removeMessage(id);

        enableSocket && resetHearbeatInterval();
        enableSocket && socket.emit("unsend", { sender: username, id });
        unsendMessage(username);
        didNewAction();
      }
    }
  });

  window.addEventListener("focus", () => {
    if (Date.now() - lastActive > 30 * 1000 && username) {
      enableSocket && resetHearbeatInterval();
      enableSocket &&
        socket.emit("back", {
          username,
          joinedTime,
          isBlocked: isBlocked(),
        });
    }
    lastActive = null;
  });

  window.addEventListener("blur", () => {
    lastActive = Date.now();
  });
});
