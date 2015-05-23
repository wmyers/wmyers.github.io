---
layout: post
title: Simple JWT authentication for SocketIO
categories:
- technical
- nodeJS
---

This post is a follow-up to my somewhat rambling earlier post [here](/technical/nodejs/Understanding-JWT-authentication-with-SocketIO). I would still say it's worth reading the earlier post to get an idea of some of the complexities and uncertainties around sockets and authentication, but I do go on a  bit. For some actual code please read on.

My socket authentication technique developed from the [angular-fullstack generator](https://github.com/DaftMonk/generator-angular-fullstack) implementation. However I removed the server-side dependency for the Auth0.com [socketio-jwt] (https://github.com/auth0/socketio-jwt) module.

This module and other blog posts on the [Auth0.com site](https://auth0.com/) provided me with a lot of useful info and guidance, but I ultimately preferred not to use their socketio module for the following reasons:

 * it abstracts away too much of what is going on so I don't have fine-grained control of the process

 * along with the angular-fullstack generated server code, it seems to favour the technique of passing a JWT token in the query string when the client socket connects to the server for the first time. This is arguably more insecure than passing the token in the body of a socket message

However i am still using Auth0's [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) node module for authenticating the actual JWT token.

It is not possible to send data in the body of the `connection` event for a socket. So to authenticate with a token in the socket body requires two round trips at the beginning. This approach means that the socket client connects with `io.connect()` and then is temporarily disabled from receiving messages on the server side until the client sends a second `authenticate`  message to the server with a JWT token in the body. Once the token is authenticated the socket is re-enabled and can be used in the normal way.

I got the idea of this technique from this post:

[https://facundoolano.wordpress.com/2014/10/11/better-authentication-for-socket-io-no-query-strings/](https://facundoolano.wordpress.com/2014/10/11/better-authentication-for-socket-io-no-query-strings/)

The facundoolano post shows a 'temporary disabling' socket technique for a server with multiple rooms/namespaces. My demo below will just show a technique for a socket server with one default namespace. But I recommend reading the facundoolano post for a more comprehensive way of doing the 'two-round-trips' socket auth technique.

**Server side code**

```javascript
var jwt = require('jsonwebtoken');

module.exports = function (socketio) {

  socketio.on('connection', function(socket){

    //temp delete socket from namespace connected map
    delete socketio.sockets.connected[socket.id];

    var options = {
      secret: process.env.SESSION_SECRET,
      timeout: 5000 // 5 seconds to send the authentication message
    }

    var auth_timeout = setTimeout(function () {
      socket.disconnect('unauthorized');
    }, options.timeout || 5000);

    var authenticate = function (data) {
      clearTimeout(auth_timeout);
      jwt.verify(data.token, options.secret, options, function(err, decoded) {
        if (err){
          socket.disconnect('unauthorized');
        }
        if (!err && decoded){
          //restore temporarily disabled connection
          socketio.sockets.connected[socket.id] = socket;

          socket.decoded_token = decoded;
          socket.connectedAt = new Date();

          // Disconnect listener
          socket.on('disconnect', function () {
            console.info('SOCKET [%s] DISCONNECTED', socket.id);
          });

          console.info('SOCKET [%s] CONNECTED', socket.id);
          socket.emit('authenticated');
        }
      })
    }

    socket.on('authenticate', authenticate );
  });
};
```

**Client side code in Angular**

NB I am wrapping the client socket connection in an `initialize` method to control when the client connects to the socket server, i.e not until after the user has logged in to the app via a REST API auth process. Then the socket auth can use the same JWT token as the app auth.

```javascript
/* global io */

angular.module('myApp')
.factory('socket', function(socketFactory, Auth) {

  var socket, ioSocket, isAuthenticated,
  self = {
    getAuthenticated:function(){
      return isAuthenticated;
    }
  };
  // by default the socket property is null and is not authenticated
  self.socket = socket;
  // initializer function to connect the socket for the first time after logging in to the app
  self.initialize = function(){
    console.log('initializing socket');

    isAuthenticated = false;

    // socket.io now auto-configures its connection when we omit a connection url
    ioSocket = io('', {
      path: '/socket.io-client'
    });

    //call btford angular-socket-io library factory to connect to server at this point
    self.socket = socket = socketFactory({
      ioSocket: ioSocket
    });

    //---------------------
    //these listeners will only be applied once when socket.initialize is called
    //they will be triggered each time the socket connects/re-connects (e.g. when logging out and logging in again)
    //----------------------
    socket.on('authenticated', function () {
      console.log('socket is jwt authenticated');
    });
    //---------------------
    socket.on('connect', function () {
      //send the jwt
      socket.emit('authenticate', {token: Auth.getToken()});
    });
  };

  return self;

})
```

Finally here's an Angular `socketAuth` service with a promise-returning method for triggering the first client socket connection and checking if the socket is authenticated. E.g. for use when resolving a state change to a state that will display socket messages.

```javascript
angular.module('myApp')
.factory('socketAuth', function(socket, $q) {
    return {
      getAuthenticatedAsPromise:function(){

        var listenForAuthentication = function(){
          console.log('listening for socket authentication');
          var listenDeferred = $q.defer();
          var authCallback = function(){
            console.log('listening for socket authentication - done');
            listenDeferred.resolve(true);
          };
          socket.socket.on('authenticated', authCallback);
          return listenDeferred.promise;
        };

        if(!socket.socket){
          socket.initialize();
          return listenForAuthentication();
        }else{
          if(socket.getAuthenticated()){
            return $q.when(true);
          }else{
            return listenForAuthentication();
          }
        }
      }
    };
  })
```
