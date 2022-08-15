if (!WebAssembly.instantiateStreaming) {
  WebAssembly.instantiateStreaming = async (resp, importObject) => {
    const source = await (await resp).arrayBuffer();
    return await WebAssembly.instantiate(source, importObject);
  };
}

let imageDataLength;
let wasmResolve;
let wasmData;
let wasmReady = new Promise((resolve) => {
  wasmResolve = resolve;
});

function wasmInit({ size, buffer }) {
  const nPages = ((((size * 2) >>> 0) + 0xffff) & ~0xffff) >>> 16;
  const memory = new WebAssembly.Memory({ initial: nPages });

  WebAssembly.instantiateStreaming(fetch("./wasm/outline-filter.wasm"), {
    env: {
      memory,
      abort: (msg, file, line, column) =>
        console.error(`Error at ${line}:${column} in ${file}\n${msg}`),
    },
  }).then((instantiatedModule) => {
    const wasmExports = instantiatedModule.instance.exports;

    wasmData = new Uint8ClampedArray(memory.buffer);

    const imageData = new Uint8ClampedArray(buffer);
    for (let i = 0; i < imageData.length; ++i) {
      wasmData[i] = imageData[i];
    }
    imageDataLength = imageData.length;

    wasmResolve(wasmExports);
  });
}

async function wasmOutlineFilter({ threshold, margin, width, height, mode }) {
  wasmInstance = await wasmReady;

  wasmInstance.outlineFilter(threshold, margin, width, height, mode);

  const imageData = new Uint8ClampedArray(imageDataLength);

  for (let i = 0; i < imageDataLength; ++i) {
    imageData[i] = wasmData[i + imageDataLength];
  }

  return imageData.buffer;
}

self.addEventListener("message", ({ data }) => {
  if (data.type === "init") {
    wasmInit(data);
  } else if (data.type === "filter") {
    wasmOutlineFilter(data).then((newBuffer) => {
      self.postMessage(newBuffer, [newBuffer]);
    });
  }
});
