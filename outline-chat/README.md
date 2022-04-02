# Outline Chat

**Live Web Week 8 Session 2 / Week 9 Session 1 Assignment**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/outline-chat) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-outline-chat)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/outline-chat) & [Glitch](https://mccoy-zhu-outline-chat.glitch.me/)

I first came up with a really simple [edge detection algorithm](https://github.com/zhumingcheng697/Live-Web/blob/main/outline-chat/edge-detector.js) that works extremely well especially with [images with a more uniform distribution of color like anime](https://zhumingcheng697.github.io/Live-Web/outline-chat/86.html).

I first hard-coded the parameters but added the knobs later for greater usability.

Ideally I would like to allow users to upload, style, and download their own images and add support for drag and drop, but since this is not the focus of our assignment this week, I did not have the time to do that.

I then applied this edge detection algorithm to video chat and laid out all the video feeds nicely on the screen.

Users can record their own video feed, which will be added to the screen and loop infinitely.

Recorded screens will only be visible to the current user who recorded the video, and it will have a yellow border around it.

When the user is recording, their video feed will have a red bolder around it (again, only visible to the current user), and when they are not recording, the bolder will be green.

I originally tried to capture both video and audio, and the streaming aspect worked well on Chrome and Safari on Mac and Safari on iOS, but Chrome on iOS actually would not allow you to capture both at the same time, and although Safari on iOS would allow you to capture, the recording aspect would be broken if you record a canvas stream that has an audio track. Thus, for better compatibility I removed the audio track.

Further more, video recording on Safari for Mac wasn’t working, and I assume that might be a Safari bug with recording canvas streams instead of something I am responsible for.

Regular video stream recording does work on Safari, but you have to specify the blob type as the `mimeType` of the `MediaRecorder`, which is `video/mp4` in Safari, and hard-coding `video/webm` would not work.

```js
new Blob(chunks, { type: recorder.mimeType });
```
