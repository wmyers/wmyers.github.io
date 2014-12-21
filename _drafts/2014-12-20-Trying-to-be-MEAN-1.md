---
layout: post
title: Trying to be MEAN 1
category: MEAN
---

I've been going through the `angular-fullstack` generated files to see how the app starts up and how environment variables are set. `angular-fullstack` builds a MEAN stack with ExpressJS for the server and GruntJS as a task runner.

I want to understand more about configuring the app for different environments, and how this is setup by default when running this generator.

Starting from the beginning this how I see things working:

* The default start script for the node application is defined in the `"scripts"` tag in package.json. This calls `node server/app.js` and you can pass in the `--harmony` flag here if needed.

* The first line of `server/app.js` defaults `process.env.NODE_ENV` to `development` if it is not already set to some other value.

```javascript
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
```

* Continuing in `server/app.js` the config is retrieved, and the express app is configured as follows:

```javascript
var config = require('./config/environment');
...
var app = express();
...
require('./config/express')(app);
...
// Start server
server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});
```

Now then, narrowing in on the configuration, this is not immediately straightforward but the following things are happening:

* 
