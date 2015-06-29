---
layout: post
title: Async authentication with React-Router 1.0.0-beta2 and Flux
categories:
- technical
- react-flux
---

The latest `1.0.0-beta2` release of [react-router](https://github.com/rackt/react-router) has changed a lot from earlier versions, particularly in the way you can hook into a transition. In an [earlier post](/technical/react-flux/Authentication-routing-in-a-React-Flux-application) I looked at a way of implementing react-router auth with a Facebook Flux architecture. This was using react-router `0.13.3`. What follows is a substantially different approach to achieve the same kind of result, utilizing the new `1.0.0-beta` features.

**tl;dr**

React-Router `1.0.0-beta2` now requires transition hooks to be defined on the `Route` in the root level `Router` JSX tree (if you are using JSX). `willTransitionTo` (defined on the component) has been replaced by `onEnter` (defined directly on the `<Route>`). This significantly changes how you can 'interrupt' a transition to do some asynchronous authentication, before continuing to an authenticated page.

**A new hope**

Despite the fact that *a lot* has changed in react-router `1.0.0-beta2` and that it has incomplete documentation and no current changelog it offers some good things as can be evidenced by looking at the recently updated [examples](https://github.com/rackt/react-router/tree/master/examples), and what [documentation](http://rackt.github.io/react-router/tags/v1.0.0-beta2.html) does exist.  For example, it is now possible to use `ReactCssTransitionGroup` to [animate transitions](https://github.com/rackt/react-router/blob/master/examples/animations/app.js#L17) between routes.

**Some new problems**

In the last few days of using the new react-router, I have struggled to intercept and asynchronously resume the first transition. This is partly because the `willTransitionTo` hook (and the parameters that it exposed) is no longer available. This hook previously exposed a `callback` which you could invoke after some promise-returning async functionality. This does not seem to be possible in the new `onEnter` hook which is defined directly on the `<Route>`.

Another thing I noticed is that if you try and `transition.abort()` the first transition, then you get the following warning:

`Uncaught Error: Invariant Violation: You may not abort the initial transition`

**My async use case**

Each time I start/reload my app, I initiate an auto-login sequence whereby I check for a locally stored token. If a token exists, I then send it to the server to check it is still valid, and if so, retrieve some user data. I'm using JWT tokens which can expire and only contain a hashed key. Only after I get a response to the token can I tell if I am logged in or not.

I also want to be able to deep-link into any authenticated page in my app as the first route. So I need to be able to intercept this first transition and wait for an async response from the server.

**A slightly hacky solution**

```javascript
var Shim = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  transitionCheck(){
    var router = this.context.router;

    //if not waiting for some async login outcome then re-direct to login
    if (!auth.isAsyncLoggingIn()){
      router.transitionTo('/login');
    }

    //if you've gone here by accident
    if(auth.isLoggedIn()){
      router.transitionTo(nextPathStore);
    }
  },

  componentWillMount() {
    this.transitionCheck();
  },

  render() {
    //can leave this blank
    return <div>waiting...</div>;
  }
});
```

I'm basically defining a 'shim' route. This is a go-between that gets around the problem of aborting the first transition. An authenticated route will redirect to it if the client is not logged in. Once I get to the shim page, I stay there and allow the component instance lifecycle to proceed and the first transition to effectively end.

I can use the `componentWillMount` hook in the shim, or even the constructor (if I'm using ES6 classes), to access `this.context.router` to start any new transitions. NB I *cannot* access `this.context.router` in the static `onEnter` hook of a page component before it has instantiated.

In most cases I will only be re-directed to this shim page when auto-logging in. In which case I can wait for the login sequence to be resolved either way and then the root `App` component will listen for any login changes and re-direct accordingly.

```javascript
//auth login/logout module listener
  authListener(loggedIn) {
    this.setState({
      loggedIn: loggedIn
    });
    //re-direct post login or logout
    if(loggedIn){
      this.context.router.transitionTo(nextPathStore);
    }else{
      this.context.router.transitionTo('/login');
    }
  }
```

However if I re-direct there when there is no token available for auto-login, then there will be no ongoing login sequence. So the shim must detect if any async logging-in is occurring. If not then it immediately re-directs to the login page.

It is also just possible that through some weird clicks a user could end up in the shim even though they are logged in. In which case I just re-direct to the last stored authenticated route path.

I've put an implementation of this async auth process in a forked version of the react-router examples here:

[https://github.com/wmyers/react-router/blob/master/examples/auth-flow-async/app.js](https://github.com/wmyers/react-router/blob/master/examples/auth-flow-async/app.js)
