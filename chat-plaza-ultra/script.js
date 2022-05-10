function randomNumber(n, base = 10) {
  return [...Array(n)]
    .map(() => Math.floor(Math.random() * base).toString(base))
    .join("");
}

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

const addClickOrKeyListener = (target, listener) => {
  target.addEventListener("click", listener);
  target.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      listener(e);
    }
  });
};

const addDoubleClickOrKeyListener = (
  target,
  doubleListner = () => {},
  singleListener = () => {},
  timeout = 300
) => {
  let lastMouseTime = null;
  let lastMouseTarget = null;
  let lastMouseTimeoutId;
  target.addEventListener("mousedown", (e) => {
    e.preventDefault();
    clearTimeout(lastMouseTimeoutId);

    if (lastMouseTarget == e.target && Date.now() - lastMouseTime < timeout) {
      doubleListner(e);
    } else {
      lastMouseTimeoutId = setTimeout(() => {
        singleListener(e);
      }, timeout);
    }

    lastMouseTime = Date.now();
    lastMouseTarget = e.target;
  });

  let lastKeyTime = null;
  let lastKeyTarget = null;
  let lastKeyTimeoutId;
  target.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      clearTimeout(lastKeyTimeoutId);
      if (lastKeyTarget == e.target && Date.now() - lastKeyTime < timeout) {
        doubleListner(e);
      } else {
        lastKeyTimeoutId = setTimeout(() => {
          singleListener(e);
        }, timeout);
      }
    }
    lastKeyTime = Date.now();
    lastKeyTarget = e.target;
  });
};

window.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect("https://mccoy-zhu-chat-plaza-ultra.glitch.me/");
  const mediaToPlay = new Set();

  const blockRecord = new Map();

  const cameraOffText = "- Camera Off -";
  const micOffText = "- Mic Off -";
  const autoPlayText = "Unable to auto-play audio. Click anywhere to play.";

  let isDisconnected = false;

  let myUsername = "";
  let preferredAudioLabel;
  let preferredVideoLabel;

  let idToReport;
  let usernameToReport;
  let roomTopic;
  let isRequestSent = false;

  let audioMeter = null;

  const volumes = new Map();
  const requests = new Map();

  const isInRoom = () =>
    document.documentElement.classList.contains("chatting");

  const isRequesting = () =>
    document.documentElement.classList.contains("requesting");

  const getInsets = () => {
    const computedStyle = window.getComputedStyle(document.documentElement);
    return {
      left: parseInt(computedStyle.getPropertyValue("--inset-left")),
      right: parseInt(computedStyle.getPropertyValue("--inset-right")),
      top: parseInt(computedStyle.getPropertyValue("--inset-top")),
      bottom: parseInt(computedStyle.getPropertyValue("--inset-bottom")),
    };
  };

  const introForm = document.getElementById("intro-form");
  const setupForm = document.getElementById("setup-form");
  const usernameInput = document.getElementById("username");
  const generateBtn = document.getElementById("generate-random");
  const newRoomForm = document.getElementById("new-room-form");
  const roomNameInput = document.getElementById("new-room-name");
  const chooseRoomArea = document.getElementById("choose-room-area");
  const chooseRoomText = chooseRoomArea.querySelector("h2");
  const roomsDiv = document.getElementById("rooms");

  const requestAreaText = document.querySelector("#request-area > h2");
  const requestForm = document.getElementById("request-form");
  const requestFormInput = requestForm.querySelectorAll("input, textarea");
  const chooseAnotherRoomEl = document.getElementById("choose-another");

  const roomNameEl = document.getElementById("room-name");
  const selectCameraEl = document.getElementById("select-camera");
  const selectMicEl = document.getElementById("select-mic");
  const leaveRoomBtn = document.getElementById("leave-room");

  const streamsDiv = document.getElementById("streams");
  const controls = document.getElementById("control");

  const captureDiv = document.getElementById("capture-div");
  const videoEl = captureDiv.querySelector("video");
  const audioEl = captureDiv.querySelector("audio");
  const usernameEl = captureDiv.querySelector(".username > p");

  const bodyPopupArea = document.getElementById("body-pop-up-area");
  const bodyAlertChildren =
    document.getElementById("body-alert-dialog").children;
  const bodyConfirmChildren = document.getElementById(
    "body-confirm-dialog"
  ).children;
  const bodyDangerConfirmChildren = document.getElementById(
    "body-danger-confirm-dialog"
  ).children;

  const mainPopupArea = document.getElementById("main-pop-up-area");
  const mainAlertChildren =
    document.getElementById("main-alert-dialog").children;
  const mainConfirmChildren = document.getElementById(
    "main-confirm-dialog"
  ).children;
  const mainDangerConfirmChildren = document.getElementById(
    "main-danger-confirm-dialog"
  ).children;

  const reviewChildren = document.getElementById("main-review-dialog").children;
  const requestReviewArea = document.getElementById("request-review-area");
  const requestReviewText = requestReviewArea.querySelector("h2");
  const requestReviewMsg = requestReviewArea.querySelector("p");
  const requestReviewBtns = requestReviewArea.querySelectorAll("input");

  const baseWidth = 200;
  const baseHeight = 150;

  const videoBitrate = 500; //kbps
  const audioBitrate = 100; //kbps

  const connection = new MultiPeerConnection({
    socket,
    onStream: receivedStream,
    onData,
    onPeerConnect: peerConnected,
    onPeerDisconnect: peerDisconnected,
    videoBitrate,
    audioBitrate,
  });

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

    streamsDiv.querySelectorAll(".stream").forEach((e) => {
      e.classList.remove("speaking");
    });

    if (maxId && maxId !== socket.id && maxVolume > 35) {
      const peerDiv = getPeerCaptureDiv(maxId);

      if (peerDiv) {
        peerDiv.classList.add("speaking");
      }
    }
  }

  function gotBlockedFrom(room) {
    let roomRecord = blockRecord.get(room);
    if (!roomRecord) {
      roomRecord = { time: 0.5 };
      blockRecord.set(room, roomRecord);
    }

    roomRecord.time *= 2;
    roomRecord.end = Date.now() + 1000 * 60 * roomRecord.time;

    setTimeout(() => {
      const roomRecord = blockRecord.get(room);
      if (roomRecord) {
        roomRecord.end = null;
      }
    }, 1000 * 60 * roomRecord.time);

    return roomRecord.time;
  }

  function handleMediaElement(el, handleVideo) {
    if (handleVideo) {
      el.muted = true;
      el.setAttribute("muted", "");
    }
    el.autoplay = true;
    el.playsInline = true;
    el.setAttribute("autoplay", "");
    el.setAttribute("playsinline", "");
    el.onloadedmetadata = () => {
      el.play().catch(() => {
        mediaToPlay.add(el);
        showMainAlertPopup(autoPlayText, false);
      });
    };
  }

  function normalizeTopic(str) {
    return str.replace(/(?:^\s+)|(?:\s+$)/g, "").replace(/\s+/, " ");
  }

  const showBodyAlertPopup = (() => {
    let timeout;

    return (msg, delay = 5000) => {
      clearTimeout(timeout);
      bodyAlertChildren[0].textContent = msg;
      bodyPopupArea.children[0].appendChild(bodyAlertChildren[0].parentNode);
      bodyPopupArea.classList.add("alerting");

      if (delay && delay > 100) {
        timeout = setTimeout(() => {
          bodyPopupArea.classList.remove("alerting");
        }, delay);
      }
    };
  })();

  const showMainAlertPopup = (() => {
    let timeout;

    return (msg, delay = 5000) => {
      clearTimeout(timeout);
      mainAlertChildren[0].textContent = msg;
      mainPopupArea.children[0].appendChild(mainAlertChildren[0].parentNode);
      mainPopupArea.classList.add("alerting");

      if (delay && delay > 100) {
        timeout = setTimeout(() => {
          mainPopupArea.classList.remove("alerting");
        }, delay);
      }
    };
  })();

  function updateLayout() {
    if (!document.body.classList.contains("layout-b") && controls.clientHeight)
      document.documentElement.style.setProperty(
        "--tools-height",
        controls.clientHeight + "px"
      );

    const computedStyle = window.getComputedStyle(document.documentElement);
    const toolWidth = parseInt(computedStyle.getPropertyValue("--tools-width"));
    const toolHeight = parseInt(
      computedStyle.getPropertyValue("--tools-height")
    );

    const insets = getInsets();

    const fullWidth = window.innerWidth - insets.left - insets.right;
    const fullHeight = window.innerHeight - insets.top - insets.bottom;

    const sizeA = calculateVideoSize(
      fullWidth,
      fullHeight -
        toolHeight +
        (document.body.classList.contains("upside-down")
          ? insets.top
          : insets.bottom)
    );
    const sizeB = calculateVideoSize(fullWidth - toolWidth - 14, fullHeight);

    let size;

    if (sizeA.height < sizeB.height && window.innerHeight < 480) {
      document.body.classList.add("layout-b");
      size = sizeB;
    } else {
      document.body.classList.remove("layout-b");
      size = sizeA;
    }

    document.documentElement.style.setProperty(
      "--each-width",
      size.width + "px"
    );

    document.documentElement.style.setProperty(
      "--each-height",
      size.height + "px"
    );
  }

  function updateOrientation(angle) {
    if (angle == -90 || angle == 270) {
      document.body.classList.add("home-button-left");
    } else {
      document.body.classList.remove("home-button-left");
    }

    if (angle == 180) {
      document.body.classList.add("upside-down");
    } else {
      document.body.classList.remove("upside-down");
    }

    updateLayout();
  }

  function calculateVideoSize(availableWidth, availableHeight) {
    if (availableWidth < 0 || availableHeight < 0)
      return { width: 0, height: 0 };

    let col = Math.floor(availableWidth / baseWidth);
    let row = Math.floor(availableHeight / baseHeight);

    const n = streamsDiv.children.length;

    let pCol, pRow;

    do {
      pCol = col;
      pRow = row;

      if (
        availableWidth / col / baseWidth <
        availableHeight / row / baseHeight
      ) {
        --col;
      } else {
        --row;
      }
    } while (col >= 1 && row >= 1 && Math.floor(col) * Math.floor(row) >= n);

    const realCol = Math.max(1, Math.floor(pCol));
    const realRow = Math.max(1, Math.floor(pRow));

    const eachMaxWidth = availableWidth / realCol;
    const eachMaxHeight = availableHeight / realRow;

    const eachRatio = Math.min(
      eachMaxHeight / baseHeight,
      eachMaxWidth / baseWidth
    );

    const eachWidth = Math.floor(baseWidth * eachRatio) - 5;
    const eachHeight = Math.floor(baseHeight * eachRatio) - 5;

    return { width: eachWidth, height: eachHeight };
  }

  function startCapture(startVideo, retry = true) {
    const preferredDeviceLabel = startVideo
      ? preferredVideoLabel
      : preferredAudioLabel;
    const deviceKind = startVideo ? "videoinput" : "audioinput";
    const getConstraint = new Promise((resolve) => {
      if (preferredDeviceLabel) {
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            const device = devices.find(
              (e) => e.kind === deviceKind && e.label === preferredDeviceLabel
            );

            if (device && device.deviceId) {
              resolve({
                [startVideo ? "audio" : "video"]: false,
                [startVideo ? "video" : "audio"]: { deviceId: device.deviceId },
              });
            } else {
              resolve({ audio: !startVideo, video: startVideo });
            }
          })
          .catch((e) => {
            resolve({ audio: !startVideo, video: startVideo });
          });
      } else {
        resolve({ audio: !startVideo, video: startVideo });
      }
    });

    getConstraint.then((constraint) => {
      navigator.mediaDevices
        .getUserMedia(constraint)
        .then((stream) => {
          let labelMatch = startVideo
            ? stream.getVideoTracks()[0].label === preferredVideoLabel
            : stream.getAudioTracks()[0].label === preferredAudioLabel;

          const el = startVideo ? videoEl : audioEl;
          const readyClass = startVideo ? "video-ready" : "audio-ready";

          if (!startVideo) {
            audioMeter = createAudioMeter(stream);
          }

          el.srcObject = stream;
          el.onloadedmetadata = () => {
            el.play();
          };

          if (!preferredDeviceLabel || labelMatch) {
            if (!captureDiv.classList.contains(readyClass)) {
              captureDiv.classList.add(readyClass);
              connection.addStream(stream);
            }
          }

          navigator.mediaDevices.enumerateDevices().then((devices) => {
            if (
              retry &&
              preferredVideoLabel &&
              !labelMatch &&
              devices.find(
                (e) => e.kind === deviceKind && e.label === preferredDeviceLabel
              )
            ) {
              stopCapture(startVideo);
              startCapture(startVideo, false);
              return;
            }

            if (!captureDiv.classList.contains(readyClass)) {
              captureDiv.classList.add(readyClass);
              connection.addStream(stream);
            }

            if (startVideo) {
              preferredVideoLabel = stream.getVideoTracks()[0].label;
            } else {
              preferredAudioLabel = stream.getAudioTracks()[0].label;
            }

            function setOptionsFor(forCamera, devices) {
              if (!devices.length) return;

              const selectEl = forCamera ? selectCameraEl : selectMicEl;

              selectEl.innerHTML = "";

              const defaultOption = document.createElement("option");
              defaultOption.text = forCamera ? cameraOffText : micOffText;
              selectEl.appendChild(defaultOption);

              devices.forEach((e) => {
                const option = document.createElement("option");
                option.text = e.label;
                option.value = e.label;
                option.selected =
                  (forCamera ? preferredVideoLabel : preferredAudioLabel) ===
                    e.label && (forCamera ? videoEl : audioEl).srcObject;
                selectEl.appendChild(option);
              });
            }

            const cameras = devices.filter(
              (device) => device.label && device.kind === "videoinput"
            );

            const mics = devices.filter(
              (device) => device.label && device.kind === "audioinput"
            );

            setOptionsFor(true, cameras);
            setOptionsFor(false, mics);

            insertPeerCaptureDiv(captureDiv);
          });
        })
        .catch((e) => {
          if (startVideo) {
            captureDiv.classList.remove("video-ready");
            selectCameraEl.selectedIndex = 0;
          } else {
            captureDiv.classList.remove("audio-ready");
            selectMicEl.selectedIndex = 0;
          }
          insertPeerCaptureDiv(captureDiv);
          console.error(e);
          alert(`Unable to start the camera: ${e}`);
        });
    });
  }

  function stopCapture(stopVideo, switching = false) {
    const el = stopVideo ? videoEl : audioEl;
    const stream = el.srcObject;

    if (stream) {
      stream.getTracks().forEach((e) => {
        e.stop();
        stream.removeTrack(e);
      });

      socket.emit("remove-stream", stopVideo);
      connection.removeStream(stream);
    }

    if (!stopVideo) {
      audioMeter = null;
    }

    captureDiv.classList.remove(stopVideo ? "video-ready" : "audio-ready");

    if (!switching) {
      if (stopVideo) {
        selectCameraEl.selectedIndex = 0;
      } else {
        selectMicEl.selectedIndex = 0;
      }

      insertPeerCaptureDiv(captureDiv);
    }

    el.srcObject = null;
  }

  function startRequestToJoin() {
    bodyPopupArea.classList.remove("confirming");
    if (!checkBlock()) return;
    requestAreaText.textContent = `Request to join room ${roomTopic}:`;
    document.documentElement.className = "requesting";
  }

  function resetRequestEl() {
    isRequestSent = false;
    requestFormInput.forEach((e) => {
      e.disabled = false;
    });
    requestForm.message.value = "";
  }

  function checkBlock() {
    if (!roomTopic) return;

    const roomRecord = blockRecord.get(roomTopic);
    if (roomRecord) {
      const timeEnd = roomRecord.end;
      if (timeEnd) {
        const timeLeft = roomRecord.end - Date.now();

        if (timeLeft <= 0) {
          roomRecord.end = null;
        } else {
          showBodyAlertPopup(
            `You have been blocked from room ${roomTopic}. Wait ${Math.ceil(
              timeLeft / 60 / 1000
            )} min to request to join again.`
          );

          return;
        }
      }
    }

    return true;
  }

  function joinRoom() {
    if (!roomTopic) return;

    if (!checkBlock()) return;

    bodyPopupArea.classList.remove("alerting");
    bodyPopupArea.classList.remove("confirming");
    bodyPopupArea.classList.remove("danger-confirming");
    roomNameEl.textContent = `Room ${roomTopic}`;
    document.documentElement.className = "chatting";
    document.title = `Room ${roomTopic} – McCoy’s Chat Plaza Ultra`;
    socket.emit("join-room", roomTopic);
    roomNameInput.value = "";
    resetRequestEl();
    updateLayout();
  }

  function leaveRoom() {
    mainPopupArea.classList.remove("reviewing");
    mainPopupArea.classList.remove("alerting");
    mainPopupArea.classList.remove("confirming");
    mainPopupArea.classList.remove("danger-confirming");
    socket.emit("leave-room");
    connection.close();
    document.documentElement.className = "picking-room";
    document.title = "McCoy’s Chat Plaza Ultra";
    streamsDiv.querySelectorAll(".stream:not(#capture-div)").forEach((e) => {
      e.remove();
    });
    stopCapture(true);
    stopCapture(false);
    updateLayout();
    roomNameEl.textContent = "";
  }

  function getRoomBtn(roomName, createNew = false) {
    let roomBtn = document.getElementById("room-btn-" + roomName);

    if (!createNew || roomBtn) {
      return roomBtn;
    }

    roomBtn = document.createElement("input");
    roomBtn.type = "button";
    roomBtn.className = "room subtle";
    roomBtn.value = roomName;
    roomBtn.id = "room-btn-" + roomName;

    return roomBtn;
  }

  function updateRoomCount() {
    const roomCount = roomsDiv.childElementCount;
    chooseRoomText.textContent = `Choose from ${roomCount} existing room${
      roomCount === 1 ? "" : "s"
    }:`;

    if (roomCount) {
      chooseRoomArea.classList.remove("no-existing-room");
    } else {
      chooseRoomArea.classList.add("no-existing-room");
    }
  }

  function getPeerCaptureDiv(id, username = null) {
    let peerDiv = document.getElementById("peer-" + id);

    if (!username || peerDiv) {
      return peerDiv;
    }

    peerDiv = document.createElement("DIV");
    peerDiv.id = "peer-" + id;
    peerDiv.tabIndex = 0;
    peerDiv.title = "Double Click to Report";
    peerDiv.className = "connecting stream";

    const usernameDiv = document.createElement("DIV");
    usernameDiv.className = "username";

    const micIndicatorDiv = document.createElement("DIV");
    micIndicatorDiv.className = "mic-indicator";

    const usernameP = document.createElement("P");
    usernameP.textContent = username;
    usernameP.className = "username-text";

    const connectingP = document.createElement("P");
    connectingP.textContent = "Connecting…";
    connectingP.className = "connecting-text";

    usernameDiv.appendChild(micIndicatorDiv);
    usernameDiv.appendChild(usernameP);
    usernameDiv.appendChild(connectingP);

    peerDiv.appendChild(usernameDiv);
    peerDiv.appendChild(document.createElement("VIDEO"));
    peerDiv.appendChild(document.createElement("AUDIO"));

    updateLayout();

    return peerDiv;
  }

  function insertPeerCaptureDiv(peerCaptureDiv) {
    const videoReady = peerCaptureDiv.classList.contains("video-ready");
    const audioReady = peerCaptureDiv.classList.contains("audio-ready");

    let sibling;

    if (videoReady && audioReady) {
      sibling = streamsDiv.firstChild;
    } else if (videoReady) {
      sibling = streamsDiv.querySelector(
        `.stream:not(.video-ready.audio-ready):not(#${peerCaptureDiv.id})`
      );
    } else if (audioReady) {
      sibling = streamsDiv.querySelector(
        `.stream:not(.video-ready):not(#${peerCaptureDiv.id})`
      );
    } else {
      sibling = streamsDiv.querySelector(
        `.stream:not(.video-ready):not(.audio-ready):not(#${peerCaptureDiv.id})`
      );
    }

    streamsDiv.insertBefore(peerCaptureDiv, sibling);

    updateLayout();
  }

  // Whenever we get a stream from a peer
  function receivedStream(stream, simplePeerWrapper) {
    if (!isInRoom()) return;

    const isVideo = !!stream.getVideoTracks().length;
    const readyClass = isVideo ? "video-ready" : "audio-ready";

    const peerCaptureDiv = getPeerCaptureDiv(simplePeerWrapper.socket_id);

    if (peerCaptureDiv) {
      peerCaptureDiv.classList.remove("reported");
      peerCaptureDiv.classList.add(readyClass);

      const mediaEl = peerCaptureDiv.querySelector(isVideo ? "video" : "audio");
      mediaEl.srcObject = stream;
      handleMediaElement(mediaEl, isVideo);

      insertPeerCaptureDiv(peerCaptureDiv);
    }
  }

  function peerConnected(simplePeerWrapper) {
    if (!isInRoom()) return;

    const element = getPeerCaptureDiv(simplePeerWrapper.socket_id);

    if (element) {
      element.classList.remove("connecting");
    }
  }

  // Whenever a peer disconnected
  function peerDisconnected(id) {
    const element = getPeerCaptureDiv(id);
    volumes.delete(id);
    if (element) {
      element.remove();
      updateLayout();
    }
  }

  function onData(data, simplePeerWrapper) {
    volumes.set(simplePeerWrapper.socket_id, +data);
    checkVolume();
  }

  function chooseAnotherRoom() {
    document.documentElement.className = "picking-room";
    roomTopic = null;
    resetRequestEl();
  }

  function disconnected() {
    isDisconnected = true;

    if (!myUsername) return;

    leaveRoom();
    showBodyAlertPopup(`Connection lost.`, false);
    roomTopic = null;
  }

  function reconnect() {
    if (!myUsername) return;

    socket.emit("join", myUsername);
  }

  socket.on("join-room", (username, id) => {
    if (!isInRoom()) return;

    streamsDiv.appendChild(getPeerCaptureDiv(id, username));
    updateLayout();
  });

  socket.on("user-list", (record) => {
    for (let [username, id] of record) {
      if (id === socket.id) continue;
      streamsDiv.appendChild(getPeerCaptureDiv(id, username));
      updateLayout();
    }
  });

  socket.on("remove-stream", (id, removeVideo) => {
    const peerCaptureDiv = getPeerCaptureDiv(id);

    if (peerCaptureDiv) {
      peerCaptureDiv.querySelector(removeVideo ? "video" : "audio").srcObject =
        null;
      peerCaptureDiv.classList.remove(
        removeVideo ? "video-ready" : "audio-ready"
      );
      insertPeerCaptureDiv(peerCaptureDiv);
    }
  });

  socket.on("reported", (idReporting) => {
    showMainAlertPopup("You have been reported.");
    connection.removeStreamsTo(idReporting);
  });

  socket.on("blocked", (idReported, usernameReported) => {
    if (usernameReported === myUsername) {
      leaveRoom();
      showBodyAlertPopup(
        `You have been blocked from room ${roomTopic} for ${gotBlockedFrom(
          roomTopic
        )} min for streaming inappropriate content.`,
        false
      );
      roomTopic = null;
    } else {
      const peerDiv = getPeerCaptureDiv(idReported);

      if (peerDiv) {
        showMainAlertPopup(
          `${usernameReported} has been blocked from the room for streaming inappropriate content.`
        );
        peerDiv.remove();
        updateLayout();
      }
    }
  });

  socket.on("disconnect", disconnected);

  socket.on("connect", reconnect);

  socket.on("rooms", (rooms) => {
    if (isDisconnected) {
      showBodyAlertPopup(`Connected to server.`);
    }

    isDisconnected = false;

    while (roomsDiv.firstChild) {
      roomsDiv.firstChild.remove();
    }

    if (rooms.length) {
      for (let room of rooms) {
        roomsDiv.appendChild(getRoomBtn(room, true));
      }
    }
    updateRoomCount();
  });

  socket.on("new-room", (newRoom) => {
    roomsDiv.appendChild(getRoomBtn(newRoom, true));
    updateRoomCount();
  });

  socket.on("delete-room", (room) => {
    const roomDiv = getRoomBtn(room);
    if (roomDiv) {
      roomDiv.remove();
      updateRoomCount();
    }

    if (roomTopic === room && isRequesting() && isRequestSent) {
      joinRoom();
      showMainAlertPopup(`You have joined room ${roomTopic}.`);
    }
  });

  socket.on("request", (id, username, msg) => {
    mainPopupArea.children[0].appendChild(reviewChildren[0].parentNode);
    mainPopupArea.classList.add("reviewing");
    requests.set(id, { username, msg });
  });

  socket.on("cancel-request", (id) => {
    const firstId = requests.keys().next().value;

    if (id === firstId) {
      document.body.classList.remove("reviewing-request");
    }

    requests.delete(id);

    if (!requests.size) {
      mainPopupArea.classList.remove("reviewing");
    }
  });

  socket.on("approved", () => {
    if (roomTopic && isRequesting() && isRequestSent) {
      showMainAlertPopup(
        `Your request to join room ${roomTopic} has been approved.`
      );
      joinRoom();
    }
  });

  socket.on("denied", () => {
    if (roomTopic && isRequesting() && isRequestSent) {
      showBodyAlertPopup(
        `Your request to join room ${roomTopic} has been denied.`
      );
      chooseAnotherRoom();
    }
  });

  document.addEventListener("click", () => {
    if (
      mainAlertChildren[0].textContent === autoPlayText &&
      mainPopupArea.classList.contains("alerting")
    ) {
      mainPopupArea.classList.remove("alerting");
    }

    for (let media of mediaToPlay) {
      media.play().then(() => {
        mediaToPlay.delete(media);
      });
    }
  });

  window.addEventListener("offline", disconnected);

  window.addEventListener("online", reconnect);

  window.addEventListener("resize", () => {
    updateLayout();
  });

  screen &&
    screen.orientation &&
    screen.orientation.addEventListener("change", () => {
      updateOrientation(screen.orientation.angle);
    });

  window.addEventListener("orientationchange", () => {
    updateOrientation(window.orientation);
  });

  introForm.addEventListener("submit", (e) => {
    e.preventDefault();
    document.documentElement.className = "setting-up";
    introForm.parentNode.remove();
  });

  addClickOrKeyListener(generateBtn, () => {
    if (generateBtn.classList.contains("disabled")) return;

    generateBtn.classList.add("disabled");

    Promise.all(
      ["adjective", "noun"].map((e) =>
        fetch(`https://random-word-form.herokuapp.com/random/${e}`)
          .then((res) => res.json())
          .then(([word]) => word)
      )
    )
      .then((words) => {
        usernameInput.value = words.join("-");
        generateBtn.classList.remove("disabled");
      })
      .catch(() => {
        fetch("https://random-word-api.herokuapp.com/word?number=2")
          .then((res) => res.json())
          .then((words) => {
            usernameInput.value = words.join("-");
          })
          .finally(() => {
            generateBtn.classList.remove("disabled");
          });
      });
  });

  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = e.currentTarget.username.value;
    if (name) {
      myUsername = `${name}^${randomNumber(3)}`;
      usernameEl.textContent = myUsername;
      socket.emit("join", myUsername);
      document.documentElement.className = "picking-room";
      setupForm.parentNode.remove();
      updateOrientation(window.orientation);
      screen &&
        screen.orientation &&
        updateOrientation(screen.orientation.angle);
    }
  });

  newRoomForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const topic = normalizeTopic(e.currentTarget.topic.value);
    roomTopic = topic;

    if (getRoomBtn(topic, false)) {
      bodyConfirmChildren[0].textContent = `Room ${topic} already exists.`;
      bodyPopupArea.children[0].appendChild(bodyConfirmChildren[0].parentNode);
      bodyPopupArea.classList.remove("alerting");
      bodyPopupArea.classList.remove("danger-confirming");
      bodyPopupArea.classList.add("confirming");
    } else {
      joinRoom();
      showMainAlertPopup(`You have started room ${roomTopic}.`);
    }
  });

  roomsDiv.addEventListener("click", (e) => {
    if (!e.target.id || !e.target.classList.contains("room")) return;

    const roomName = e.target.id.replace(/^room-btn-/, "");

    if (!roomName) return;
    roomTopic = roomName;
    startRequestToJoin();
  });

  selectCameraEl.addEventListener("change", (e) => {
    e.preventDefault();

    const label = selectCameraEl.options[selectCameraEl.selectedIndex].text;

    if (label) {
      if (label === cameraOffText) {
        stopCapture(true);
        return;
      } else {
        preferredVideoLabel = label;
      }
    }

    stopCapture(true, true);
    startCapture(true);
  });

  selectMicEl.addEventListener("change", (e) => {
    e.preventDefault();

    const label = selectMicEl.options[selectMicEl.selectedIndex].text;

    if (label) {
      if (label === micOffText) {
        stopCapture(false);
        return;
      } else {
        preferredAudioLabel = label;
      }
    }

    stopCapture(false, true);
    startCapture(false);
  });

  leaveRoomBtn.addEventListener("click", () => {
    mainPopupArea.children[0].appendChild(
      mainDangerConfirmChildren[0].parentNode
    );
    mainPopupArea.classList.remove("alerting");
    mainPopupArea.classList.remove("confirming");
    mainPopupArea.classList.add("danger-confirming");
  });

  requestReviewBtns[0].addEventListener("click", () => {
    const approvedId = requests.keys().next().value;
    socket.emit("approve-request", approvedId);
    requests.delete(approvedId);

    if (requests.size) {
      mainPopupArea.children[0].appendChild(reviewChildren[0].parentNode);
      mainPopupArea.classList.add("reviewing");
    }
    document.body.classList.remove("reviewing-request");
  });

  requestReviewBtns[1].addEventListener("click", () => {
    const deniedId = requests.keys().next().value;
    socket.emit("deny-request", deniedId);
    requests.delete(deniedId);

    if (requests.size) {
      mainPopupArea.children[0].appendChild(reviewChildren[0].parentNode);
      mainPopupArea.classList.add("reviewing");
    }
    document.body.classList.remove("reviewing-request");
  });

  bodyAlertChildren[1].addEventListener("click", () => {
    bodyPopupArea.classList.remove("alerting");
  });

  bodyConfirmChildren[1].addEventListener("click", () => {
    startRequestToJoin();
    bodyPopupArea.classList.remove("confirming");
    roomNameInput.value = "";
  });

  bodyConfirmChildren[2].addEventListener("click", () => {
    bodyPopupArea.classList.remove("confirming");
  });

  bodyDangerConfirmChildren[1].addEventListener("click", () => {
    socket.emit("cancel-request");
    chooseAnotherRoom();
    bodyPopupArea.classList.remove("danger-confirming");
  });

  bodyDangerConfirmChildren[2].addEventListener("click", () => {
    bodyPopupArea.classList.remove("danger-confirming");
  });

  addClickOrKeyListener(chooseAnotherRoomEl, () => {
    if (isRequestSent) {
      bodyPopupArea.children[0].appendChild(
        bodyDangerConfirmChildren[0].parentNode
      );
      bodyPopupArea.classList.remove("alerting");
      bodyPopupArea.classList.remove("confirming");
      bodyPopupArea.classList.add("danger-confirming");
      return;
    }

    chooseAnotherRoom();
  });

  requestForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!getRoomBtn(roomTopic)) {
      joinRoom();
      showMainAlertPopup(`You have joined room ${roomTopic}.`);
      return;
    }

    socket.emit("request", roomTopic, e.currentTarget.message.value);
    isRequestSent = true;
    requestFormInput.forEach((e) => {
      e.disabled = true;
    });
    showBodyAlertPopup(
      `Your request to join room ${roomTopic} has been submitted.`
    );
  });

  mainAlertChildren[1].addEventListener("click", () => {
    mainPopupArea.classList.remove("alerting");
  });

  mainConfirmChildren[0].addEventListener("click", () => {
    const reportedDiv = getPeerCaptureDiv(idToReport);

    if (reportedDiv) {
      reportedDiv.classList.remove("video-ready");
      reportedDiv.classList.remove("audio-ready");
      reportedDiv.querySelector("video").srcObject = null;
      reportedDiv.querySelector("audio").srcObject = null;
      reportedDiv.classList.add("reported");
      socket.emit("report", idToReport);
      showMainAlertPopup(`You have reported and hidden ${usernameToReport}.`);
    } else {
      showMainAlertPopup(`${usernameToReport} has already left the room.`);
    }

    idToReport = null;
    usernameToReport = null;
    mainPopupArea.classList.remove("confirming");
  });

  mainConfirmChildren[1].addEventListener("click", () => {
    idToReport = null;
    usernameToReport = null;
    mainPopupArea.classList.remove("confirming");
  });

  mainDangerConfirmChildren[1].addEventListener("click", () => {
    leaveRoom();
    showBodyAlertPopup(`You have left room ${roomTopic}.`);
    roomTopic = null;
  });

  mainDangerConfirmChildren[2].addEventListener("click", () => {
    mainPopupArea.classList.remove("danger-confirming");
  });

  reviewChildren[1].addEventListener("click", () => {
    if (!requests.size) {
      mainPopupArea.classList.remove("reviewing");
      return;
    }

    const { username, msg } = requests.values().next().value || {};

    mainPopupArea.classList.remove("reviewing");
    requestReviewText.textContent = `Request from ${username}:`;
    requestReviewMsg.textContent = msg;
    document.body.classList.add("reviewing-request");
  });

  addDoubleClickOrKeyListener(streamsDiv, (e) => {
    function getStreamDiv(el) {
      if (!el) return null;
      if (el.classList && el.classList.contains("stream")) return el;
      return getStreamDiv(el.parentNode);
    }

    const streamDiv = getStreamDiv(e.target);

    if (!streamDiv) return;

    const streamReady =
      streamDiv.classList.contains("video-ready") ||
      streamDiv.classList.contains("audio-ready");

    if (streamDiv === captureDiv) {
      mainPopupArea.classList.remove("confirming");
      mainPopupArea.classList.remove("danger-confirming");

      if (streamReady) {
        stopCapture(true);
        stopCapture(false);
      }

      showMainAlertPopup(
        streamReady
          ? "Your camera and mic have been turned off."
          : "Your camera and mic are already off."
      );

      return;
    }

    const usernameEl = streamDiv.querySelector(".username-text");

    if (!usernameEl) return;

    const username = usernameEl.textContent;

    idToReport = streamDiv.id.replace(/^peer-/, "");
    usernameToReport = username;

    if (streamDiv.classList.contains("reported") || !streamReady) {
      mainPopupArea.classList.remove("confirming");
      mainPopupArea.classList.remove("danger-confirming");
      showMainAlertPopup(
        streamReady
          ? `You have already reported ${username}.`
          : `You can only report users who have their camera or mic on.`
      );
    } else {
      mainConfirmChildren[0].value = `Report and Hide ${username}`;
      mainPopupArea.classList.remove("alerting");
      mainPopupArea.classList.remove("danger-confirming");
      mainPopupArea.children[0].appendChild(mainConfirmChildren[0].parentNode);
      mainPopupArea.classList.add("confirming");
    }
  });

  setInterval(() => {
    if (audioMeter) {
      const meterValue = audioMeter();
      connection.sendData(`${meterValue}`);
      volumes.set(socket.id, meterValue);
    } else {
      connection.sendData("NaN");
      volumes.set(socket.id, NaN);
    }
    checkVolume();
  }, 100);

  updateOrientation(window.orientation);
  screen && screen.orientation && updateOrientation(screen.orientation.angle);
});
