window.addEventListener("DOMContentLoaded", () => {
  const tools = document.getElementById("tools");
  const hiddenArea = document.getElementById("hidden");
  const renderedArea = document.getElementById("rendered-area");
  const inputs = tools.getElementsByTagName("input");
  const spans = tools.getElementsByTagName("span");

  const defaults = [18, 7, 20, 6, 12, 4, 18, 4];

  let selected = null;

  function checkToolsHeight() {
    document.documentElement.style.setProperty(
      "--tools-height",
      tools.clientHeight + "px"
    );
  }

  function hideTools() {
    selected = null;
    document.body.classList.add("no-canvas-selected");
    for (let input of inputs) {
      input.disabled = true;
    }

    for (let span of spans) {
      span.classList.add("disabled");
    }

    for (let image of renderedArea.getElementsByTagName("img")) {
      image.classList.remove("selected");
    }
  }

  window.addEventListener("resize", () => {
    checkToolsHeight();
  });

  checkToolsHeight();

  document.body.addEventListener("click", (e) => {
    if (e.target === document.body || e.target.id === "main-area") {
      hideTools();
    }
  });

  tools.addEventListener("click", (e) => {
    if (e.target === tools) {
      hideTools();
    }
  });

  window.addEventListener("load", () => {
    let index = 0;
    for (let image of hiddenArea.getElementsByTagName("img")) {
      const edgeDetector =
        window.Worker && new Worker("./simple-edge-detector.js");

      const width = image.naturalWidth;
      const height = image.naturalHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.className = "eighty-six";

      const renderedImage = document.createElement("img");
      renderedImage.className = "rendered";
      renderedArea.appendChild(renderedImage);

      const defaultThreshold = defaults[2 * index];
      const defaultMargin = defaults[2 * index + 1];

      ++index;

      let threshold = defaultThreshold;
      let margin = defaultMargin;

      const context = canvas.getContext("2d");
      hiddenArea.append(canvas);

      function repaint(imageData, buffer) {
        imageData.data.set(new Uint8ClampedArray(buffer));

        context.putImageData(imageData, 0, 0);

        renderedImage.src = canvas.toDataURL();

        shouldRequestNewFrame = true;
      }

      function draw() {
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, width, height);

        const payload = {
          threshold,
          margin,
          buffer: imageData.data.buffer,
          width,
          height,
          mode: 1,
        };

        if (edgeDetector) {
          edgeDetector.postMessage(payload, [imageData.data.buffer]);
        } else {
          repaint(imageData, detectEdge(payload));
        }
      }

      if (edgeDetector) {
        edgeDetector.onmessage = (e) => {
          repaint(context.createImageData(width, height), e.data);
        };
      }

      draw();

      function showTools() {
        selected = image.src;
        for (let img of renderedArea.getElementsByTagName("img")) {
          img.classList.remove("selected");
        }
        renderedImage.classList.add("selected");
        document.body.classList.remove("no-canvas-selected");
        for (let input of inputs) {
          input.disabled = false;
        }

        inputs[0].value = threshold;
        inputs[1].value = margin;

        for (let span of spans) {
          span.classList.remove("disabled");
        }
      }

      inputs[0].addEventListener("input", () => {
        if (selected === image.src) {
          threshold = +inputs[0].value;
          draw();
        }
      });

      inputs[1].addEventListener("input", () => {
        if (selected === image.src) {
          margin = +inputs[1].value;
          draw();
        }
      });

      inputs[2].addEventListener("click", () => {
        if (selected === image.src) {
          threshold = defaultThreshold;
          margin = defaultMargin;

          inputs[0].value = threshold;
          inputs[1].value = margin;
          draw();
        }
      });

      renderedImage.addEventListener("click", () => {
        if (selected === image.src) {
          hideTools();
        } else {
          showTools();
        }
      });
    }
  });
});
