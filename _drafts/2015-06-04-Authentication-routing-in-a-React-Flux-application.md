---
layout: post
title: Authentication routing in a React-Flux application
categories:
- technical
- react-flux
---

**tl;dr**

Using [react-router](https://github.com/rackt/react-router) it is not immediately clear how to integrate routing into a React-Flux app. My proposed solution is to keep routing code defined *only* in React components, and keep it out of Flux actions, dispatchers and stores. Also define an `AppStore` that stores the lifecycle of your root-level React controller-component. The react-router can query the `AppStore` when transitioning, particularly when authentication is required to view a certain page.

You can check out the source code here:

**Preamble**

Coming from AngularJS, you can get used to a lot of app infrastructure being provided for you. That's not to say Angular isn't still a complicated and powerful beast. But React-Flux involves throwing out the MVC rulebook at the start, and implementing your own core functionality for things like http requests.

Importantly React is just the view layer, albeit one that does a lot of clever stuff. For the rest of your app the Flux architecture is recommended to work well with React. Using bundlers like Browserify and Webpack, you can implement NodeJS and NPM modules on the client side to create your Flux application structure. I'm using [Facebook's Flux implementation](https://facebook.github.io/flux/docs/overview.html#content) which does provide a singleton Dispatcher module.

This post assumes an understanding of React, Flux, Browserify etc. For a good introduction to React and Flux see the [Scotch.io tutorials](https://scotch.io/tutorials/learning-react-getting-started-and-concepts).

**ES6 syntax**

Because React-Flux is quite new, its rise in popularity is coinciding with the take up of Javascript ES6 syntax (and in some cases ES7, which is stage 2 ES6). Using Babel (previously 6to5) you can code in ES6 and transpile to ES5. For Browserify bundles, there is the Babelify transform module. Much of the code in this post is ES6 syntax.

**React-Router**

Comparing with Angular again, like many others I've used the well-known (and well-tested) [ui-router](https://github.com/angular-ui/ui-router). It can be defined and used in different ways in nested Angular modules, and works with the Angular application framework as a whole.

[react-router](https://github.com/rackt/react-router) is a bit different, in that it is built to work with React component views, but not really for any encompassing architecture like Flux. So react-router and Flux are a bit of an odd couple. Nevertheless it is quite possible to get them working together.

There are a few proposed techniques already out there, but not many for authentication, which can be more fiddly. The following approach draws on the experience and copies techniques from others, particularly:

* gaeron's [Flux React Router Example](https://github.com/gaearon/flux-react-router-example)
* Auth0's [Adding Authentication to your React Flux App](https://auth0.com/blog/2015/04/09/adding-authentication-to-your-react-flux-app/)
* Ben Anderson's [Yeoman Generator for Flux React](https://github.com/banderson/generator-flux-react)
* Ken Wheeler's [React Flux Cart Demo](https://github.com/scotch-io/react-flux-cart) and other demos

**Src directory structure**

```
js/
---- actions/
-------- AppActionCreators.js
-------- LoginActionCreators.js
---- components/
-------- App.jsx
-------- AuthenticatedComponent.jsx
-------- Home.jsx
-------- Login.jsx
-------- Signup.jsx
---- constants/
-------- AppConstants.js
-------- ActionTypes.js
---- dispatchers/
-------- AppDispatcher.js
---- services/
-------- AuthService.js
---- stores/
-------- AppStore.js
-------- BaseStore.js
-------- LoginStore.js
---- index.jsx
---- router.js
---- routes.jsx
styles/
---- main.css
index.html
```

Points to note:

* the router definition, routes definition and router instantiation are in seperate files, as per gaeron's example.
* the router is defined (in `router.js`) using the 'proxy' approach described [here](https://github.com/rackt/react-router/blob/master/docs/guides/flux.md)

**Routes.jsx**

This has a `DefaultRoute` defined. So if going to the root path '\', the router will redirect to this page.

```
<Route path="/" handler={App}>
  <DefaultRoute handler={Home}/>
  <Route name="login" path="/login" handler={Login}/>
  <Route name="signup" path="/signup" handler={Signup}/>
</Route>
```

**components/App.jsx**

This is the root-level React controller-component, consequently its `componentDidMount` hook will fire last (after its child components). For a discussion on this hook and how its firing order differs to `componentWillMount` see [here](https://github.com/facebook/react/issues/2763).

Inside `componentDidMount` I have the following code which dispatches an action to update the `AppStore` that the root component is fully mounted:

```javascript
componentDidMount() {
  ...

  //notify the AppStore that the application has fully mounted
  AppActionCreators.notifyAppMounted();
}
```

In this component I have the only listener function for any `LoginStore` updates.

```javascript
_onLoginChange() {
  //get a local up-to-date record of the logged-in state
  //see https://facebook.github.io/react/docs/component-api.html
  let userLoggedInState = this._getLoginState();
  this.setState(userLoggedInState);

  //get any nextTransitionPath - NB it can only be got once then it self-nullifies
  let transitionPath = AppStore.nextTransitionPath || '/';

  if(userLoggedInState.userLoggedIn){
    router.transitionTo(transitionPath);
  }else{
    router.transitionTo('login');
  }
}
```

This component renders a top nav bar with a mutable logged-in/out state. It does not require authentication but it will auto-redirect to its `DefaultRoute` which *does* require authentication (read on for more info).
