# Drawing Board v2

**Live Web Week 4 Session 2 Assignment**

[Source code](https://glitch.com/edit/#!/mccoy-zhu-drawing-board-v2) and [deployment](https://mccoy-zhu-drawing-board-v2.glitch.me/) available on Glitch.

Now the website will take a picture every time the user draws something on the board and send it to every other users.

Every stroke drawn by the same user will be presented over their latest picture.

Users can cancel their pending stroke by pressing the escape key.

As explained earlier, I am using one p5 canvas for previewing the current user’s stroke with lines, and another p5 canvas for drawing every confirmed stroke with curves.

I am now using a third hidden p5 canvas to render each stroke into Base64-encoded PNG images and overlaying the PNG to recreate what each user has drawn on their own.

I am also using a fourth hidden plain HTML5 cavas to render the video frame into Base64-encoded PNG images.

I spent a lot of time thinking how to maintain the aspect ratio of the video frames and the drawing snapshot for each user, while at the same time minimizing the size of the data to transfer.

Currently the third p5 canvas is used on the receiver end to render strokes drawn by every other user, so only the coordinates of the strokes need to be sent. I can also let whoever drew the stroke render it out and send it to everyone else so that much less computation is needed for each user on average, but much more data will have to be transferred so I decided not to do so.

I was also wondering whether to create a separate canvas for each user so no PNG rendering is needed and strokes are directly drawn on the canvases. I really don’t know which is more expensive when it comes to time and memory, stacking images like what I am doing now or having multiple canvases. Theoretically if everyone only draw very few strokes and lots of people are drawing, stacking images may be better, but if only a few people draw a lot of strokes, multiple canvases may be better. Since I have no idea how people will use this website, I’ll just stick with what I already did for now.

I also order the snapshots by the time each user added their last stroke, and this order is maintained in the data structure on the server.

I use the ES6 Map to store the strokes and the latest picture from each user separately, and 5 minutes after a user disconnected from the server, I will remove their records to prevent the server from running out of memory.

I used a Map instead of an array or an object because of its better performance when inserting and removing values. It can also maintain all stored values in the order they were inserted, which I did not know before and turned out to be really useful.
