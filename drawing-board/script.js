const socket = io.connect("https://mccoy-zhu-drawing-board.glitch.me/");

let canvas;
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
}

function resizeCanvas_() {
  canvas.style("width", actualWidth() + "px");
  canvas.style("height", actualHeight() + "px");
}

function windowResized() {
  resizeCanvas_();
  resizeWrapper();
}

window.addEventListener("DOMContentLoaded", () => {
  const colorWithOpacity = () =>
    color_ + ("00" + opacity_.toString(16)).slice(-2);

  const colorEl = document.getElementById("color");
  const opacityEl = document.getElementById("opacity");
  const sizeEl = document.getElementById("size");
  const resetEl = document.getElementById("reset");
  const sampleEl = document.getElementById("sample");

  let isMouseDown = false;
  let color_ = colorEl.value;
  let opacity_ = Number(opacityEl.value);
  let size_ = Number(sizeEl.value);
  let sampleTimeoutId;
  let wasInCanvas;
  let needToReposition = false;
  let lastMouseX = null;
  let lastMouseY = null;

  function previewSample(length = 1000) {
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

  updateSample();
  resizeWrapper();

  document.body.addEventListener("mousedown", () => {
    isMouseDown = true;
  });

  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("mouseleave", () => {
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("blur", () => {
    isMouseDown = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("mousemove", (e) => {
    if (isInCanvas()) {
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
        stroke(colorWithOpacity());
        strokeWeight(toOriginal(size_));
        line(lastMouseX, lastMouseY, mouseX, mouseY);

        socket.emit("line", {
          x1: toRelative(lastMouseX),
          y1: toRelative(lastMouseY),
          x2: toRelative(mouseX),
          y2: toRelative(mouseY),
          weight: size_,
          color: colorWithOpacity(),
        });
      }
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    }

    wasInCanvas = isInCanvas();
  });

  document.body.addEventListener("touchmove", () => {
    if (isInCanvas()) {
      if (lastMouseX !== null && lastMouseY != null) {
        stroke(colorWithOpacity());
        strokeWeight(toOriginal(size_));
        line(lastMouseX, lastMouseY, mouseX, mouseY);

        socket.emit("line", {
          x1: toRelative(lastMouseX),
          y1: toRelative(lastMouseY),
          x2: toRelative(mouseX),
          y2: toRelative(mouseY),
          weight: size_,
          color: colorWithOpacity(),
        });
      }
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    } else {
      lastMouseX = null;
      lastMouseY = null;
    }
  });

  document.body.addEventListener("touchend", () => {
    lastMouseX = null;
    lastMouseY = null;
  });

  document.body.addEventListener("click", () => {
    if (isInCanvas()) {
      noStroke();
      fill(colorWithOpacity());
      ellipse(mouseX, mouseY, toOriginal(size_), toOriginal(size_));
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
    noStroke();
    fill(color);
    ellipse(toOriginal(x), toOriginal(y), toOriginal(size), toOriginal(size));
  });

  socket.on("line", ({ x1, y1, x2, y2, weight, color }) => {
    stroke(color);
    strokeWeight(toOriginal(weight));
    line(toOriginal(x1), toOriginal(y1), toOriginal(x2), toOriginal(y2));
  });
});
