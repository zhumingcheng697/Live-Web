window.addEventListener("load", () => {
  function checkToolsHeight() {
    document.documentElement.style.setProperty(
      "--tools-height",
      document.getElementById("tools").clientHeight + "px"
    );
  }

  window.addEventListener("resize", () => {
    checkToolsHeight();
  });

  checkToolsHeight();

  const canvasArea = document.getElementById("canvas-area");

  for (let image of document.getElementsByTagName("img")) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.className = "eighty-six";

    const threshold = 12;
    const margin = 8;

    const context = canvas.getContext("2d");

    canvasArea.append(canvas);

    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    context.putImageData(
      detectEdge(threshold, margin, imageData, context, 1),
      0,
      0
    );
  }
});
