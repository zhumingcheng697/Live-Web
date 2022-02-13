const socket = io.connect("https://mccoy-zhu-drawing-board.glitch.me/");

let canvas;
let graphics;
let originalScale;

const originalSize = { width: 1920, height: 1080 };
const toolsHeight = () => document.getElementById("tools").clientHeight;
const widthScale = () => window.innerWidth / originalSize.width;
const heightScale = () =>
  (window.innerHeight - toolsHeight()) / originalSize.height;
const actualScale = () => Math.min(widthScale(), heightScale());
const actualWidth = () => actualScale() * originalSize.width;
const actualHeight = () => actualScale() * originalSize.height;

const toRelative = (unit) => unit / originalScale;
const toOriginal = (unit) => unit * originalScale;

function setup() {
  originalScale = actualScale();

  canvas = createCanvas(actualWidth(), actualHeight());
  canvas.id("drawing-board");
  canvas.parent("canvas-wrapper");

  graphics = createGraphics(actualWidth(), actualHeight());
  graphics.id("drawing-board-2");
  graphics.parent("graphics-wrapper");
  graphics.style("display", "block");

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
  document.getElementById(
    "canvas-wrapper"
  ).style.height = `calc(100% - ${toolsHeight()}px)`;

  document.getElementById(
    "graphics-wrapper"
  ).style.height = `calc(100% - ${toolsHeight()}px)`;
}

function resizeCanvas_() {
  canvas.style("width", actualWidth() + "px");
  canvas.style("height", actualHeight() + "px");

  graphics.style("width", actualWidth() + "px");
  graphics.style("height", actualHeight() + "px");
}

function windowResized() {
  resizeCanvas_();
  resizeWrapper();
}

window.addEventListener("DOMContentLoaded", () => {
  const to2DigitHex = (num) => ("00" + Math.floor(num).toString(16)).slice(-2);

  const colorWithOpacity = () => color_ + to2DigitHex(opacity_);

  const colorEl = document.getElementById("color");
  const opacityEl = document.getElementById("opacity");
  const sizeEl = document.getElementById("size");
  const resetEl = document.getElementById("reset");
  const sampleEl = document.getElementById("sample");

  let isMouseDown = false;
  let color_ = `#${to2DigitHex(Math.random() * 255)}${to2DigitHex(
    Math.random() * 255
  )}${to2DigitHex(Math.random() * 255)}`;
  colorEl.value = color_;
  let opacity_ = Number(opacityEl.value);
  let size_ = Number(sizeEl.value);
  let sampleTimeoutId;
  let wasInCanvas;
  let needToReposition = false;
  let lastMouseX = null;
  let lastMouseY = null;
  let coords = [];
  let mouseMoved = false;

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

  function drawCurve() {
    if (!coords.length) return;

    graphics.clear();
    stroke(colorWithOpacity());
    strokeWeight(toOriginal(size_));
    noFill();
    beginShape();
    for (let [x, y] of coords) {
      curveVertex(toOriginal(x), toOriginal(y));
    }
    endShape();

    socket.emit("curve", {
      coords,
      weight: size_,
      color: colorWithOpacity(),
    });

    coords = [];
  }

  updateSample();
  resizeWrapper();

  document.body.addEventListener("mousedown", () => {
    isMouseDown = true;
    mouseMoved = false;
  });

  document.body.addEventListener("mouseup", () => {
    drawCurve();
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("mouseleave", () => {
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
    if (
      isInCanvas() &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !navigator.maxTouchPoints
    ) {
      needToReposition = false;
      sampleEl.classList.add("show");
      sampleEl.style.left = e.clientX;
      sampleEl.style.top = e.clientY;
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
        if (!coords.length) {
          coords.push([toRelative(lastMouseX), toRelative(lastMouseY)]);
        }
        coords.push([toRelative(mouseX), toRelative(mouseY)]);
      }
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    } else {
      drawCurve();
    }

    wasInCanvas = isInCanvas();
  });

  document.body.addEventListener("touchmove", (e) => {
    e.preventDefault();

    if (isInCanvas()) {
      if (lastMouseX !== null && lastMouseY != null) {
        mouseMoved = true;
        graphics.style("opacity", (opacity_ + 35) / 255);
        graphics.stroke(colorWithOpacity());
        graphics.strokeWeight(toOriginal(size_));
        graphics.line(lastMouseX, lastMouseY, mouseX, mouseY);
        if (!coords.length) {
          coords.push([toRelative(lastMouseX), toRelative(lastMouseY)]);
        }
        coords.push([toRelative(mouseX), toRelative(mouseY)]);
      }
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    } else {
      drawCurve();
      lastMouseX = null;
      lastMouseY = null;
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

  document.body.addEventListener("click", () => {
    if (isInCanvas() && !mouseMoved) {
      stroke(colorWithOpacity());
      strokeWeight(toOriginal(size_));
      point(mouseX, mouseY);

      socket.emit("dot", {
        x: toRelative(mouseX),
        y: toRelative(mouseY),
        size: size_,
        color: colorWithOpacity(),
      });
    }
  });

  window.addEventListener("resize", () => {
    updateSample();
  });

  colorEl.addEventListener("input", (e) => {
    color_ = e.target.value;
    updateSample();
    previewSample();
  });

  opacityEl.addEventListener("input", (e) => {
    opacity_ = Number(e.target.value);
    updateSample();
    previewSample();
  });

  sizeEl.addEventListener("input", (e) => {
    size_ = Number(e.target.value);
    updateSample();
    previewSample();
  });

  resetEl.addEventListener("click", () => {
    clear();
  });

  socket.on("dot", ({ x, y, size, color }) => {
    stroke(color);
    strokeWeight(toOriginal(size));
    point(toOriginal(x), toOriginal(y));
  });

  socket.on("curve", ({ coords, weight, color }) => {
    strokeJoin(ROUND);
    stroke(color);
    strokeWeight(toOriginal(weight));
    noFill();
    beginShape();
    for (let [x, y] of coords) {
      curveVertex(toOriginal(x), toOriginal(y));
    }
    endShape();
  });
});
