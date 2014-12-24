---
layout: post
title: Trying to be more Angular with a modal dialog
category: AngularJS
---

Angular has been in the news a bit of late. The announcement of Angular 2.0, scheduled for release at the end of 2015, has got many people frothing at the mouth either for or against the proposed changes to the framework.

For the record I'm quite relaxed about it, partly because I've only recently started using Angular, so have less to lose. I'm also a former (and still occasional) Flash Developer so I know what it's like to see a chosen technology die from a thousand cuts. I don't think this will happen to Angular, irrespective of the more performance-based newer frameworks like React/Flux, and also native ES6 web components.

The recent flame wars have also prompted some good posts on Angular optimisation, and made me google some older ones. Here are two posts I've been reading and re-reading:

* https://www.airpair.com/angularjs/posts/angularjs-performance-large-applications
* http://nathanleclaire.com/blog/2014/04/19/5-angularjs-antipatterns-and-pitfalls/

With all that in mind, here is one of my early attempts at an Angular directive - a humble modal dialog. I'm trying to be *more Angular* here. Which means I'm trying to be more declarative in a way that works with the Angular framework.

This article assumes some knowledge of Angular scopes. I would also recommend reading the blog posts linked above.

**Modal directive**

The things I wanted from this modal were as follows:

 - One concrete instance to serve all modal dialog requirements from anywhere in the app
 - The ability to configure any number of modal messages from one place
 - Be able to send a target id with an OK click event (e.g. to confirm you want to delete a specific item)
 - To have an optional cancel button
 - To be able to style the modal however I wanted

Firstly here is a fiddle of the modal directive demo:

<iframe width="100%" height="300" src="http://jsfiddle.net/wmyers/Lsx4akfe/1/embedded/result,js,html,css" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

And to better understand the code clone this repo:
[https://github.com/wmyers/angular-modal-demo](https://github.com/wmyers/angular-modal-demo)

**Using a service as a bus to update bindings**

How am I being *more Angular*? Well I'll concentrate on one thing in this post - using a service as a pub/sub bus. This is a more declarative approach. Rather than using `$emit` from a given nested scope to tell the modal in the `$rootScope` to show itself, I am simply binding the `ModalService` directly to both the scope of the ui requesting a modal and the scope of the modal directive itself. See a simple example of this [here](http://mariuszprzydatek.com/2013/12/28/sharing-data-between-controllers-in-angularjs-pubsub-event-bus-example/).

Services are singletons so both bindings point to the same object. Also I am binding the whole `ModalService` *object* rather than a primitive type property of the service, so the binding works correctly. See "1. Not having a dot in your ng-model" [here](http://nathanleclaire.com/blog/2014/04/19/5-angularjs-antipatterns-and-pitfalls/).

In this snippet `ModalService` is injected into the `modal` directive:

```javascript
angular.module('modalComp')
.directive('modal', function($rootScope) {
  return {
    restrict: 'EA',
    scope: {},
    transclude: true,
    controller: function($scope, ModalService){ //injecting ModalService into the controller
      //putting the data/service in the $scope directly, Angular will handle changes for you.
      $scope.service = ModalService;
      //service api for modalContent child directives
      this.getService = function(){
        return $scope.service;
      };
    },
    link: function(scope, element, attrs) {
      scope.okButtonClick = function(){
        //broadcast ok event from root with clone of service.config
        $rootScope.$broadcast(
          'modalOKClickEvent',
          _.clone(scope.service.config));

          //reset values in the service
          scope.service.reset();
        };

      }
    ...
```

And here `ModalService` is injected into the main `modalDemo` app module (which contains the UI to trigger the modal dialog - normally this would be in a more nested scope):

```javascript
angular.module('modalDemo', ['modalComp'])
.controller('modalDemoCtrl',
[
'$scope',
'ModalService',
function (
  $scope,
  ModalService // ModalService injected
) {

  //config attached to modal OK button click events
  $scope.modalOKConfig = null;

  $scope.launchModal = function(contentId, targetId, cancellable){
    $scope.modalOKConfig = null;
    targetId = targetId || 0;
    cancellable = cancellable || false;
    var config = { contentId:contentId, targetId:targetId, cancellable:cancellable };
    ModalService.show(config); //calling show function in ModalService with a config that gets passed back by the OK click event
  };
  ...
```

N.B. I'm still using a `$broadcast` from the `$rootScope` to propagate the modal OK click event, but I'm not sending an `$emit` up the scope hierarchy when I want to *trigger* the modal.
