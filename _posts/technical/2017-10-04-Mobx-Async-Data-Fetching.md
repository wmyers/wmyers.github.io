---
layout: post
title: Mobx Async Data Fetching
categories:
- technical
- nodeJS
---

I recently worked on some code where Mobx had been adopted as a faster-to-implement state management library (as compared to Redux).

---

### tl;dr
Use a `reaction` to declaratively fetch data when something else changes in your state.

---

I've previously used Redux extensively, and I like it. So switching to a different state management library that seemed to be a bit magicky caused me some initial concern, as I like to have a fine-grained knowledge of what is going on in an application (who doesn't?).

Anyway after reading a good chunk of the Mobx docs, trying out some code, and also reading various blog posts comparing Mobx and Redux I became a little more enlightened.

Mobx _is_ magicky but it does cut down on boilerplate and certainly for smaller projects and arguably for large ones it is easier to implement state management - albeit in an OO way rather than the functional approach of Redux, but that's for a separate discussion.

One thing however that I did not find completely clear was how to use Mobx for different types of data-fetching.

Many of the Mobx vs Redux blogs said things like:

> When it comes to Redux there are no out-of-the-box mechanisms for asynchronous action. It requires you to use middlewares with thunks or sagas. MobX, on the other hand, comes with batteries included - asynchronous actions are as simple and intuitive as they should be.

(full article [here](http://www.merixstudio.com/blog/mobx-alternative-redux-react-development/))

I've come across this argument in a few places - Redux does not have baked-in async features for actions and you have to use `redux-thunk` or a promise-based middleware, or something else. To be honest I don't see this as a particularly strong argument against Redux, but again I'm getting off the point.

What's true is that with Mobx you simply fetch data using native asynchronous syntax in your store class `action` method, and then update your `observable` in the same store class. There is no separation between actions and the state that they update, they belong to the same store class.

This _seems_ ok, but decoupling actions from what they do to state is still a desirable thing. However one must accept that Mobx is an object oriented approach so things are different. Also Mobx offers other mechanisms for decoupling code and encouraging a declarative approach (more on this shortly).

### Triggering fetches

Anyway as I was saying, the standard pattern in Mobx examples for data-fetching asynchronously is straightforward JS in an `action`, using a promise chain or whatever. 

But there are different ways that you go about _triggering_ data-fetching, according to the different scenarios in your application. For example you might be fetching data according to an SPA page route, or you might instead be fetching according to user action without any route changes.

At the time I was trying to avoid what seemed to be an anti-pattern of dependencies between Mobx stores, related to data-fetching. For example where an action would be invoked in one store to update state and it would then imperatively fetch data by directly calling another fetcher action in a different store. So I needed a way to have one store update and then sequentially fetch data for another store, but to avoid any dependencies between the stores.

One basic way to do it is to trigger both actions at the component level. Most starter examples show a simple `fetchAll` `action` method being invoked in `componentDidMount` (for the client side using React components). I didn't particularly like this because the `mobx-react` bindings library overrides the React Component Lifecycle for things like [`shouldComponentUpdate`](https://github.com/mobxjs/mobx-react#about-shouldcomponentupdate). This makes me uncomfortable with a pattern that uses React components to trigger data fetching in stores.

### Reactions

I started thinking about the whole way that Mobx is _reactive_ and so data-fetching should be reactive too. I also re-read docs and blogs to glean further insight on patterns for Mobx usage. One passage leaps out in an [older Medium article](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254) written by the lead Mobx developer Michel Westrate, when describing the four core concepts of Mobx - _Observable state_, _Computed values_, _Reactions_, _Actions_:

> A reaction is a bit similar to a computed value, but instead of producing a new value it produces a side effect. Reactions bridge reactive and imperative programming for things like printing to the console, making network requests, incrementally updating the React component tree to patch the DOM, etc.

So it seems like a 'reaction' would be a nice way to have Mobx observe one store change as a trigger to data-fetching in another. I initially thought the `autorun` api would suit my purposes, but then switched to the `reaction` api because (as the [docs](https://mobx.js.org/refguide/reaction.html) state):

> A variation on autorun that gives more fine grained control on which observables will be tracked. It takes two functions, the first one (the data function) is tracked and returns data that is used as input for the second one, the effect function. Unlike autorun the side effect won't be run directly when created, but only after the data expression returns a new value for the first time

The two function argument approach also reminded me of functional `reselect` selectors in Redux, with the memoised values returned from the first function only triggering the second function when the value changes.

Following on from this, I discovered [a thread](https://github.com/mobxjs/mobx/issues/307) in the Mobx repo issues, which discusses different ways of triggering data fetches according to different app scenarios. The OP proposes putting a trigger to fetch data in a `computed` getter. This contravenes the 'rules' stated in the [Mobx Egghead videos](https://egghead.io/lessons/javascript-derive-computed-values-and-manage-side-effects-with-mobx-reactions) where the `computed` function should _always be pure_ (another functional concept). Confusingly Michel Westrate acknowledges the potential of data-fetching side-effects in `computed` functions in this thread, despite explicitly vetoing it in the Egghead documentation.

What follows on in the thread are two other examples of reactive data-fetching within stores. The first suggestion uses `autorun` the second uses `reaction` (according to criteria). Both seem to chime with the way I was thinking, particularly [this code](https://github.com/mobxjs/mobx/issues/307#issuecomment-225968987):

```
@computed get isEmpty () {
  return !this.books.length
}

fetchBooksIfEmpty () {
  reaction(
    _ => this.isEmpty,
    empty => empty && this.fetchBooks()
  )
}
```

So a UI component would change the value of the `observeable` `this.books`, which would be reacted to by the `computed` `isEmpty` which would change its value (e.g. if it was emptied) and this would be reacted to by the `fetchBooksIfEmpty` `reaction` (_as long as the reaction had previously been initialized_).

### Afterthoughts

I'm close to wrapping this up, but there are still a couple of question marks. 

Firstly, the above code doesn't specify when the `reaction` is _created_ in the lifecycle of the store. Presumably it could be created in the store `constructor` but it might also be created lazily. It should also be noted that invoking the Mobx `reaction` api returns a function which will 'switch off' a created reaction. So that's another variation on reactions to think about.

Secondly although I can perceive a distinction between `autorun` and `reaction` it does seem that their functionality can overlap a bit. There are also other Mobx api's like [`when`](https://mobx.js.org/refguide/when.html) that seem to do similar things too. 

This makes me wonder if Mobx has gotten a bit bloated in all the different reactive magic tools that it offers. It would be nice to have more clarity on this.

A final point is that I have actually seen, in a couple of other random Mobx examples, a `reaction` being placed in a `constructor` (if it needs to always be running). However I came across a strange Jest bug where more than one `reaction` defined in a `constructor` of a Mobx store module, conflicted with Jest's magic way of creating mocks from modules. 

Something to bear in mind and a reminder to always be a little bit careful with magic frameworks and libraries, as what they give they might also take away.

Does this mean I won't use Mobx? No I actually think it is pretty good and quite a pleasure to work with; and I like the fact that it encourages an alternative declarative approach to state management. But I would appreciate if it was a bit clearer on when to use its different but overlapping api's.






