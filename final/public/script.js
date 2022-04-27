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
  const cameraOffText = "- Camera Off -";
  const cameraOnText = "- Camera On -";
  const micOffText = "- Mic Off -";
  const micOnText = "- Mic On -";

  let myUsername = "";
  let serverBlockTimeout;
  let preferredAudioLabel;
  let preferredVideoLabel;
  let audioStream;
  let videoStream;

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
  const videosDiv = document.getElementById("videos");
  const controls = document.getElementById("control");

  const baseWidth = 200;
  const baseHeight = 150;

  const videoBitrate = 500; //kbps
  const audioBitrate = 100; //kbps

  function updateLayout() {
    const computedStyle = window.getComputedStyle(document.documentElement);
    const toolWidth = parseInt(computedStyle.getPropertyValue("--tools-width"));
    const toolHeight = parseInt(
      computedStyle.getPropertyValue("--tools-height")
    );

    const insets = getInsets();

    const fullWidth = window.innerWidth - insets.left - insets.right;
    const fullHeight = window.innerHeight - insets.top - insets.bottom;

    const sizeA = calculateVideoSize(fullWidth, fullHeight - toolHeight);
    const sizeB = calculateVideoSize(fullWidth - toolWidth, fullHeight);

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

  function checkToolsHeight() {
    if (!document.body.classList.contains("layout-b"))
      document.documentElement.style.setProperty(
        "--tools-height",
        controls.clientHeight + "px"
      );
  }

  function calculateVideoSize(availableWidth, availableHeight) {
    if (availableWidth < 0 || availableHeight < 0)
      return { width: 0, height: 0 };

    let col = Math.floor(availableWidth / baseWidth);
    let row = Math.floor(availableHeight / baseHeight);

    const n = videosDiv.children.length;

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

          if (startVideo) {
            videoStream = stream;
          } else {
            audioStream = stream;
          }

          // captureVideoEl.srcObject = stream;
          // captureVideoEl.onloadedmetadata = () => {
          //   captureButton.disabled = false;
          //   captureVideoEl.play();
          //   updateLayout();
          // };

          if (!preferredDeviceLabel || labelMatch) {
            document.body.classList.add("stream-ready");
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

            document.body.classList.add("stream-ready");

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
                    e.label && (forCamera ? videoStream : audioStream);
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
          });
        })
        .catch((e) => {
          console.error(e);
          alert(`Unable to start the camera: ${e}`);
        });
    });
  }

  function stopCapture(stopVideo, switching = false) {
    const stream = stopVideo ? videoStream : audioStream;

    if (stream) {
      stream.getTracks().forEach((e) => {
        e.stop();
        stream.removeTrack(e);
      });
    }

    if (stopVideo) {
      document.body.classList.remove("stream-ready");
      videoStream = null;
      if (!switching) selectCameraEl.selectedIndex = 0;
    } else {
      audioStream = null;
      if (!switching) selectMicEl.selectedIndex = 0;
    }
  }

  // Whenever a peer disconnected
  function peerDisconnected(data) {
    const element = document.getElementById(data);
    if (element) {
      element.remove();
      updateLayout();
    }
  }

  // Whenever we get a stream from a peer
  function receivedStream(stream, simplePeerWrapper) {
    const newVideo = document.createElement("VIDEO");
    newVideo.id = simplePeerWrapper.socket_id;
    newVideo.srcObject = stream;
    newVideo.autoplay = true;
    newVideo.playsInline = true;
    newVideo.setAttribute("autoplay", "");
    newVideo.setAttribute("playsinline", "");
    newVideo.onloadedmetadata = () => {
      newVideo.play();
    };
    videosDiv.appendChild(newVideo);
    updateLayout();
  }

  // The video element on the page to display the webcam
  let video = document.createElement("video");

  // Constraints - what do we want?
  let constraints = { audio: false, video: true };

  // Prompt the user for permission, get the stream
  // navigator.mediaDevices
  //   .getUserMedia(constraints)
  //   .then((stream) => {
  //     /* Use the stream */

  //     // Attach to our video object
  //     video.srcObject = stream;
  //     video.muted = true;
  //     video.setAttribute("muted", "");

  //     // Wait for the stream to load enough to play
  //     video.onloadedmetadata = () => {
  //       video.play();

  //       // new MultiPeerConnection({
  //       //   stream: stream,
  //       //   host: "https://mccoy-zhu-outline-chat.glitch.me/",
  //       //   onStream: receivedStream,
  //       //   onPeerDisconnect: peerDisconnected,
  //       //   videoBitrate,
  //       //   audioBitrate,
  //       // });
  //     };
  //   })
  //   .catch((err) => {
  //     alert(err);
  //   });

  window.addEventListener("resize", () => {
    checkToolsHeight();
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
        fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0")
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
      document.documentElement.classList.remove("setting-up");
      document.documentElement.classList.add("chatting");
      setupForm.parentNode.remove();
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

  updateOrientation(window.orientation);
  screen && screen.orientation && updateOrientation(screen.orientation.angle);
  checkToolsHeight();
  updateLayout();
});
