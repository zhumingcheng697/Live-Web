window.addEventListener("load", () => {
  const videoArea = document.getElementById("video-area");
  const videosDiv = document.getElementById("videos");

  const baseWidth = 200;
  const baseHeight = 150;

  const videoBitrate = 500; //kbps
  const audioBitrate = 100; //kbps

  const thresholdEl = document.getElementById("threshold-el");
  const areaEl = document.getElementById("area-el");
  const modeEl = document.getElementById("mode-el");
  const recordEl = document.getElementById("record-el");

  function checkToolsHeight() {
    document.documentElement.style.setProperty(
      "--tools-height",
      document.getElementById("tools").clientHeight + "px"
    );
  }

  checkToolsHeight();

  function checkVideoSize() {
    const totalWidth = videoArea.clientWidth;
    const totalHeight =
      videoArea.clientHeight -
      document.documentElement.style.getPropertyValue("--inset-top");

    let col = Math.floor(totalWidth / baseWidth);
    let row = Math.floor(totalHeight / baseHeight);

    const n = videosDiv.children.length;

    let pCol, pRow;

    do {
      pCol = col;
      pRow = row;

      if (totalWidth / col / baseWidth < totalHeight / row / baseHeight) {
        --col;
      } else {
        --row;
      }
    } while (col >= 1 && row >= 1 && Math.floor(col) * Math.floor(row) >= n);

    const realCol = Math.max(1, Math.floor(pCol));
    const realRow = Math.max(1, Math.floor(pRow));

    const eachMaxWidth = totalWidth / realCol;
    const eachMaxHeight = totalHeight / realRow;

    const eachRatio = Math.min(
      eachMaxHeight / baseHeight,
      eachMaxWidth / baseWidth
    );

    const eachWidth = Math.floor(baseWidth * eachRatio);
    const eachHeight = Math.floor(baseHeight * eachRatio);

    document.documentElement.style.setProperty(
      "--each-width",
      eachWidth + "px"
    );

    document.documentElement.style.setProperty(
      "--each-height",
      eachHeight + "px"
    );
  }

  // Whenever a peer disconnected
  function peerDisconnected(data) {
    const element = document.getElementById(data);
    if (element) {
      element.remove();
      checkVideoSize();
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
    checkVideoSize();
  }

  // The video element on the page to display the webcam
  let video = document.createElement("video");

  // Constraints - what do we want?
  let constraints = { audio: true, video: true };

  // Prompt the user for permission, get the stream
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      /* Use the stream */

      // Attach to our video object
      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");

      // Wait for the stream to load enough to play
      video.onloadedmetadata = () => {
        video.play();

        recordEl.disabled = false;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        recordEl.addEventListener("click", () => {
          if (recordEl.classList.contains("recording")) {
            canvas.classList.remove("recording");
            recordEl.classList.remove("recording");
            recordEl.value = "●";
            recordEl.nextElementSibling.innerHTML = "Start Recording";
          } else {
            canvas.classList.add("recording");
            recordEl.classList.add("recording");
            recordEl.value = "■";
            recordEl.nextElementSibling.innerHTML = "Stop Recording";
          }
        });

        const context = canvas.getContext("2d");

        videosDiv.insertBefore(canvas, videosDiv.firstChild);

        checkVideoSize();

        const frameRate =
          stream.getVideoTracks()[0].getSettings().frameRate || 30;

        function draw() {
          context.drawImage(video, 0, 0);

          const threshold = +thresholdEl.value;
          const margin = Math.round(+areaEl.value);
          const mode = +modeEl.value;

          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

          context.putImageData(
            detectEdge(threshold, margin, imageData, context, mode),
            0,
            0
          );

          setTimeout(draw, 1000 / frameRate);
        }

        draw();

        const canvasStream = canvas.captureStream(frameRate);
        const audioTracks = video.srcObject.getAudioTracks();

        if (audioTracks.length > 0) {
          canvasStream.addTrack(audioTracks[0]);
        }

        const multiPeerConnection = new MultiPeerConnection({
          stream: canvasStream,
          host: "localhost:8080",
          onStream: receivedStream,
          onPeerDisconnect: peerDisconnected,
          videoBitrate,
          audioBitrate,
        });
      };
    })
    .catch((err) => {
      alert(err);
    });

  window.addEventListener("resize", () => {
    checkToolsHeight();
    checkVideoSize();
  });
});
