---
layout: post
title: Setting environment variables in Node JS with the angular-fullstack generator
categories:
- technical
- nodeJS
---

Looking at [angular-fullstack](https://github.com/DaftMonk/generator-angular-fullstack) generated files I am following how the app starts up and how environment variables are set. Angular-fullstack builds a MEAN stack with ExpressJS for the server and GruntJS as a task runner.

Environment variables for a node app are stored in `process.env`. This is a property of the global node `process` EventEmitter, documented [here](http://nodejs.org/api/process.html#process_process_env).

Going through the files I can see environment configuration code occurring in roughly two parts of the app. Firstly in `/server/app.js` and in various files and sub-folders in the `.server/config` folder. Secondly in the `./Gruntfile.js` task configurations.

**tl;dr**

To summarize: static files in the server config folder define variables for different environments; Grunt tasks provide a mechanism for choosing a specific environment when launching the app. Grunt also provides a way to configure local environment variables, e.g. credentials and secrets for a db running on a server or developer's local machine.

So how does it all tie together? First off I'll go through what I have found in these two parts of the app.

*EDIT (25/05/2015). This post is useful for environment variables in development, however angular-fullstack becomes rather complicated when setting enviroment variables for production, especially if you don't want to run Grunt on your remote server but just deploy your `dist` folder. For a solution to angular-fullstack production deployment and environment variables, please read the relevant sections of [this post](/technical/nodejs/angularjs/mongodb/Deploying-an-angular-fullstack-app-with-mongoDB-to-AWS-EC2-free-tier/)*

**Server Config Folder and Files**

When a node app launches, the default start script for the application is defined in the `scripts` tag in package.json. This calls `node server/app.js`.

The first line of `server/app.js` defaults `process.env.NODE_ENV` to `development` if it is not already set to some other value. So `process.env.NODE_ENV` will store the enviroment variable value that tells the app which environment it is in - usually `development`, `production` or `test`.

```javascript
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
```

Continuing in `server/app.js` the config is retrieved, and the express app is configured as follows:

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

Narrowing in on the configuration, the following things are happening:

Firstly `./config/environment` points to the environment node module at `./server/config/environment/index.js` which defines an `all` config object of default properties that will be included in all environments. These default properties are used by among other things the `./server/config/express.js` file which configures express. The `all` object looks like:

```javascript
// All configurations will extend these options
var all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,

  // Should we populate the DB with sample data?
  seedDB: false,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'simple-secret'
  },

  // List of user roles
  userRoles: ['guest', 'user', 'admin'],

  ...

}
```

In the `./server/config/environment/index.js` module , once the `all` object is defined it then mixes in any environment specific values before exporting. These environment-specific values are defined in seperate js files (located in the same folder) whose name equates to the value of the `process.env.NODE_ENV` string - e.g. `development.js`, `production.js`, `test.js`. The angular-fullstack generator creates `development.js`, `production.js` and `test.js` files for environment variables in `./server/config/environment/`.

```javascript
// Export the config object based on the NODE_ENV
// Individual overwrites global.
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});
```

**Grunt**

As mentioned earlier, in addition to the files for defining environment variables in `./server/config/environment/` there also needs to be a way to define *local* environment variables (for example to connect to a locally running database on a server or a developer's machine).

This can be done by copying the `./server/config/local.env.sample.js` file, adding your local environment values, and renaming it to `./server/config/local.env`.

This local env file is the place to put secrets (credentials etc) and should not be version controlled. So it should be added to your .gitignore file and manually added to servers or local dev machines.

```javascript
// Use local.env.js for environment variables that grunt will set when the server starts locally.
// Use for your api keys, secrets, etc. This file should not be tracked by git.
//
// You will need to set these on the server you deploy to.

module.exports = {
  DOMAIN:           'http://localhost:9000',
  SESSION_SECRET:   'demo-secret',
  ...
```

In Gruntfile.js, the module automatically looks for any local config at the top of the script, if it doesn't find any localConfig it assigns an empty object to it.

```javascript
//set any local environment config
var localConfig;
try {
  localConfig = require('./server/config/local.env');
} catch(e) {
  localConfig = {};
}
```

In the Grunt `initConfig` function, the angular-fullstack generator includes a [grunt-env](https://www.npmjs.com/package/grunt-env) config. Grunt-env is a "Grunt task to automate environment configuration for future tasks". It is basically a task used in other Grunt tasks to define environment variables - i.e add variables to `process.env` at specific points in a larger Grunt task.

The grunt-env config generated by angular-fullstack is a fairly simple usage of grunt-env (there are more complex usage options in the documentation):

```javascript
//grunt-env plugin
//NB by default process.env.NODE_ENV is set to 'development' in app.js
env: {
  test: {
    NODE_ENV: 'test'
  },
  prod: {
    NODE_ENV: 'production'
  },
  all: localConfig
},
```

There are three configured options for grunt-env here, `test` (which defines an object with a `NODE_ENV` property with a value of 'test'),  `prod` (which defines an object with a `NODE_ENV` property with a value of 'production'), and `all` (which points to the localConfig object with any local environment variables).

But where is the config for `development` I hear you ask. Well if you look back to the first line in `./server/app.js` mentioned above, you will remember that `NODE_ENV` is set to `development` by default unless it has been set to another value by Grunt prior to the app starting:

```javascript
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
```

So looking now at a main grunt task like `grunt serve` we can see how grunt-env is being used as a sub-task for different environments:

```javascript
grunt.registerTask('serve', function (target) {
  //for a production environment
  if (target === 'dist') {
    return grunt.task.run([
      'build',
      'env:all', //assign any local environment variables
      'env:prod', // assign production environment variables
      ...
    ]);
  }

  //for a test environment
  if (target === 'debug') {
    return grunt.task.run([
      'clean:server',
      'env:all', //assign any local environment variables
      ...
      ]);
    }

    //default grunt serve task (for development environment)
    grunt.task.run([
      'clean:server',
      'env:all', //assign any local environment variables
      ...
      ]);
  });

...

grunt.registerTask('test', function(target) {
  if (target === 'server') {
    return grunt.task.run([
      'env:all', //assign any local environment variables
      'env:test', // assign test environment variables
      ...
      ]);
  }
```

**Conclusion**

So in conclusion we can see Grunt (using the grunt-env task) setting different environment variables, specifically `process.env.NODE_ENV`, and also setting any local config environment variables. Then the node/express app uses `process.env.NODE_ENV ` to load in other statically defined environment variables from files in the `.server/config` folder, and mix them into the `./config/environment` module.

This is a flexible if slightly complicated way of doing things - but it works.

For an alternative way of defining environment variables (without a localConfig option)
which uses the [grunt-replace](https://github.com/outaTiME/grunt-replace) plugin, see [this blog post](http://newtriks.com/2013/11/29/environment-specific-configuration-in-angularjs-using-grunt/).
