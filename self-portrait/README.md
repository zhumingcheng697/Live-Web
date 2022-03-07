# Self Portrait

**Live Web Week 1 Session 2 Assignment**

Source code available on [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/self-portrait) and [Glitch](https://glitch.com/edit/#!/mccoy-zhu-self-portrait), deployment available on [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/self-portrait) and [Glitch](https://mccoy-zhu-self-portrait.glitch.me/).

I am not exactly someone who likes to write a lot about oneself nor do I draw or illustrate very well, so I decided to make something simple that can demonstrate some of my skills, beliefs, design choices, etc.

I made this project using HTML (including `<video>`), CSS, and vanilla JavaScript (ie. no p5.js).

I started with this video that I like a lot called Wonderful tools, which was the intro animation of one of Apple’s special event.

The video has a simple gray background so I thought that it would be quite easy to blend into the webpage if I made the background of the webpage the same gray as the video—I was wrong. Turned out the the video had a gradient background so it took me quite a while to get it (almost) right with a `radial-gradient` in CSS.

I said almost, and I still wasn’t able to get it perfectly right, because I later realized that sometimes on some mobile devices, the color of the video is displayed somewhat differently compared to desktop browsers, but the background of the webpage will stay the same, so the video will stand out quite a bit and there will be some really noticeable seams around where the video meets the background. I tried to fix it with a JavaScript hack to check if the webpage is opened in a mobile environment, but there will almost certainly be some “false positives” and “false negatives” that can break this hack.

After getting the gradient background set up, I also took a long time to match the timing of the video with the background of the webpage, because the video actually starts from white and gradually transitions to that gradient gray around 0.5s–2s into the video. I originally had an event listener that checks for the current “playhead” of the video, but turned out that the event was fired really infrequently, so I had to use `setInterval` to update the background very “eagerly.”

After getting the visuals right, I added some mouse interaction capabilities. The video follows the mouse, clicking pauses/resumes the video, and size of the video and the volume of the video changes with the y-coordinate of the mouse. If the user drags the video left or right, the video will rewind or fast-forward at a speed dependant are how fast the mouse moves.

Later on, I also added some keyboard interaction capabilities. Left and right arrow keys rewind and fast-forward the video for a few seconds, respectively; space and enter keys pause/resume the video; and the number keys, just like in YouTube, jump the video to the 10%, 20%, 30%, etc.

To make the rewind and fast-forward more intuitive, I added a progress indicator that will show up for a few seconds if the user changes the video “playhead.”

I also spent some time to optimize for touch events on mobile. Unfortunately, drag to rewind or fast-forward was taken down on mobile as I gave priority to use touch events to move the position of the video and change the size of the video. I tried to implement multi-finger gestures but that messes up with some default browser/OS behaviors so I ended up not doing it. Besides, controlling the video volume programmatically with JavaScript appears to be disabled on iOS, so there isn’t much I can do about it.
