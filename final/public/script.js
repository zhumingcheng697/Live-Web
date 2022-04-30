function randomNumber(n, base = 10) {
  return [...Array(n)]
    .map(() => Math.floor(Math.random() * base).toString(base))
    .join("");
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
    el.play();
  };
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
  const usernames = new Map();

  const cameraOffText = "- Camera Off -";
  const micOffText = "- Mic Off -";

  let myUsername = "";
  let serverBlockTimeout;
  let preferredAudioLabel;
  let preferredVideoLabel;

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

  const selectCameraEl = document.getElementById("select-camera");
  const selectMicEl = document.getElementById("select-mic");

  const mainArea = document.getElementById("main-area");
  const streamsDiv = document.getElementById("streams");
  const controls = document.getElementById("control");

  const captureDiv = document.getElementById("capture-div");
  const videoEl = captureDiv.querySelector("video");
  const audioEl = captureDiv.querySelector("audio");
  const usernameEl = captureDiv.querySelector(".username > p");

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

  function updateLayout() {
    if (!document.body.classList.contains("layout-b"))
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
    const sizeB = calculateVideoSize(
      fullWidth -
        toolWidth +
        (document.body.classList.contains("home-button-left")
          ? insets.left
          : insets.right),
      fullHeight
    );

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
              try {
                connection.addStream(stream);
              } catch (e) {
                console.error(e);
              }
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

      try {
        socket.emit("remove-stream", stopVideo);
        connection.removeStream(stream);
      } catch (e) {
        console.error(e);
      }
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
    const isVideo = !!stream.getVideoTracks().length;
    const readyClass = isVideo ? "video-ready" : "audio-ready";

    const peerCaptureDiv = getPeerCaptureDiv(simplePeerWrapper.socket_id);

    peerCaptureDiv.classList.add(readyClass);

    const mediaEl = peerCaptureDiv.querySelector(isVideo ? "video" : "audio");
    mediaEl.srcObject = stream;
    handleMediaElement(mediaEl, isVideo);

    insertPeerCaptureDiv(peerCaptureDiv);
  }

  function peerConnected(simplePeerWrapper) {
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
    usernames.delete(data);
  }

  socket.on("join", (username, id) => {
    if (!myUsername) return;

    usernames.set(id, username);
    streamsDiv.appendChild(getPeerCaptureDiv(id, username));
    updateLayout();
  });

  socket.on("user-list", (record) => {
    for (let [username, id] of record) {
      if (id === socket.id) continue;
      usernames.set(id, username);
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
    document.documentElement.classList.remove("intro");
    document.documentElement.classList.add("setting-up");
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
      document.documentElement.classList.remove("setting-up");
      document.documentElement.classList.add("chatting");
      setupForm.parentNode.remove();
      updateOrientation(window.orientation);
      screen &&
        screen.orientation &&
        updateOrientation(screen.orientation.angle);
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

  addDoubleClickOrKeyListener(captureDiv, () => {
    stopCapture(true);
    stopCapture(false);
  });

  updateOrientation(window.orientation);
  screen && screen.orientation && updateOrientation(screen.orientation.angle);
});
