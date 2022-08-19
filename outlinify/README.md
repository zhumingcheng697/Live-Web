# Outlinify

**An Interactive Image Manipulation Tool**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/outlinify)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/outlinify)

This is an interactive tool that utilizes my [simple edge detector](https://github.com/zhumingcheng697/Live-Web/tree/main/outlinify/outline-filter.js) and supports uploading custom images as well as drag-and-drop for uploading.

Whenever the user changes the filter settings, I always render a quick preview first and then render a full-resolution final image after the user has done changing the filter settings.

Rendering is always done through Web Workers (when supported) for better UI responsiveness, and rerendering is skipped until the previous render has completed to prevent rendering jobs from queuing up.

If the filter settings are modified while the full-resolution image is being rendered, the render is immediately terminated through the `Worker.terminate` method (when Web Worker is supported) to prevent unnecessary wait.

WebAssembly is also utilized (when supported) to yield more predictable performance and slightly lower the memory footprint of JIT compiled code.

Two versions of WebAssembly binaries are available for use: an [AssemblyScript](https://www.assemblyscript.org) version compiled from [source code in its TypeScript-like syntax](https://github.com/zhumingcheng697/Live-Web/tree/main/outlinify/wasm/as/outline-filter.ts) that has a smaller file size (~1KB) but slightly slower, and an [Emscripten](https://emscripten.org) version compiled from [standard C++ source code](https://github.com/zhumingcheng697/Live-Web/tree/main/outlinify/wasm/emscripten/outline-filter.cpp) that has a larger file (~4KB) size but slightly faster.

To use the AssemblyScript binary, set the query parameter `wasm-version` to either `assemblyscript` or `as`. Otherwise, the Emscripten version will be used by default.

To disable WedAssembly, set the query parameter `disable-wasm` to any value.

To disable Web Worker (which is highly discouraged as this results in much worse performace), set the query parameter `disable-worker` to any value.

> Since my WebAssembly implementation also requires Web Worker to run, disabling Web Worker will also disable WebAssembly.
