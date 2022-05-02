function randomNumber(n, base = 10) {
  return [...Array(n)]
    .map(() => Math.floor(Math.random() * base).toString(base))
    .join("");
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
  const socket = io.connect("http://127.0.0.1:8080");
  const mediaToPlay = new Set();

  const blockRecord = new Map();

  const cameraOffText = "- Camera Off -";
  const micOffText = "- Mic Off -";
  const autoPlayText = "Unable to auto-play audio. Click anywhere to play.";

  let myUsername = "";
  let preferredAudioLabel;
  let preferredVideoLabel;

  let idToReport;
  let usernameToReport;
  let roomTopic;

  const isInRoom = () =>
    document.documentElement.classList.contains("chatting");

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
  const chooseRoomArea = document.getElementById("choose-room-area");

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

  const roomPopupArea = document.getElementById("room-pop-up-area");
  const roomAlertChildren =
    document.getElementById("room-alert-dialog").children;
  const roomConfirmChildren = document.getElementById(
    "room-confirm-dialog"
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

  const baseWidth = 200;
  const baseHeight = 150;

  const videoBitrate = 500; //kbps
  const audioBitrate = 100; //kbps

  const connection = new MultiPeerConnection({
    socket,
    onStream: receivedStream,
    onPeerConnect: peerConnected,
    onPeerDisconnect: peerDisconnected,
    videoBitrate,
    audioBitrate,
  });

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

  const showRoomAlertPopup = (() => {
    let timeout;

    return (msg, delay = 5000) => {
      clearTimeout(timeout);
      roomAlertChildren[0].textContent = msg;
      roomPopupArea.classList.remove("confirming");
      roomPopupArea.classList.add("alerting");

      if (delay && delay > 100) {
        timeout = setTimeout(() => {
          roomPopupArea.classList.remove("alerting");
        }, delay);
      }
    };
  })();

  const showMainAlertPopup = (() => {
    let timeout;

    return (msg, delay = 5000) => {
      clearTimeout(timeout);
      mainAlertChildren[0].textContent = msg;
      mainPopupArea.classList.remove("confirming");
      mainPopupArea.classList.remove("danger-confirming");
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
              stopVideoCapture();
              startVideoCapture(startVideo, false);
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

  function leaveRoom() {
    socket.emit("leave-room");
    connection.close();
    document.documentElement.className = "picking-room";
    streamsDiv.querySelectorAll(".stream:not(#capture-div)").forEach((e) => {
      e.remove();
    });
    stopCapture(true);
    stopCapture(false);
    updateLayout();
    roomNameEl.textContent = "";
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
      sibling =
        streamsDiv.querySelector(
          `.stream.video-ready:not(.audio-ready):not(#${peerCaptureDiv.id})`
        ) ||
        streamsDiv.querySelector(
          `.stream:not(.video-ready).audio-ready:not(#${peerCaptureDiv.id})`
        ) ||
        streamsDiv.querySelector(
          `.stream:not(.video-ready):not(.audio-ready):not(#${peerCaptureDiv.id})`
        );
    } else if (audioReady) {
      sibling =
        streamsDiv.querySelector(
          `.stream:not(.video-ready).audio-ready:not(#${peerCaptureDiv.id})`
        ) ||
        streamsDiv.querySelector(
          `.stream:not(.video-ready):not(.audio-ready):not(#${peerCaptureDiv.id})`
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
  function peerDisconnected(data) {
    const element = getPeerCaptureDiv(data);
    if (element) {
      element.remove();
      updateLayout();
    }
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
      showRoomAlertPopup(
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

  socket.on("disconnect", () => {
    if (!myUsername) return;

    leaveRoom();
    showRoomAlertPopup(`Connection lost.`, false);
    roomTopic = null;
  });

  socket.on("reconnect", () => {
    if (!myUsername) return;

    socket.emit("join", myUsername);
    showRoomAlertPopup(`Reconnected to server.`);
  });

  document.addEventListener("click", () => {
    if (
      mainAlertChildren[0].textContent === autoPlayText &&
      mainPopupArea.classList.contains("alerting")
    ) {
      mainPopupArea.classList.remove("alerting");
    }

    if (mediaToPlay.size) {
      for (let media of mediaToPlay) {
        media.play().then(() => {
          mediaToPlay.delete(media);
        });
      }
    }
  });

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

    const name = e.target.username.value;
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

    const topic = normalizeTopic(e.target.topic.value);
    e.target.topic.value = topic;

    if (true || document.getElementById(`room-btn-${topic}`)) {
      roomTopic = topic;
      roomConfirmChildren[0].textContent = `Room ${topic} already exists.`;
      roomPopupArea.classList.remove("alerting");
      roomPopupArea.classList.remove("danger-confirming");
      roomPopupArea.classList.add("confirming");
    }
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
    mainPopupArea.classList.remove("alerting");
    mainPopupArea.classList.remove("confirming");
    mainPopupArea.classList.add("danger-confirming");
  });

  roomAlertChildren[1].addEventListener("click", () => {
    roomPopupArea.classList.remove("alerting");
  });

  roomConfirmChildren[1].addEventListener("click", () => {
    const roomRecord = blockRecord.get(roomTopic);
    if (roomRecord) {
      const timeEnd = roomRecord.end;
      if (timeEnd) {
        const timeLeft = roomRecord.end - Date.now();

        if (timeLeft <= 0) {
          roomRecord.end = null;
        } else {
          showRoomAlertPopup(
            `You have been blocked from room ${roomTopic}. Wait ${Math.ceil(
              timeLeft / 60 / 1000
            )} min to request to join again.`
          );
          return;
        }
      }
    }

    roomPopupArea.classList.remove("confirming");
    roomNameEl.textContent = `Room ${roomTopic}`;
    document.documentElement.className = "chatting";
    socket.emit("join-room", roomTopic);
  });

  roomConfirmChildren[2].addEventListener("click", () => {
    roomPopupArea.classList.remove("confirming");
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
  });

  mainConfirmChildren[1].addEventListener("click", () => {
    idToReport = null;
    usernameToReport = null;
    mainPopupArea.classList.remove("confirming");
  });

  mainDangerConfirmChildren[1].addEventListener("click", () => {
    mainPopupArea.classList.remove("danger-confirming");
    leaveRoom();
    showRoomAlertPopup(`You have left room ${roomTopic}.`);
    roomTopic = null;
  });

  mainDangerConfirmChildren[2].addEventListener("click", () => {
    mainPopupArea.classList.remove("danger-confirming");
  });

  addDoubleClickOrKeyListener(streamsDiv, (e) => {
    if (document.body.classList.contains("blocked")) return;

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
      showMainAlertPopup(
        streamReady
          ? `You have already reported ${username}.`
          : `You can only report users who have their camera or mic on.`
      );
    } else {
      mainConfirmChildren[0].value = `Report and Hide ${username}`;
      mainPopupArea.classList.remove("alerting");
      mainPopupArea.classList.remove("danger-confirming");
      mainPopupArea.classList.add("confirming");
    }
  });

  updateOrientation(window.orientation);
  screen && screen.orientation && updateOrientation(screen.orientation.angle);
});
