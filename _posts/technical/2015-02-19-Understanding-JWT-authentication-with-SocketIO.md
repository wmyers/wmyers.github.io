---
layout: post
title: Understanding JWT authentication with SocketIO
categories:
- technical
- nodeJS
---

I've been building a chat application in AngularJS with SocketIO, which is a well trodden path. However the going can get a little rough when it comes to authentication of the socket.

I happened across the following blog posts by a guy who seems to know about JSON Web Token authentication. These are recommended reading, particularly the first post before the second:

[https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/](https://auth0.com/blog/2014/01/07/angularjs-authentication-with-cookies-vs-token/)

[https://auth0.com/blog/2014/01/15/auth-with-socket-io/](https://auth0.com/blog/2014/01/15/auth-with-socket-io/)

The first post is good for detailing the advantages of token-based auth vs cookie-based auth. For example the way the token is stateless security, like a plastic hotel key-card that can be thrown away at the end of your stay. It helped that I already had a working basic implementation of JWT, but this expanded my knowledge.

The second post covers SocketIO authentication and was also informative, as the author states
> It is a common misconception that a user who is authenticated in the hosting web application, is also authenticated in the socket stream.

However it doesn't go into a lot of detail and ultimately just shows an implementaion of the "handshake" using the author's `socketio-jwt` node module, which abstracts away all the JWT stuff. Reading the comments at the bottom I could see other people were left with the same questions as me.

So next stop was the [github repo](https://github.com/auth0/socketio-jwt), which has some more information in the README but still left me with a few questions. So I went through the code, referring back to the README and blog post (and the blogger's answers to reader questions), and I also read the [SocketIO Authorization and Handshaking](https://github.com/Automattic/socket.io/wiki/Authorizing) page. This page should be read after the two blog posts mentioned above.

I think the best way to explain it, for myself and anyone else, is to summarise what I understand so far about Socket.io and JWT auth, especially with regard to the auth0.com documentation. There are still a couple of unanswered questions and I'll update this blog after a few tests.

* Socket IO authorization occurs when the socket client first makes a connection with the socket server. This is the "handshake" which generates a `handshakeData` object. The handshake is initiated with either an XHR request or a JSONP request (for cross domain requests). When the server receives a connection it will start gathering data from the request that might be needed later. See the [SocketIO Authorization and Handshaking](https://github.com/Automattic/socket.io/wiki/Authorizing) page for more info.

* Handshakes can either be done per socket namespace or globally. Both techniques can be used together or independently. The auth0.com blog post (above) uses the global handshake technique, and directs the user to add a client listener for an `error` event when a global handshake auth fails. Errors are different for namespaced handshakes, a `connect_failed` event is emitted instead if the authentication fails.

 - At the time of writing, the SocketIO page states that the global handshake is enabled by setting `authorization` configuration method:

```javascript
io.configure(function (){
   io.set('authorization', function (handshakeData, callback) {
     callback(null, true); // error first callback style
   });
});
```

* However, as of SocketIO 1.0 the use of `io.set` is deprecated in favour of `io.use` which defines middleware functionality in a similar way to ExpressJS. This is detailed [here](http://socket.io/docs/migrating-from-0-9/#authentication-differences). The README for the `auth0/socketio-jwt` module repo also makes reference to this (at the time of writing).

```javascript
//// With socket.io < 1.0 ////
io.set('authorization', socketioJwt.authorize({
  secret: 'your secret or public key',
  handshake: true
}));
//////////////////////////////

//// With socket.io >= 1.0 ////
io.use(socketioJwt.authorize({
  secret: 'your secret or public key',
  handshake: true
}));
///////////////////////////////
```
* Moving on, at the time of writing, the auth0.com blog states that the JWT token can only be passed from the client to the server for authentication (when the socket connects for the first time), by either appending it to the querystring for the socket connection URL, or by doing two round trips between the client and the server; to establish the socket connection and then send the JWT from the client for authorization. However if the "handshake" is initiated with a http request, as indicated on the [SocketIO Authorization and Handshaking](https://github.com/Automattic/socket.io/wiki/Authorizing) page, then it should theoretically be possible to pass the JWT in the request header in the usual way. This needs to be clarified. Confusingly the `auth0/socketio-jwt` module provides jwt-in-request-header functionality, but this could exist only for a 'fallback to xhr for messaging transports scenario'.

* Which brings me on to the next observation. A comment on the 0auth.com blog asks if a socket is authenticated only once or for every message. The answer is that for web sockets transport it is only once when the socket connects. But if web sockets are not avaialble and SocketIO falls back to xhr, then each emitted message will be authenticated on the server.

* And finally, another user points out that if web sockets are being used and the JWT authenticated successfully, then the expiry date of the JWT becomes irrelevant; the socket connection will remain authenticated for as long as it is available. The suggested answer for this is to have a timeout running to close the socket connection around the time the token should expire. It will then re-connect and re-authenticate.
