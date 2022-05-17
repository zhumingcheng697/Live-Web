# Outlinify

**An Interactive Image Manipulation Tool**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/outlinify) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-outlinify)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/outlinify) & [Glitch](https://mccoy-zhu-outlinify.glitch.me/)

This is an interactive tool that utilizes my [simple edge detector](https://github.com/zhumingcheng697/Live-Web/tree/main/outlinify/outline-filter.js) and supports uploading custom images as well as drag-and-drop for uploading.

Whenever the user changes the filter settings, I always render a quick preview first and then render a full-resolution final image after the user has done changing the filter settings.

Rendering is always done through Web Workers (when supported) for better UI responsiveness, and rerendering is skipped until the previous render has completed to prevent rendering jobs from queuing up.

If the filter settings are modified while the full-resolution image is being rendered, the render is immediately terminated through the `Worker.terminate` method (when Web Worker is supported) to prevent unnecessary wait.
