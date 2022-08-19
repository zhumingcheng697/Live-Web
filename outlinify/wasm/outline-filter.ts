const _16: u8 = 16;
const _32: u8 = 32;

function min<T>(a: T, b: T): T {
  return a < b ? a : b;
}

export function outlineFilter(
  threshold: u8,
  margin: u32,
  width: u32,
  height: u32,
  mode: u32
): void {
  const size = width * height * 4;

  for (let i: usize = 0; i < size; ++i) {
    store<u8>(i + size, 255);
  }

  for (let x: u32 = 0; x < width; x++) {
    for (let y: u32 = 0; y < height; y++) {
      const begin: usize = (y * width + x) * 4;
      const dst: usize = begin + size;

      const r = load<u8>(begin);
      const g = load<u8>(begin + 1);
      const b = load<u8>(begin + 2);

      const left: u32 = x > margin ? x - margin : 0;
      const right: u32 = min(x + margin, width - 1);

      const top: u32 = y > margin ? y - margin : 0;
      const bottom: u32 = min(y + margin, height - 1);

      for (let i: u32 = 0; i < 3; ++i) {
        let dx: u32;

        if (i == 0) dx = left;
        else if (i == 1) dx = right;
        else dx = x;

        for (let j: u32 = 0; j < 3; ++j) {
          let dy: u32;

          if (j == 0) dy = top;
          else if (j == 1) dy = bottom;
          else if (dx == x) break;
          else dy = y;

          const dbegin: usize = (dy * width + dx) * 4;
          const dr = load<u8>(dbegin);
          const dg = load<u8>(dbegin + 1);
          const db = load<u8>(dbegin + 2);

          let _r = load<u8>(dst);
          let _g = load<u8>(dst + 1);
          let _b = load<u8>(dst + 2);

          if (!mode || mode & 1) {
            if (dr > r && dr - r > threshold) {
              _r -= min(_r, _32);
            }

            if (dg > g && dg - g > threshold) {
              _g -= min(_g, _32);
            }

            if (db > b && db - b > threshold) {
              _b -= min(_b, _32);
            }
          }

          if (mode & 2) {
            if (r > dr && r - dr > threshold) {
              _g -= min(_g, _16);
              _b -= min(_b, _16);
            }

            if (g > dg && g - dg > threshold) {
              _r -= min(_r, _16);
              _b -= min(_b, _16);
            }

            if (b > db && b - db > threshold) {
              _r -= min(_r, _16);
              _g -= min(_g, _16);
            }
          }

          store<u8>(dst, _r);
          store<u8>(dst + 1, _g);
          store<u8>(dst + 2, _b);
        }
      }
    }
  }
}
