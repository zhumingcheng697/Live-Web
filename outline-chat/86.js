window.addEventListener("load", () => {
  for (let image of document.getElementsByTagName("img")) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.className = "eighty-six";

    const threshold = 12;
    const margin = 8;

    const context = canvas.getContext("2d");

    document.body.append(canvas);

    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    context.putImageData(
      detectEdge(threshold, margin, imageData, context, 1),
      0,
      0
    );
  }
});
