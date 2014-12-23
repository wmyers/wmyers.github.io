---
layout: post
title: Trying to be Angular with a modal dialog
category: AngularJS
---

Angular has been in the news a bit of late. The announcement of Angular 2.0, scheduled for release at the end of 2015, has got many people frothing at the mouth either for or against the proposed changes to the framework.

For the record I'm quite relaxed about it, partly because I've only recently started using Angular, so have less to lose. But I'm also a former (and still occasional) Flash Developer so I know what it's like to see a chosen technology die from a thousand cuts.

I think the newer frameworks like ReactJS with Flux look very interesting, and also the ES6 features like web components. There's always something new to try in JS. But I don't think Angular will perish just yet, it's more good than bad and the good is worth having. I also think the migration from 1.x to 2.0 will be more manageable than the naysayers are claiming.

With that in mind here is one of my first attempts at an Angular directive - a humble modal dialog. I'm trying to be *more Angular* here. Which means I'm trying to be more declarative in a way that works with the Angular framework.

N.B. The recent flame wars have also prompted some good posts on Angular optimisation. Here are two ones I've been reading and re-reading:
 * https://www.airpair.com/angularjs/posts/angularjs-performance-large-applications
 * http://nathanleclaire.com/blog/2014/04/19/5-angularjs-antipatterns-and-pitfalls/

 **Modal directive**
