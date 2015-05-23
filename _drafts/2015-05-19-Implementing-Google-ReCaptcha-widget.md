---
layout: post
title: Implementing the Google ReCaptcha widget
categories:
- technical
- nodeJS
---

I had to implement the Google reCaptcha widget recently, it is great for beating bots in forms, comments etc. Almost all of the information needed to get the latest version working is here:
[https://developers.google.com/recaptcha/](https://developers.google.com/recaptcha/)

This post covers the steps I took _after_ reading the documentation. Once I got it working it's pretty impressive and adjusts the displayed challenge for different devices; e.g. on an iPad the challenge is just text input, whereas on a laptop the challenge involves choosing different images.

In this implementation I only had one form and one reCaptcha widget, so I [automatically rendered the widget](https://developers.google.com/recaptcha/docs/display#auto_render). If you want to display multiple widgets with different styles and properties in your app then you will need to [render your widget explicitly](https://developers.google.com/recaptcha/docs/display#explicit_render).

**Getting the widget to render on localhost**

Using the auto rendering approach I added the following to my HTML `<head>`:

```html
<script src='https://www.google.com/recaptcha/api.js'></script>
```

and I added the following snippet to my form just before the submit button:

```html
<div class="g-recaptcha" data-sitekey="SomeGeneratedDataSiteKeyForAPublicDomain"></div>
```

With most web apps it's always nice to see them working on localhost before sending them off to boarding school in the cloud. This was no exception, but turned out to be a bit fiddly.

In the [getting started](https://developers.google.com/recaptcha/docs/start) section Google states the widget will work in localhost regardless of the domain-linked `data-sitekey` parameter. I did not find this to be the case, I got the following message instead: "ERROR: Invalid domain for site key".

<img src='{{ site.baseurl }}/images/posts/recaptcha-error.png' alt='Google reCaptcha Error' width='308'></img>

I tried adding 'localhost' as a secondary domain (on a new line) to the key settings for my public domain key, on the "Manage your reCAPTCHA API keys" page. This still didn't work, I still got "ERROR: Invalid domain for site key".

In slight desperation I registered a new site for a new key on the manage keys page, I called it 'localhost' and defined one domain as 'localhost'. I duplicated the form div html snippet and changed the key to the 'localhost' key value...and it worked!

```html
<div class="g-recaptcha" data-sitekey="SomeGeneratedDataSiteKeyForLocalhostDomain"></div>
```

<img src='{{ site.baseurl }}/images/posts/recaptcha-localhost-key.png' alt='Google reCaptcha localhost key' width='605'></img>

So now I have a slightly hacky way of get reCaptcha to work in localhost, whereby I have to remember to comment/uncomment a line when switching from development to production (I could just code this according to `process.env.NODE_ENV`).

The final caveat is that when in development mode (with the localhost reCaptcha) and nodemon restarts the app (if you are using it), it is sometimes necessary to close the browser tab and reopen another one, otherwise the reCaptcha widget disappears and won't be enticed to reappear with just a page refresh. This happened in Google Chrome 41.0.2272.104 (64-bit).

**Getting the recaptcha user's response**

**Verifying the user's response on your server**
