function min<T>(a: T, b: T): T {
  return a < b ? a : b;
}

const _16: u8 = 16;
const _32: u8 = 32;

function calculateColor(
  dx: u32,
  dy: u32,
  width: u32,
  height: u32,
  mode: u8,
  begin: usize,
  threshold: u8
): void {
  const mode1 = mode ? !!(mode & 1) : true;
  const mode2 = !!(mode & 2);

  const r = load<u8>(begin);
  const g = load<u8>(begin + 1);
  const b = load<u8>(begin + 2);

  const dbegin: usize = (dy * width + dx) * 4;
  const dr = load<u8>(dbegin);
  const dg = load<u8>(dbegin + 1);
  const db = load<u8>(dbegin + 2);

  const dst: usize = begin + width * height * 4;
  let _r = load<u8>(dst);
  let _g = load<u8>(dst + 1);
  let _b = load<u8>(dst + 2);

  if (dr > r && dr - r > threshold && mode1) {
    _r -= min(_r, _32);
  } else if (r > dr && r - dr > threshold && mode2) {
    _g -= min(_g, _16);
    _b -= min(_b, _16);
  }

  if (dg > g && dg - g > threshold && mode1) {
    _g -= min(_g, _32);
  } else if (g > dg && g - dg > threshold && mode2) {
    _r -= min(_r, _16);
    _b -= min(_b, _16);
  }

  if (db > b && db - b > threshold && mode1) {
    _b -= min(_b, _32);
  } else if (b > db && b - db > threshold && mode2) {
    _r -= min(_r, _16);
    _g -= min(_g, _16);
  }

  store<u8>(dst, _r);
  store<u8>(dst + 1, _g);
  store<u8>(dst + 2, _b);
}

export function outlineFilter(
  threshold: u8,
  margin: u32,
  width: u32,
  height: u32,
  mode: u8
): void {
  for (let i: usize = 0; i < width * height * 4; ++i) {
    store<u8>(i + width * height * 4, 255);
  }

  for (let x: u32 = 0; x < width; x++) {
    for (let y: u32 = 0; y < height; y++) {
      const begin: usize = (y * width + x) * 4;

      const left: u32 = x > margin ? x - margin : 0;
      const right: u32 = min(x + margin, width - 1);

      const top: u32 = y > margin ? y - margin : 0;
      const bottom: u32 = min(y + margin, height - 1);

      calculateColor(left, top, width, height, mode, begin, threshold);
      calculateColor(x, top, width, height, mode, begin, threshold);
      calculateColor(right, top, width, height, mode, begin, threshold);

      calculateColor(left, y, width, height, mode, begin, threshold);
      calculateColor(right, y, width, height, mode, begin, threshold);

      calculateColor(left, bottom, width, height, mode, begin, threshold);
      calculateColor(x, bottom, width, height, mode, begin, threshold);
      calculateColor(right, bottom, width, height, mode, begin, threshold);
    }
  }
}
