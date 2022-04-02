window.addEventListener("DOMContentLoaded", () => {
  const tools = document.getElementById("tools");
  const canvasArea = document.getElementById("canvas-area");
  const inputs = tools.getElementsByTagName("input");
  const spans = tools.getElementsByTagName("span");

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
    for (let image of document.getElementsByTagName("img")) {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.className = "eighty-six";

      let threshold = 12;
      let margin = 8;

      const context = canvas.getContext("2d");
      canvasArea.append(canvas);

      function draw() {
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        context.putImageData(
          detectEdge(threshold, margin, imageData, context, 1),
          0,
          0
        );
      }

      draw();

      function showTools() {
        selected = image.src;
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

      canvas.addEventListener("click", () => {
        if (selected === image.src) {
          hideTools();
        } else {
          showTools();
        }
      });
    }
  });
});
