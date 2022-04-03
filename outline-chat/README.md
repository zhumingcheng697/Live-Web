# Outline Chat

**Live Web Week 8 Session 2 / Week 9 Session 1 Assignment**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/outline-chat) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-outline-chat)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/outline-chat) & [Glitch](https://mccoy-zhu-outline-chat.glitch.me/)

I first came up with a really simple [edge detection algorithm](https://github.com/zhumingcheng697/Live-Web/blob/main/outline-chat/simple-edge-detector.js) that works extremely well especially with [images with a more uniform distribution of color like anime](https://zhumingcheng697.github.io/Live-Web/outline-chat/86.html).

I first hard-coded the parameters but added the knobs later for greater usability.

Ideally I would like to allow users to upload, style, and download their own images and add support for drag and drop, but since this is not the focus of our assignment this week, I did not have the time to do that.

I then applied this edge detection algorithm to video chat and laid out all the video feeds nicely on the screen.

Users can record their own video feed, which will be added to the screen and loop infinitely.

Recorded screens will only be visible to the current user who recorded the video, and it will have a yellow border around it.

When the user is recording, their video feed will have a red border around it (again, only visible to the current user), and when they are not recording, the border will be green.

I originally tried to capture both video and audio, and the streaming aspect worked well on Chrome and Safari on Mac and Safari on iOS, but Chrome on iOS actually would not allow you to capture both at the same time, and although Safari on iOS would allow you to capture, the recording aspect would be broken if you record a canvas stream that has an audio track. Thus, for better compatibility I removed the audio track.

Further more, video recording on Safari for Mac wasn’t working, and I assume that might be a Safari bug with recording canvas streams instead of something I am responsible for.

Regular video stream recording does work on Safari, but you have to specify the blob type as the `mimeType` of the `MediaRecorder`, which is `video/mp4` in Safari, and hard-coding `video/webm` would not work.

```js
new Blob(chunks, { type: recorder.mimeType });
```

UPDATE1: An issue that kept bothering me was that the UI would be quite laggy when the user is dragging the knobs to control the image filer. Fortunately, I was able to greatly improve the responsiveness on the main UI thread by running the more computationally expensive edge detection algorithm in worker threads using Web Worker.

UPDATE2: Another issue I realized after making use of Web Workers was that when the user keeps dragging the knob, the `input` event of the slider often gets fired much more frequently than the time it takes for the edge detection algorithm to run. It was not a huge issue earlier when everything was done on the main thread, because the edge detection algorithm would simply block the UI thread and no `input` event would fire when the edge detection algorithm is running. However, since the edge detection algorithm is running in worker threads now, if we do not “debounce” and still redraw the canvas on each `input` event, all the “redraw requests” would soon queue up and the canvas would fall behind like a slow-motion. If I only allow redraw after the previous run of the edge detection algorithm has finished, however, that would still be an issue, because some “redraw requests” would simply get ignored and if the last “redraw request” was not processed, the canvas would be out of date until the user drags the knobs again. What I did instead was keeping track of whether the canvas has gone out of date and redraw automatically if so when the edge detection algorithm finished running. With this approach, the canvas would never get stuck in an out-of-date state or would not fall behind more than a fraction of a second.
