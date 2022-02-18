const socket = io.connect("https://mccoy-zhu-drawing-board-v2.glitch.me/");

let canvas, graphics, bgGraph;
let originalScale;

const vh = () =>
  Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
const vw = () =>
  Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const imgHeight = () => Math.min(150, vh() * 0.2, (vw() * 9) / 16 + 6);
const imgWidth = () => 300;

const originalSize = { width: 1920, height: 1080 };
const bgSize = { width: 320, height: 180 };
const toolsHeight = () => document.getElementById("tools").clientHeight;
const widthScale1 = () => window.innerWidth / originalSize.width;
const heightScale1 = () =>
  (window.innerHeight - toolsHeight() - imgHeight()) / originalSize.height;
const widthScale2 = () => (window.innerWidth - imgWidth()) / originalSize.width;
const heightScale2 = () =>
  (window.innerHeight - toolsHeight()) / originalSize.height;
const scale1 = () => Math.min(widthScale1(), heightScale1());
const scale2 = () => Math.min(widthScale2(), heightScale2());
const layoutV = () => (scale1() >= scale2() ? 1 : 2);
const actualScale = () => (layoutV() === 1 ? scale1() : scale2());
const actualWidth = () => actualScale() * originalSize.width;
const actualHeight = () => actualScale() * originalSize.height;

const toRelative = (unit) => unit / originalScale;
const toOriginal = (unit) => unit * originalScale;
const toBg = (unit) => (unit / originalSize.width) * bgSize.width;

function setup() {
  originalScale = actualScale();

  canvas = createCanvas(actualWidth(), actualHeight());
  canvas.id("drawing-board");
  canvas.parent("canvas-wrapper");

  graphics = createGraphics(actualWidth(), actualHeight());
  graphics.id("drawing-board-2");
  graphics.parent("graphics-wrapper");
  graphics.style("display", "block");

  bgGraph = createGraphics(bgSize.width, bgSize.height);
  bgGraph.style("display", "none");

  strokeJoin(ROUND);
}

function isInCanvas() {
  return (
    mouseX >= 0 &&
    mouseY >= 0 &&
    toRelative(mouseX) <= originalSize.width &&
    toRelative(mouseY) <= originalSize.height
  );
}

function resizeWrapper() {
  if (layoutV() === 1) {
    document.getElementById("canvas-wrapper").style.height = `calc(100% - ${
      toolsHeight() + imgHeight()
    }px)`;

    document.getElementById("graphics-wrapper").style.height = `calc(100% - ${
      toolsHeight() + imgHeight()
    }px)`;
  } else {
    document.getElementById(
      "canvas-wrapper"
    ).style.height = `calc(100% - ${toolsHeight()}px)`;

    document.getElementById(
      "graphics-wrapper"
    ).style.height = `calc(100% - ${toolsHeight()}px)`;
  }
}

function resizeCanvas_() {
  canvas.style("width", actualWidth() + "px");
  canvas.style("height", actualHeight() + "px");

  graphics.style("width", actualWidth() + "px");
  graphics.style("height", actualHeight() + "px");
}

function myClear(el) {
  el.getContext("2d").clearRect(0, 0, el.width, el.height);
}

window.addEventListener("DOMContentLoaded", () => {
  const to2DigitHex = (num) => ("00" + Math.floor(num).toString(16)).slice(-2);

  const colorWithOpacity = () => color_ + to2DigitHex(opacity_);

  const colorEl = document.getElementById("color");
  const opacityEl = document.getElementById("opacity");
  const sizeEl = document.getElementById("size");
  const resetEl = document.getElementById("reset");
  const saveEl = document.getElementById("save");
  const randomEl = document.getElementById("random");
  const sampleEl = document.getElementById("sample");
  const imagesDiv = document.getElementById("images");
  const captureEl = document.getElementById("capture");
  let snapshotEl;

  let isMouseDown = false;
  let color_, opacity_, size_;
  let sampleTimeoutId;
  let wasInCanvas;
  let needToReposition = false;
  let lastMouseX = null;
  let lastMouseY = null;
  let coords = [];
  let mouseMoved = false;

  function randomize() {
    color_ = `#${to2DigitHex(Math.random() * 256)}${to2DigitHex(
      Math.random() * 256
    )}${to2DigitHex(Math.random() * 256)}`;
    colorEl.value = color_;
    opacity_ = Math.floor(Math.random() * 255) + 1;
    opacityEl.value = `${opacity_}`;
    size_ = Math.floor(Math.random() * 100) + 1;
    sizeEl.value = `${size_}`;
  }

  function previewSample(length = 1500) {
    clearTimeout(sampleTimeoutId);
    sampleEl.classList.add("show");

    sampleTimeoutId = setTimeout(() => {
      sampleEl.classList.remove("show");
    }, length);
  }

  function updateSample() {
    if (needToReposition) {
      repositionSample();
      needToReposition = false;
    }
    sampleEl.style.width = size_ * actualScale() + "px";
    sampleEl.style.height = size_ * actualScale() + "px";
    sampleEl.style.borderRadius = size_ * actualScale() + "px";
    sampleEl.style.background = colorWithOpacity();
  }

  function repositionSample() {
    sampleEl.style.left = "";
    sampleEl.style.top = "";
    sampleEl.style.transform = "";
  }

  function takeSnapshot() {
    if (!snapshotEl) return;

    myClear(snapshotEl);

    const context = snapshotEl.getContext("2d");
    context.drawImage(captureEl, 0, 0, snapshotEl.width, snapshotEl.height);
    return snapshotEl.toDataURL("image/png");
  }

  function addCurve(coords, weight, color) {
    stroke(color);
    strokeWeight(toOriginal(weight));
    noFill();
    beginShape();
    const [firstX, firstY] = coords[0];
    curveVertex(toOriginal(firstX), toOriginal(firstY));
    for (let [x, y] of coords) {
      curveVertex(toOriginal(x), toOriginal(y));
    }
    const [lastX, lastY] = coords[coords.length - 1];
    curveVertex(toOriginal(lastX), toOriginal(lastY));
    endShape();
  }

  function getBg(coords, weight, color) {
    myClear(bgGraph.elt);
    bgGraph.stroke(color);
    bgGraph.strokeWeight(toBg(weight));
    bgGraph.noFill();
    bgGraph.beginShape();
    const [firstX, firstY] = coords[0];
    bgGraph.curveVertex(toBg(firstX), toBg(firstY));
    for (let [x, y] of coords) {
      bgGraph.curveVertex(toBg(x), toBg(y));
    }
    const [lastX, lastY] = coords[coords.length - 1];
    bgGraph.curveVertex(toBg(lastX), toBg(lastY));
    bgGraph.endShape();

    return bgGraph.elt.toDataURL("image/png");
  }

  function addBg(coords, weight, color, imgData, id = "myself") {
    const divEl = document.getElementById(id) || document.createElement("DIV");
    divEl.id = id;
    const bgImg = document.createElement("IMG");
    bgImg.src = getBg(coords, weight, color);
    divEl.append(bgImg);

    if (imgData) {
      divEl.style.backgroundImage = `url(${imgData})`;
    }

    if (id !== "myself") {
      imagesDiv.insertBefore(divEl, imagesDiv.childNodes[2]);
    }
  }

  function addDot(x, y, size, color, imgData, id = "myself") {
    myClear(bgGraph.elt);
    bgGraph.stroke(color);
    bgGraph.strokeWeight(toBg(size));
    bgGraph.point(toBg(x), toBg(y));

    const divEl = document.getElementById(id) || document.createElement("DIV");
    divEl.id = id;
    const bgImg = document.createElement("IMG");
    bgImg.setAttribute("src", bgGraph.elt.toDataURL("image/png"));
    divEl.append(bgImg);

    if (imgData) {
      divEl.style.backgroundImage = `url(${imgData})`;
    }

    if (id !== "myself") {
      imagesDiv.insertBefore(divEl, imagesDiv.childNodes[2]);
    }
  }

  function drawCurve() {
    myClear(graphics.elt);

    if (coords.length < 2) {
      coords = [];
      return;
    }

    addCurve(coords, size_, colorWithOpacity());
    addBg(coords, size_, colorWithOpacity());

    socket.emit("curve", {
      coords,
      weight: size_,
      color: colorWithOpacity(),
      imgData: takeSnapshot(),
    });

    coords = [];
  }

  randomize();
  updateSample();
  resizeWrapper();
  document.documentElement.style.setProperty(
    "--tools-height",
    toolsHeight() + "px"
  );
  document.body.className = "layout-" + layoutV();

  navigator.mediaDevices
    .getUserMedia({ audio: false, video: true })
    .then((stream) => {
      const info = stream.getVideoTracks()[0].getSettings();

      const scale = Math.max(
        bgSize.width / info.width,
        bgSize.height / info.height
      );

      snapshotEl = document.createElement("CANVAS");
      snapshotEl.width = info.width * scale;
      snapshotEl.height = info.height * scale;
      snapshotEl.style.display = "none";

      captureEl.srcObject = stream;

      captureEl.onloadedmetadata = () => {
        captureEl.play();
      };
    })
    .catch((e) => {
      console.error(e);
    });

  document.body.addEventListener("mousedown", (e) => {
    if (e.button > 1) return;

    if (
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      navigator.maxTouchPoints
    )
      return;

    isMouseDown = true;
    mouseMoved = false;
  });

  document.body.addEventListener("mouseup", (e) => {
    if (e.button > 1) return;

    if (
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      navigator.maxTouchPoints
    )
      return;

    drawCurve();
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("mouseleave", (e) => {
    if (e.button > 1) return;

    drawCurve();
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
    needToReposition = true;
    sampleEl.classList.remove("show");
  });

  document.body.addEventListener("blur", () => {
    drawCurve();
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
    needToReposition = true;
    sampleEl.classList.remove("show");
  });

  document.body.addEventListener("mousemove", (e) => {
    if (e.button > 1) return;

    if (
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      navigator.maxTouchPoints
    )
      return;

    if (isInCanvas()) {
      needToReposition = false;
      sampleEl.classList.add("show");
      sampleEl.style.left = e.clientX;
      sampleEl.style.top =
        layoutV() === 1 ? e.clientY - imgHeight() : e.clientY;
      sampleEl.style.transform = "translate(-50%, -50%)";
    } else {
      lastMouseX = null;
      lastMouseY = null;
      if (wasInCanvas == true) {
        needToReposition = true;
        sampleEl.classList.remove("show");
      }
    }

    if (isInCanvas() && isMouseDown) {
      if (lastMouseX !== null && lastMouseY != null) {
        mouseMoved = true;
        graphics.style("opacity", (opacity_ + 35) / 255);
        graphics.stroke(colorWithOpacity());
        graphics.strokeWeight(toOriginal(size_));
        graphics.line(lastMouseX, lastMouseY, mouseX, mouseY);
      }
      coords.push([toRelative(mouseX), toRelative(mouseY)]);
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    } else {
      drawCurve();
    }

    wasInCanvas = isInCanvas();
  });

  document.body.addEventListener("touchmove", (e) => {
    if (e.touches.length != 1) return;

    e.preventDefault();

    if (isInCanvas()) {
      if (lastMouseX !== null && lastMouseY != null) {
        mouseMoved = true;
        graphics.style("opacity", (opacity_ + 35) / 255);
        graphics.stroke(colorWithOpacity());
        graphics.strokeWeight(toOriginal(size_));
        graphics.line(lastMouseX, lastMouseY, mouseX, mouseY);
      }
      coords.push([toRelative(mouseX), toRelative(mouseY)]);
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    }
  });

  document.body.addEventListener("touchstart", () => {
    mouseMoved = false;
  });

  document.body.addEventListener("touchend", () => {
    drawCurve();
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("click", (e) => {
    if (e.button > 1) return;

    if (isInCanvas() && !mouseMoved) {
      stroke(colorWithOpacity());
      strokeWeight(toOriginal(size_));
      point(mouseX, mouseY);

      addDot(
        toRelative(mouseX),
        toRelative(mouseY),
        size_,
        colorWithOpacity(),
        null
      );

      socket.emit("dot", {
        x: toRelative(mouseX),
        y: toRelative(mouseY),
        size: size_,
        color: colorWithOpacity(),
        imgData: takeSnapshot(),
      });
    }
  });

  document.body.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    coords = [];
    myClear(graphics.elt);
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty(
      "--tools-height",
      toolsHeight() + "px"
    );
    updateSample();
    resizeCanvas_();
    resizeWrapper();
    document.body.className = "layout-" + layoutV();
  });

  colorEl.addEventListener("input", (e) => {
    color_ = e.target.value;
    updateSample();

    if (!isInCanvas()) {
      previewSample();
    }
  });

  opacityEl.addEventListener("input", (e) => {
    opacity_ = Number(e.target.value);
    updateSample();

    if (!isInCanvas()) {
      previewSample();
    }
  });

  sizeEl.addEventListener("input", (e) => {
    size_ = Number(e.target.value);
    updateSample();

    if (!isInCanvas()) {
      previewSample();
    }
  });

  resetEl.addEventListener("click", (e) => {
    e.stopPropagation();
    myClear(canvas.elt);
    imagesDiv
      .querySelectorAll("div:not(#myself), #myself > img")
      .forEach((e) => e.remove());
  });

  saveEl.addEventListener("click", (e) => {
    e.stopPropagation();
    saveCanvas(canvas, "drawing-board.png");
  });

  randomEl.addEventListener("click", (e) => {
    e.stopPropagation();
    randomize();
    updateSample();

    if (!isInCanvas()) {
      previewSample();
    }
  });

  socket.on("dot", ({ x, y, size, color, imgData, id }) => {
    stroke(color);
    strokeWeight(toOriginal(size));
    point(toOriginal(x), toOriginal(y));

    addDot(x, y, size, color, imgData, id);
  });

  socket.on("curve", ({ coords, weight, color, imgData, id }) => {
    addCurve(coords, weight, color);
    addBg(coords, weight, color, imgData, id);
  });

  socket.once("history", ({ imgs, curves, dots }) => {
    for (let curveArr of curves) {
      for (let { coords, weight, color, id } of curveArr) {
        addCurve(coords, weight, color);
        addBg(coords, weight, color, null, id);
      }
    }

    for (let dotArr of dots) {
      for (let { x, y, size, color, id } of dotArr) {
        stroke(color);
        strokeWeight(toOriginal(size));
        point(toOriginal(x), toOriginal(y));
        addDot(x, y, size, color, null, id);
      }
    }

    for (let [id, imgData] of imgs) {
      const divEl = document.getElementById(id);

      if (divEl) {
        divEl.style.backgroundImage = `url(${imgData})`;
        imagesDiv.insertBefore(divEl, imagesDiv.childNodes[2]);
      }
    }
  });
});
