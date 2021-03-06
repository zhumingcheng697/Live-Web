# Drawing Board

**Live Web Week 3 Session 2 Assignment**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/drawing-board) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-drawing-board)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/drawing-board) & [Glitch](https://mccoy-zhu-drawing-board.glitch.me/)

I spent most of my time thinking how to make this drawing board look the same on every screen.

The major issue with p5 skecthes or the `<canvas>` element in general is that they cannot be easily resized. Once created, you can only scale it as if it is a raster image, or call `resizeCanvas` and start from a new canvas.

I decided to create a 16 by 9 canvas that fits the user’s screen at first and then rescale it if the window is resized.

Mouse positions sent to the server will be relative to each user’s screen size, so that a stroke at the center of a smart phone would also appear at the center on an 8K TV.

Users can choose the color, opacity, and stroke weight of their brushes.

When users hover over the canvas, they can preview their brush strokes. Users can also preview their brush strokes when setting the color, opacity, or weight/size.

Clicking on the canvas draws a dot, and dragging on the canvas draws a curve.

p5 `line`s are used to draw segments of the curve after each `mousemove` event, but if opacity is set below 100%, the joints of the `line`s look a bit weird. It is not really an issue that can be solved. I can also use `curve` and connect the points together in one go, but then the curve will only be drawn after the user finishes their entire stroke, and the user experience would be much worse that way.

UPDATE 1: I somewhat solved the issue I mentioned above by drawing the curve with lines in a separate “preview” canvas while the user is still drawing, and then clear that canvas and redraw the whole curve with curveVertex on the “main” canvas as soon as the user finishes with that curve. This way, only the coordinates of the final curve will be sent to the server and drawn on other users’ “main” canvases in one go, resulting in less packets sent and better visuals.

UPDATE 2: Now strokes drawn by all active users and users who quit less than 5 minutes ago will be automatically loaded the first time you enter the drawing board or when you refresh it.
