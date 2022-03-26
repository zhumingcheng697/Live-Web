# Earth Chat

**Live Web Week 8 Session 1 Assignment**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/earth-chat) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-earth-chat)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/earth-chat) & [Glitch](https://mccoy-zhu-earth-chat.glitch.me/)

This project uses the template [threejs-webrtc](https://github.com/AidanNelson/threejs-webrtc).

I can’t think of much that I can add onto the video aspect so I worked more on the 3D and interaction apsect.

I removed all the gridlines and background and other extra HTML elements and put a sphere with the texture of the Earth in the center of the scene.

I added some stars that are randomly place far away from “the Earth.”

Users’ video boxes are randomly placed around ”the Earth” and will orbit around at random speeds.

I also changed how user interactions control the scene.

Users can now only drag left or right but not up or down. Instead of panning the camera, dragging on the screen left or right will actually control the speed and direction the user’s video box orbit. Users can do so to quickly see if there’s anyone else with them orbiting.

Users can also use the left and right arrow keys, the space key, or the `A` and `D` key to control the speed and direction the video boxes orbits, and the up and down arrow keys or the `W` or `S` key to control the altitude of the orbit.

I tried to make the video box the same aspect ratio as the video source so that it is no longer distorted, but the source code is quite coupled and I couldn’t get it to work without breaking other things.
