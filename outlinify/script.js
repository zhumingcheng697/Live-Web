window.addEventListener("DOMContentLoaded", () => {
  const tools = document.getElementById("tools");
  const hiddenArea = document.getElementById("hidden");
  const renderedArea = document.getElementById("rendered-area");
  const inputs = tools.getElementsByTagName("input");
  const isWasmSupported = !!window.WebAssembly;
  const previewSize = isWasmSupported ? 480 : 360;

  const useOutlineWorker = () =>
    window.Worker &&
    (isWasmSupported
      ? new Worker("./wasm-outline-filter.js")
      : new Worker("./outline-filter.js"));

  const addDoubleClickOrKeyListener = (
    target,
    doubleListner = () => {},
    singleListener = () => {},
    timeout = 300
  ) => {
    let lastMouseTime = null;
    let lastMouseTarget = null;
    target.addEventListener("click", (e) => {
      if (lastMouseTarget == e.target && Date.now() - lastMouseTime < timeout) {
        doubleListner(e);
      } else {
        singleListener(e);
      }

      lastMouseTime = Date.now();
      lastMouseTarget = e.target;
    });

    let lastKeyTime = null;
    let lastKeyTarget = null;
    target.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (lastKeyTarget == e.target && Date.now() - lastKeyTime < timeout) {
          doubleListner(e);
        } else {
          singleListener(e);
        }
      }
      lastKeyTime = Date.now();
      lastKeyTarget = e.target;
    });
  };

  const defaults = [18, 18, 20, 18, 12, 12, 18, 12];

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

    checkToolsHeight();
  }

  function handleImage(
    image,
    defaultThreshold,
    defaultMargin,
    appendDirectly = false
  ) {
    let previewWorker = useOutlineWorker();

    if (previewWorker)
      previewWorker.onmessage = ({ data }) => {
        repaint(
          previewContext.createImageData(previewWidth, previewHeight),
          data,
          true
        );
      };

    let finalWorker = useOutlineWorker();

    if (finalWorker)
      finalWorker.onmessage = ({ data }) => {
        repaint(finalContext.createImageData(width, height), data, false);
      };

    function resetFinalFilter() {
      if (finalWorker && isRenderingFinal) {
        finalWorker.terminate();
        isRenderingFinal = false;

        finalWorker = useOutlineWorker();

        if (finalWorker) {
          if (isWasmSupported) {
            const imageData = finalContext.createImageData(width, height);

            imageData.data.set(
              new Uint8ClampedArray(finalImageData.data.buffer)
            );

            finalWorker.postMessage(
              {
                type: "init",
                buffer: imageData.data.buffer,
                size: imageData.data.length,
              },
              [imageData.data.buffer]
            );
          }

          finalWorker.onmessage = ({ data }) => {
            repaint(finalContext.createImageData(width, height), data, false);
          };
        }
      }
    }

    let isIdle = true;
    let isRenderingFinal = false;
    let frameOutOfDate = false;
    let finalOutOfDate = false;
    let appended = appendDirectly;

    const width = image.naturalWidth;
    const height = image.naturalHeight;

    const ratio = Math.min(1, previewSize / Math.min(width, height));

    const previewWidth = Math.round(width * ratio);
    const previewHeight = Math.round(height * ratio);

    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = previewWidth;
    previewCanvas.height = previewHeight;

    const previewContext = previewCanvas.getContext("2d");
    previewContext.drawImage(image, 0, 0, previewWidth, previewHeight);

    const previewImageData = previewContext.getImageData(
      0,
      0,
      previewWidth,
      previewHeight
    );

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = width;
    finalCanvas.height = height;

    const finalContext = finalCanvas.getContext("2d");
    finalContext.drawImage(image, 0, 0);

    const finalImageData = finalContext.getImageData(0, 0, width, height);

    const renderedImage = document.createElement("img");
    renderedImage.className = "rendered";
    renderedImage.tabIndex = 0;

    if (appendDirectly) renderedArea.appendChild(renderedImage);

    let threshold = defaultThreshold;
    let margin = defaultMargin;

    if (isWasmSupported) {
      if (previewWorker) {
        const imageData = previewContext.createImageData(
          previewWidth,
          previewHeight
        );

        imageData.data.set(new Uint8ClampedArray(previewImageData.data.buffer));

        previewWorker.postMessage(
          {
            type: "init",
            buffer: imageData.data.buffer,
            size: imageData.data.length,
          },
          [imageData.data.buffer]
        );
      }

      if (finalWorker) {
        const imageData = finalContext.createImageData(width, height);

        imageData.data.set(new Uint8ClampedArray(finalImageData.data.buffer));

        finalWorker.postMessage(
          {
            type: "init",
            buffer: imageData.data.buffer,
            size: imageData.data.length,
          },
          [imageData.data.buffer]
        );
      }
    }

    function repaint(imageData, buffer, previewing) {
      imageData.data.set(new Uint8ClampedArray(buffer));

      if (previewing) {
        previewContext.putImageData(imageData, 0, 0);
        renderedImage.src = previewCanvas.toDataURL();
      } else if (!frameOutOfDate && !finalOutOfDate) {
        finalContext.putImageData(imageData, 0, 0);
        renderedImage.src = finalCanvas.toDataURL();
      }

      if (!appended) {
        renderedArea.appendChild(renderedImage);
        setTimeout(() => {
          renderedArea.scrollIntoView(false);
        }, 10);
        appended = true;
      }

      if (previewing) {
        if (frameOutOfDate) {
          frameOutOfDate = false;
          draw();
        } else {
          isIdle = true;
          finalOutOfDate = true;
        }
      } else {
        isRenderingFinal = false;
      }

      if (frameOutOfDate || finalOutOfDate) {
        resetFinalFilter();
      }

      if (!isRenderingFinal && finalOutOfDate) {
        finalOutOfDate = false;
        draw(false);
      }
    }

    function draw(previewing = true) {
      if (previewing) {
        isIdle = false;
      } else {
        isRenderingFinal = true;
      }

      const payload = {
        threshold,
        margin: Math.max(1, Math.floor((previewing ? ratio : 1) * margin)),
        width: previewing ? previewWidth : width,
        height: previewing ? previewHeight : height,
        mode: 1,
      };

      if (isWasmSupported) {
        const worker = previewing ? previewWorker : finalWorker;

        if (worker) {
          payload.type = "filter";
          worker.postMessage(payload);
          return;
        }
      }

      let imageData;

      if (previewing) {
        imageData = previewContext.createImageData(previewWidth, previewHeight);
      } else {
        imageData = finalContext.createImageData(width, height);
      }

      imageData.data.set(
        new Uint8ClampedArray(
          (previewing ? previewImageData : finalImageData).data.buffer
        )
      );

      payload.buffer = imageData.data.buffer;

      const worker = previewing ? previewWorker : finalWorker;

      if (worker) {
        worker.postMessage(payload, [imageData.data.buffer]);
      } else {
        repaint(imageData, outlineFilter(payload), previewing);
      }
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
      inputs[1].max = Math.ceil(Math.max(width, height) / 40);
      inputs[1].value = margin;

      checkToolsHeight();
    }

    function removeMyself() {
      hideTools();
      image.remove();
      renderedImage.remove();
    }

    inputs[0].addEventListener("input", () => {
      if (selected === image.src) {
        threshold = +inputs[0].value;
        if (isIdle) {
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
        if (isIdle) {
          draw();
        } else {
          frameOutOfDate = true;
        }
      }
    });

    inputs[3].addEventListener("click", () => {
      if (selected === image.src) {
        removeMyself();
      }
    });

    addDoubleClickOrKeyListener(renderedImage, removeMyself, () => {
      if (selected === image.src) {
        hideTools();
      } else {
        showTools();
      }
    });
  }

  function uploadNewImage(file) {
    if (!file || !file.type.startsWith("image")) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const el = document.querySelector(`img[src="${e.target.result}"]`);
      if (el) return;

      const img = document.createElement("img");
      img.src = e.target.result;
      img.crossorigin = "anonymous";
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

    e.dataTransfer.dropEffect = !shouldIgnoreDrop ? "copy" : "none";
  });

  document.body.addEventListener("dragstart", () => {
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

    hiddenArea.remove();
  });
});
