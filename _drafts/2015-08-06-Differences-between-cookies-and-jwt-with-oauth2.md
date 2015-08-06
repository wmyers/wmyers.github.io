---
layout: post
title: Differences between Cookies and JWT tokens when authenticating with OAuth2
categories:
- technical
- authentication
---

**Cookies**

 - User goes to myApp.com for first time with any existing sessionId stored in the browser cookie jar. The browser always looks in the jar for any sessionId related to the domain you are requesting
 - If no sessionId or sessionId expired then re-direct to Login and do OAuth2 (see below)
 - If logging in, the server sets and stores the sessionId (should be stored in DB) and returns the sessionId with page (or data) and then the client stores the sessionId (indexed by the domain) in the browser cookie jar.
 - Any subsequent request uses this sessionId which will do a string comparison on the server to check if valid
 - The security of the cookie is defined by how quickly it expires:
  * can expire the cookie after x number of hours/days etc
  * can auto-renew the cookie after say half an hour, renew for an hour each time
  * can reset/regenerate the sessionId with each and every request


**JWT**

 - User goes to myApp.com for the first time. There is no token in the request header so the user is re-directed to Login.
 - Logs in with OAuth2.
 - The server returns a JWT token which is stored in localStorage
 - Each subsequent request has the token in the request header (Bearer)
 - On the server the token is validated with each request (calculating an HMACSHA256 to validate a token and parsing its contents). But server does not store the token.


 **OAuth2**

 - myApp.com registers with (e.g) Google or Facebook
 - Client requests one-time auth token for the app from Google. Google returns this one-time token directly to the client.
 - Client logs in to the app server with the one-time token.
 - If using cookies, the server stores the GoogleId in the one-time token with the user data in the database. Also can store other unique data. This can be used for sessionId comparison between app client and app server.
 - Otherwise if using JWT the app server returns a  JWT token upon receiving the one-time OAuth token. The proceeds with JWT technique going forward.
