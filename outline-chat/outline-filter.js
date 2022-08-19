function outlineFilter({ threshold, margin, buffer, width, height, mode }) {
  const imageData = new Uint8ClampedArray(buffer);
  const newData = new Uint8ClampedArray(imageData.length);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const begin = (y * width + x) * 4;
      const r = imageData[begin];
      const g = imageData[begin + 1];
      const b = imageData[begin + 2];

      newData[begin] = 255;
      newData[begin + 1] = 255;
      newData[begin + 2] = 255;
      newData[begin + 3] = 255;

      const left = Math.max(x - margin, 0);
      const right = Math.min(x + margin, width - 1);

      const top = Math.max(y - margin, 0);
      const bottom = Math.min(y + margin, height - 1);

      for (let [dx, dy] of [
        [left, top],
        [x, top],
        [right, top],
        [left, y],
        [right, y],
        [left, bottom],
        [x, bottom],
        [right, bottom],
      ]) {
        const dbegin = (dy * width + dx) * 4;
        const dr = imageData[dbegin];
        const dg = imageData[dbegin + 1];
        const db = imageData[dbegin + 2];

        if (!mode || mode & 1) {
          if (dr - r > threshold) {
            newData[begin] -= 32;
          }

          if (dg - g > threshold) {
            newData[begin + 1] -= 32;
          }

          if (db - b > threshold) {
            newData[begin + 2] -= 32;
          }
        }

        if (mode & 2) {
          if (r - dr > threshold) {
            newData[begin + 1] -= 16;
            newData[begin + 2] -= 16;
          }

          if (g - dg > threshold) {
            newData[begin] -= 16;
            newData[begin + 2] -= 16;
          }

          if (b - db > threshold) {
            newData[begin] -= 16;
            newData[begin + 1] -= 16;
          }
        }
      }
    }
  }

  return newData.buffer;
}

self.addEventListener("message", ({ data }) => {
  if (data.buffer) {
    const newBuffer = outlineFilter(data);
    self.postMessage(newBuffer, [newBuffer]);
  }
});
