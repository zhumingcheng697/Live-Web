#include <cstdint>

const uint8_t _16 = 16;
const uint8_t _32 = 32;

static uint32_t xCords[] = {0, 0, 0};
static uint32_t yCords[] = {0, 0, 0};

template<typename T>
T min(T a, T b) {
    return a < b ? a : b;
}

extern "C"
void outlineFilter(
    uint8_t threshold,
    uint32_t margin,
    uint32_t width,
    uint32_t height,
    uint32_t mode
) {
    const uint32_t size = width * height * 4;
    const auto *const final = reinterpret_cast<uint8_t *>(size);

    for (auto *i = reinterpret_cast<uint8_t *>(0); i < final; ++i) {
        *(i + size) = 255;
    }

    for (uint32_t x = 0; x < width; x++) {
        for (uint32_t y = 0; y < height; y++) {
            auto *const begin = reinterpret_cast<uint8_t *>(
                (y * width + x) * 4);
            uint8_t *const dst = begin + size;

            const uint8_t r = *(begin);
            const uint8_t g = *(begin + 1);
            const uint8_t b = *(begin + 2);

            xCords[0] = x > margin ? x - margin : 0;
            xCords[1] = min(x + margin, width - 1);
            xCords[2] = x;

            yCords[0] = y > margin ? y - margin : 0;
            yCords[1] = min(y + margin, height - 1);
            yCords[2] = y;

            for (uint32_t dx: xCords) {
                for (uint32_t dy : yCords) {
                    if (dx == x && dy == y) goto done;

                    const uint8_t *const dbegin = reinterpret_cast<uint8_t *>(
                        (dy * width + dx) * 4);
                    const uint8_t dr = *(dbegin);
                    const uint8_t dg = *(dbegin + 1);
                    const uint8_t db = *(dbegin + 2);

                    uint8_t _r = *(dst);
                    uint8_t _g = *(dst + 1);
                    uint8_t _b = *(dst + 2);

                    if (!mode || (mode & 1)) {
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

                    *(dst) = _r;
                    *(dst + 1) = _g;
                    *(dst + 2) = _b;
                }
            }

            done:;
        }
    }
}