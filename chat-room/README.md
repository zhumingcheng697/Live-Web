# Chat Room

**Live Web Week 2 Session 2 Assignment**

[Source code](https://glitch.com/edit/#!/mccoy-zhu-chat-room) and [deployment](https://mccoy-zhu-chat-room.glitch.me/) available on Glitch.

In this chat room, users can choose their usernames and chat with others.

Messages are nicely styled and marked with the time sent/received and the sender’s username.

Messages sent are aligned right and have blue bubbles; messages received are aligned left and have gray bubbles.

If a user sends multiple messages at once and they are not disrupted by anyone else, their messages will be grouped together and only the first message will be marked with the username and time sent.

Everyone also gets notification when a new user joins the room or leaves the room.

Most interestingly, users can unsend every message they have sent and the unsent messages will be invisible to everyone.

Everyone will also be notified if a message they previously received has been unsent.

Unsending works nicely with the grouping of the messages, so don’t worry if someone unsent a message and then the sender-message relationship or the interface all got messed up.

The chat window intelligently scrolls down when you send a new message or when you are already at the bottom of the screen and you receive a new message. If you are reading previous messages, it will let you do that instead of forcing you to scroll to the bottom of the chat.

I tried to escape HTML code so that people won’t be able to do anything weird like changing the style of the page or insert malicious code.

The server code is mostly the same. I added a few more event listeners where the server simply broadcast the message to everyone else. The only interesting thing I did was I added a map to match the user’s WebSocket ID with their username to make the “XYZ left the room” notification work.
