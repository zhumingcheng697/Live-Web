# Drawing Board v3

**Live Web Week 8 Session 1 Assignment**

Source Code: [GitHub](https://github.com/zhumingcheng697/Live-Web/tree/main/drawing-board-v3) & [Glitch](https://glitch.com/edit/#!/mccoy-zhu-drawing-board-v3)

Deployment: [GitHub Pages](https://zhumingcheng697.github.io/Live-Web/drawing-board-v3) & [Glitch](https://mccoy-zhu-drawing-board-v3.glitch.me/)

Now everything aspect of “live web” is done using `p5LiveMedia`.

- The signaling is done with the ITP server run by `p5LiveMedia`.

- The coordinate information of the drawings are sent through the `p5LiveMedia` data channel.

- The video streams are sent through the `p5LiveMedia` video channel.

Because I don’t want the p5 stuff to get in my way and use as much plain JavaScript as I can, I acutally “hacked” `p5LiveMedia` a bit:

```javascript
p5LiveMedia.prototype.callOnStreamCallback = addStream;
```

Because `p5LiveMedia` already does some operation such as adding the video stream into the p5 sketch and setting the size of the video, and I don’t want this to happen since (a) again, I don’t want the p5 stuff to get in my way, and (2) I have written some CSS that styles the video nicely and inline styling would most likely overwrite my CSS, I overwrote the interal method in `p5LiveMedia` before it potentially messes things up.

Because I handled the video elements differently as well, I also overwrote another method so that it does not crash:

```javascript
p5LiveMedia.prototype.removeDomElement = function (ssp) {
  if (ssp.domElement) {
    ssp.domElement.remove();
  }
};
```

Another detail is that I would still take a snapshot of the user’s camera feed after each stroke so that after the user quit, there would still be a snapshot from that user. Otherwise, they will just show up as a blank square for others, which is not a nice experience.

I also take a snapshot after the user become connected or when other users send streams through to further ensure that there are at least one snapshot from each user even if they never drew anything.

However, since I don’t have control of the server, persistant drawing cannot be achieved.

Also, in second though, I might be better off with the raw `SimplePeer` rather than `p5LiveMedia` for this assignment, but since I already did it with `p5LiveMedia` and don’t want to deal with creating a signaling server, I’ll just stick with `p5LiveMedia` for now.
