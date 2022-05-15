window.addEventListener("DOMContentLoaded", () => {
  const tools = document.getElementById("tools");
  const hiddenArea = document.getElementById("hidden");
  const renderedArea = document.getElementById("rendered-area");
  const inputs = tools.getElementsByTagName("input");
  const spans = tools.getElementsByTagName("span");

  const defaults = [18, 6, 20, 6, 12, 4, 18, 4];

  let selected = null;
  let shouldIgnoreDrop = false;

  function checkToolsHeight() {
    document.documentElement.style.setProperty(
      "--tools-height",
      tools.clientHeight + "px"
    );
  }

  function hideTools() {
    selected = null;
    tools.classList.remove("selected");

    for (let image of renderedArea.getElementsByTagName("img")) {
      image.classList.remove("selected");
    }
  }

  function handleImage(
    image,
    defaultThreshold,
    defaultMargin,
    appendDirectly = false
  ) {
    const edgeDetector =
      window.Worker && new Worker("./simple-edge-detector.js");

    let isIdle = true;
    let frameOutOfDate = false;
    let appended = appendDirectly;

    const width = image.naturalWidth;
    const height = image.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.className = "eighty-six";

    const renderedImage = document.createElement("img");
    renderedImage.className = "rendered";

    if (appendDirectly) renderedArea.appendChild(renderedImage);

    let threshold = defaultThreshold;
    let margin = defaultMargin;

    const context = canvas.getContext("2d");
    hiddenArea.append(canvas);

    function repaint(imageData, buffer) {
      imageData.data.set(new Uint8ClampedArray(buffer));

      context.putImageData(imageData, 0, 0);

      renderedImage.src = canvas.toDataURL();

      if (!appended) {
        renderedArea.appendChild(renderedImage);
        renderedArea.scrollIntoView(false);
        appended = true;
      }

      if (frameOutOfDate) {
        frameOutOfDate = false;
        draw();
      } else {
        isIdle = true;
      }
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

      tools.classList.add("selected");

      inputs[0].value = threshold;
      inputs[1].value = margin;

      for (let span of spans) {
        span.classList.remove("disabled");
      }
    }

    inputs[0].addEventListener("input", () => {
      if (selected === image.src) {
        threshold = +inputs[0].value;
        if (isIdle) {
          isIdle = false;
          draw();
        } else {
          frameOutOfDate = true;
        }
      }
    });

    inputs[1].addEventListener("input", () => {
      if (selected === image.src) {
        margin = +inputs[1].value;
        if (isIdle) {
          isIdle = false;
          draw();
        } else {
          frameOutOfDate = true;
        }
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

    inputs[3].addEventListener("click", () => {
      if (selected === image.src) {
        hideTools();
        image.remove();
        renderedImage.remove();
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

  function uploadNewImage(file) {
    if (!file || !/^image\/.*$/.test(file.type)) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.crossorigin = "anonymous";
      hiddenArea.append(img);
      img.addEventListener("load", () => {
        handleImage(img, 10, 3);
      });
    };
    fileReader.readAsDataURL(file);
  }

  function handleFiles(files) {
    for (let i = 0; i < files.length; ++i) {
      uploadNewImage(files[i]);
    }
  }

  window.addEventListener("resize", () => {
    checkToolsHeight();
  });

  document.body.addEventListener("dragover", (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!shouldIgnoreDrop) e.dataTransfer.dropEffect = "copy";
  });

  document.body.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "none";
    shouldIgnoreDrop = true;
  });

  document.body.addEventListener("dragend", () => {
    shouldIgnoreDrop = false;
  });

  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!shouldIgnoreDrop) handleFiles(e.dataTransfer.files);
  });

  checkToolsHeight();

  document.body.addEventListener("click", (e) => {
    if (
      e.target === document.body ||
      e.target.id === "main-area" ||
      e.target.id === "rendered-area"
    ) {
      hideTools();
    }
  });

  tools.addEventListener("click", (e) => {
    if (e.target === tools) {
      hideTools();
    }
  });

  inputs[4].addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  inputs[5].addEventListener("click", () => {
    inputs[4].click();
  });

  window.addEventListener("load", () => {
    let index = 0;
    for (let image of hiddenArea.getElementsByTagName("img")) {
      const defaultThreshold = defaults[2 * index];
      const defaultMargin = defaults[2 * index + 1];
      ++index;

      handleImage(image, defaultThreshold, defaultMargin, true);
    }
  });
});
