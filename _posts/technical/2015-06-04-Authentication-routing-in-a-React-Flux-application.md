---
layout: post
title: Authentication routing in a React-Flux application
categories:
- technical
- react-flux
---


Using [react-router](https://github.com/rackt/react-router) it is not immediately clear how to integrate routing into a React-Flux app.

**tl;dr**

My proposed solution is to *only* reference the react-router directly in React components, i.e. not reference the router in Flux actions, dispatchers and stores - so there is only a dependency between the router and the React component layer. I will also define a `RouterStore` that stores the next router `transitionPath` string when a user attempts to go to a page which requires authentication and they are not logged in.

You can check out the source code [here](https://github.com/wmyers/react-flux-authentication-routing).

You will also need to clone a modified version of Auth0's NodeJS JWT API [here](https://github.com/wmyers/nodejs-jwt-authentication-sample).

**Preamble**

Coming from AngularJS, you can get used to a lot of app infrastructure being provided for you. Angular is still a complicated and powerful beast. But React-Flux involves throwing out the MVC rulebook at the start, and implementing your own core functionality for things like http requests.

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
-------- LoginActionCreators.js
-------- RouterActionCreators.js
---- components/
-------- App.jsx
-------- AuthenticatedComponent.jsx
-------- Home.jsx
-------- Login.jsx
-------- Private.jsx
-------- Signup.jsx
---- constants/
-------- AppConstants.js
-------- ActionTypes.js
---- dispatchers/
-------- AppDispatcher.js
---- services/
-------- AuthService.js
---- stores/
-------- BaseStore.js
-------- LoginStore.js
-------- RouterStore.js
---- index.jsx
---- router.js
---- routes.jsx
styles/
---- main.css
index.html
```

Points to note:

* the router definition, routes definition and router instantiation are in separate files, as per gaeron's example.
* the router is defined (in `router.js`) using the 'proxy' approach described [here](https://github.com/rackt/react-router/blob/master/docs/guides/flux.md)

**Routes.jsx**

This has a `DefaultRoute` defined. So if going to the root path '/', the router will redirect to this page.

```
<Route path="/" handler={App}>
  <DefaultRoute handler={Home}/>
  <Route name="login" path="/login" handler={Login}/>
  <Route name="signup" path="/signup" handler={Signup}/>
  <Route name="private" path="/private" handler={Private}/>
</Route>
```

**stores/LoginStore.jsx**

This store deals with all authentication actions. It is updated asynchronously when logging in or signing up via the `AuthService`, which is triggered by a dispatch from `LoginActionCreators`.

`LoginStore` *attempts to auto-login in its constructor*. So when the user refreshes the app in the browser, any locally stored token will be retrieved. NB in this demo I am not checking if a locally stored JWT token has expired, only if it exists.

```javascript
_autoLogin () {
  let jwt = localStorage.getItem("my_jwt");
  if (jwt) {
    this._jwt = jwt;
    this._user = jwt_decode(this._jwt);
  }
}
```

**components/App.jsx**

In this component I have the only listener function for any `LoginStore` updates. I only want there to be one listener function for responding to `LoginStore` updates. In this function a `transitionPath` value is retrieved from the `RouterStore`. This value is set whenever a user attempts to go to a page which requires authentication, but they are not logged in. By default `RouterStore.nextTransitionPath` is set to the root path ('/').

```javascript
_onLoginChange() {
  ...

  //get any nextTransitionPath - NB it can only be got once then it self-nullifies
  let transitionPath = RouterStore.nextTransitionPath || '/';

  if(userLoggedInState.userLoggedIn){
    router.transitionTo(transitionPath);
  }else{
    router.transitionTo('login');
  }
}
```

The `_onLoginChange` listener is set up in the `componentDidMount` hook of the React component lifecycle. This hook only fires when React components are rendered on the client side, and only after child components have mounted.

This component renders a top nav bar with a mutable logged-in/out state. It does not require authentication but it will auto-redirect to its `DefaultRoute` which *does* require authentication (read on for more info).

**components/AuthenticatedComponent.jsx**

This is a higher order component (or Decorator) for making the child component that it wraps, require authentication - ie the user must be logged in before being able to navigate to a page component wrapped in an instance of `AuthenticatedComponent`.

In this application the `Home` component page is wrapped in `AuthenticatedComponent` and `Home` is the `DefaultRoute`.

`AuthenticatedComponent` defines a `willTransitionTo` hook which is a react-router hook. Whenever this hook gets fired the router is about to transition to the relevant page, so authentication checking can occur here.

```javascript
static willTransitionTo(transition) {
  if (!LoginStore.isLoggedIn()) {

    let transitionPath = transition.path;

    //store next path in RouterStore for redirecting after authentication
    //as opposed to storing in the router itself with:
    // transition.redirect('/login', {}, {'nextPath' : transition.path});
    RouterActionCreators.storeRouterTransitionPath(transitionPath);

    //go to login page
    transition.redirect('/login');
  }
}
```

So if a user *is not* logged in, firstly I'm storing the transition path (e.g. '/private') in the `RouterStore`. I'm storing it so that it can only be retrieved once, so that old paths don't persist in the `RouterStore`. Note that although I could store the next `transitionPath` in the router itself (using an optional third parameter in a `transition.redirect()` call), I am choosing not to do so. Instead I am storing it in a Flux store.

Then I am re-directing to the login page.

One other caveat is that a `willTransitionTo` hook will get called for the first time *before* a `componentDidMount` or `componentWillMount` hook. Something to be aware of.

**Conclusion**

So the default (not logged-in) use-case works like this:

[Application launches and `LoginStore` attempts to auto-login, but fails because there is no token] =>

[Application routes to root level path '/'] =>

[`router` redirects to authenticated Home.jsx page] =>

[`willTransitionTo` hook in Home.jsx stores transition path in `LoginStore` and then redirects to Login.jsx page] =>

[User logs in and Login.jsx triggers an action in `LoginActionHandlers`] =>

[`LoginStore` updates and then emits CHANGE]  =>

[`_onLoginChange` in App.jsx tells router to transition to stored path (or '/')]
