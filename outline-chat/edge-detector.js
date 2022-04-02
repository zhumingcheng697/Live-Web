function detectEdge(threshold, margin, originalImageData, context, mode) {
  const mode1 = mode ? !!(mode & 1) : true;
  const mode2 = !!(mode & 2);

  const newData = context.createImageData(
    originalImageData.width,
    originalImageData.height
  );

  for (let x = 0; x < originalImageData.width; x++) {
    for (let y = 0; y < originalImageData.height; y++) {
      const begin = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[begin];
      const g = originalImageData.data[begin + 1];
      const b = originalImageData.data[begin + 2];

      newData.data[begin] = 255;
      newData.data[begin + 1] = 255;
      newData.data[begin + 2] = 255;
      newData.data[begin + 3] = 255;

      const left = Math.max(x - margin, 0);
      const right = Math.min(x + margin, originalImageData.width - 1);

      const top = Math.max(y - margin, 0);
      const bottom = Math.min(y + margin, originalImageData.height - 1);

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
        const dbegin = (dy * originalImageData.width + dx) * 4;
        const dr = originalImageData.data[dbegin];
        const dg = originalImageData.data[dbegin + 1];
        const db = originalImageData.data[dbegin + 2];

        if (dr - r > threshold && mode1) {
          newData.data[begin] -= 32;
        } else if (r - dr > threshold && mode2) {
          newData.data[begin + 1] -= 16;
          newData.data[begin + 2] -= 16;
        }

        if (dg - g > threshold && mode1) {
          newData.data[begin + 1] -= 32;
        } else if (g - dg > threshold && mode2) {
          newData.data[begin] -= 16;
          newData.data[begin + 2] -= 16;
        }

        if (db - b > threshold && mode1) {
          newData.data[begin + 2] -= 32;
        } else if (b - db > threshold && mode2) {
          newData.data[begin] -= 16;
          newData.data[begin + 1] -= 16;
        }
      }
    }
  }

  return newData;
}
