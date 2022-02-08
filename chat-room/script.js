const socket = io.connect("https://mccoy-zhu-chat-room.glitch.me/");

window.addEventListener("DOMContentLoaded", () => {
  let username = "";
  let lastMessageSender = null;
  let lastMessageSentAt = 0;
  let actionCount = 0;
  let blockedTime = 0.5;

  const setupForm = document.getElementById("setup-form");
  const messageArea = document.getElementById("message-area");
  const messages = document.getElementById("messages");
  const sendForm = document.getElementById("send-form");
  const sendInputs = sendForm.querySelectorAll("input");

  function didNewAction() {
    ++actionCount;
    handleActionCount();

    setTimeout(() => {
      --actionCount;
    }, 1000 * 30);
  }

  function handleActionCount() {
    const shouldBlock = actionCount >= 15;
    const alreadyBlocked = document.body.classList.contains("blocked");

    if (shouldBlock && !alreadyBlocked) {
      blockedTime *= 2;

      sendInputs.forEach((e) => {
        e.disabled = true;
      });

      socket.emit("block", { username, duration: blockedTime });
      block(username, blockedTime, true);
      document.body.classList.add("blocked");

      setTimeout(() => {
        sendInputs.forEach((e) => {
          e.disabled = false;
        });

        socket.emit("unblock", username);
        unblock(username, true);
        document.body.classList.remove("blocked");
      }, 1000 * 60 * blockedTime);
    }
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function randomNumber(n, base = 10) {
    return [...Array(n)]
      .map(() => Math.floor(Math.random() * base).toString(base))
      .join("");
  }

  function dateToString(date) {
    return date.toLocaleString(undefined, {
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

    return `<div class="message ${type}"${
      id ? ` id="${id}"` : ""
    }><span class="metadata${shouldHideMetadata ? " hidden" : ""}">${
      sender ? `<strong>${sender}</strong> at ` : ""
    }${dateToString(
      new Date()
    )}</span><pre class="content">${message}</pre></div>`;
  }

  function appendMessage(messageEl, forceScroll = false) {
    const pScrollBottom = scrollBottom(messageArea);
    messages.innerHTML += messageEl;

    if (pScrollBottom <= 25 || forceScroll) {
      messages.scrollIntoView(false);
    }
  }

  function sendMessage(message) {
    const id = randomNumber(16, 16);
    socket.emit("post", { message, sender: username, id });
    appendMessage(messageElement(message, "sent", username, id), true);
  }

  function receiveMessage(message, sender, id) {
    appendMessage(messageElement(message, "received", sender, id));
  }

  function unsendMessage(user) {
    appendMessage(messageElement(`<strong>${user}</strong> unsent a message.`));
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
    appendMessage(messageElement(`<strong>${user}</strong> joined the room.`));
  }

  function leaveRoom(user) {
    appendMessage(messageElement(`<strong>${user}</strong> left the room.`));
  }

  function block(user, duration, forceScroll = false) {
    appendMessage(
      messageElement(
        `<strong>${user}</strong> is blocked for ${duration} min for sending or unsending too many messages.`
      ),
      forceScroll
    );
  }

  function unblock(user, forceScroll = false) {
    appendMessage(
      messageElement(`<strong>${user}</strong> is now unblocked.`),
      forceScroll
    );
  }

  socket.on("post", ({ message, sender, id }) => {
    receiveMessage(message, sender, id);
  });

  socket.on("join", (username) => {
    joinRoom(username);
  });

  socket.on("leave", (username) => {
    leaveRoom(username);
  });

  socket.on("block", ({ username, duration }) => {
    block(username, duration);
  });

  socket.on("unblock", (username) => {
    unblock(username);
  });

  socket.on("unsend", ({ sender, id }) => {
    if (removeMessage(id)) {
      unsendMessage(sender);
    }
  });

  socket.on("reconnect", () => {
    if (username) {
      joinRoom(username);
      socket.emit("join", username);
    }
  });

  socket.on("disconnect", () => {
    if (username) {
      leaveRoom(username);
    }
  });

  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = e.target.username.value;
    if (name) {
      username = `${escapeHtml(name)}^${randomNumber(3)}`;
      joinRoom(username);
      document.body.classList.remove("setting-up");
      document.body.classList.add("chatting");
      socket.emit("join", username);
      setupForm.remove();
    }
  });

  sendForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const el = e.target.message;
    if (el.value) {
      sendMessage(escapeHtml(el.value));
      didNewAction();

      el.value = "";
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

        socket.emit("unsend", { sender: username, id });
        unsendMessage(username);
        didNewAction();
      }
    }
  });
});
