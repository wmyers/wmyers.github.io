---
layout: post
title: Setting up OAuth2 authentication and getting tokens with the Shopify API
categories:
- technical
- nodeJS
---

Like many other third-party app APIs, Shopify provides a way to authenticate a user account with your app, and then use the returned token to make API requests for the user's data.

I implemented an OAuth strategy for the Shopify API a while ago. I re-visited this code recently because I was defining a strategy for a different API using Passport JS. Passport abstracts the OAuth process away, so it is easy to use but hard to figure out what is actually going on. Looking back at my Shopify API code, the OAuth2 strategy process was more transparent.

I used the npm `shopify-node-api` module and built my own `shopify-api` wrapper module, for promisifying and other stuff. This post just covers the initial two-part OAuth2 process for getting an `access_token` from Shopify.

So here's what happens:

I have already authenticated my app user separately (e.g. just using local auth). My client now makes a RESTful request to my own server api to authenticate a connection to a user's Shopify shop. This RESTful request looks something like this:

```
https://myApp.com/api/platform/auth/user12345/shopify/MyUsersShop
```

The above request routes to an Express `auth` middleware. (passing in three request params - a userId, 'shopify' to denote I want to use the Shopify platform, and the name of the user's Shopify shop 'My UsersShop'), the server needs to use these params to contact Shopify.

As an aside - I need to ultimately re-direct this request to Shopify (the third party), and I ran into issues with re-directing an XHR from the client. I solved this in a hacky way by setting the `window.location` to the above URL (which is a window refresh rather than an XHR).

At this point I use the `shopify-node-api` module to generate an authentication request URL to Shopify. This involves generating a `config` object which contains my app's registered Shopify app ID and secret, the user's shop name, the scope of permissions I require for the user's shop on Shopify, and importantly, a re-direct URL. This re-direct URL is called back by Shopify back to my application and importantly will have a `query` param attached which contains the one-time-use token returned by Shopify as the first part of the auth process.

This re-direct URL (called back by Shopify) looks something like this:

```
https://myApp.com/api/platform/auth_success/user12345/shopify/MyUsersShop
```

So the app Id, app secret, user's shop name, permissions scope, redirect URI (which has the user's ID for my app) all get sent as a config to a factory function in the `shopify-node-api` module, which looks like this:

```
ShopifyAPI.prototype.buildAuthURL = function(){
    var auth_url = 'https://' + this.config.shop.split(".")[0];
    auth_url += ".myshopify.com/admin/oauth/authorize?";
    auth_url += "client_id=" + this.config.shopify_api_key;
    auth_url += "&scope=" + this.config.shopify_scope;
    auth_url += "&redirect_uri=" + this.config.redirect_uri;
    return auth_url;
};
```

This returns a nice big authentication URL for calling Shopify which my app re-directs to from my server (having received the initial request from my client, see 'aside note' above).

So now off we go to Shopify in the browser and it either asks for user authentication and acceptance of my app, or if my app is already registered with the user's Shopify shop then it calls back the re-direct URL straightaway.

This re-direct URL routes to an Express middleware function on my server. This middleware now extracts the `query` param from the request made by Shopify and passes it back into another function in the `shopify-node-api` module called `exchange_temporary_token`. This function extracts the `code` property from the `query` string (returned by Shopify as the first part of the OAuth process). It posts this `code` as part of a data payload back to Shopify again to get returned the actual `access_token` which is the second part of the OAuth process.

```
ShopifyAPI.prototype.exchange_temporary_token = function(query_params, callback) {
    var data = {
            client_id: this.config.shopify_api_key,
            client_secret: this.config.shopify_shared_secret,
            code: query_params['code']
        },
        self = this;

    if (!self.is_valid_signature(query_params)) {
        return callback(new Error("Signature is not authentic!"));
    }

    this.makeRequest('/admin/oauth/access_token', 'POST', data, function(err, body){

        if (err) return callback(new Error(err));

        self.set_access_token(body['access_token']);
        callback(null, body);

    });
};
```

I can now store this `access_token` in the database (or key/value store) and use it to make subsequent requests for user data from the Shopify API.
