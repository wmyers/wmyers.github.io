---
layout: post
title: Deploying an angular-fullstack app with MongoDB to AWS EC2 free tier
categories:
- technical
- nodeJS
- angularJS
- mongoDB
---

This post comes from spending a leisurely day or so reading AWS documentation and then searching, reading and comparing several blog posts (full urls at bottom of page) on how to do the following:

 * Set up an EC2 server instance on AWS within the free tier
 * Install Node, NPM etc on the instance
 * Get a pipeline set up to deploy production ready files to the server
 * Get MongoDB installed and running on the server
 * Have a simple and flexible way of setting environment variables on the server

The title of this post refers to the [angular-fullstack generator](https://github.com/DaftMonk/generator-angular-fullstack) (which uses Grunt as a build tool). However the steps recommended below can apply to any production-ready deployment and environment variables.
As I discovered, Grunt is great in angular-fullstack development environment, but beyond building the production `dist` files it is not really suitable for further production tasks, unless it is installed on the production server - which I wanted to avoid.

**Setting up EC2**

It all began [here](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/get-set-up-for-amazon-ec2.html).

I followed all five steps in this AWS setup documentation:

 * sign up
 * create iam user (get this one under your belt early)
 * create keypair (I did this locally with ssh-keygen rather than sending the private key down from aws)
 * create vpc (I just went with the default vpc but read up on them a bit in other AWS docs)
 * create a security group (I followed the instructions to create a group with least privilege. I used CIDR notation to define ssh access from my isp static ip only. I also added a rule to allow all ICMP, for pinging. I subsequently applied this security group to my EC2 instance when creating and launching.)

Reading through this setup and subsequent links was invaluable. I also learned about IOPS (input/output per second) tokens and how they build up for bursting above the baseline rate, depending on how big your EBS volume is. The free tier only goes up to 30GiB and is a General Purpose volume, hence it cannot accumulate many tokens (and therefore cannot really handle heavy traffic at high speed) - cos it's free.

At this early stage I decided to use an EC2 Amazon Linux image as opposed to an Ubuntu Linux machine image, as I've been told that Amazon Linux comes pre-installed with AWS tools. NB Amazon Linux uses the `yum` install command whereas Ubuntu uses `apt-get`.

I should emphasise that there is masses of good official documentation on AWS. You won't read all of it at first, but starting with the [setup](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/get-set-up-for-amazon-ec2.html) and then proceeding to [getting started](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html) is a good way to go.

In the [getting started](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html) section I followed all the steps including the optional [Add a Volume to Your Instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-add-volume-to-instance.html).

I also read about the [Amazon EC2 Root Device Volume ](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/RootDeviceStorage.html) and paid attention to the section on [Changing the Root Device Volume to Persist](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/RootDeviceStorage.html#Using_RootDeviceStorage).

For a clear and pleasantly concise explanation of the different types of storage volumes on AWS, I read [this](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Storage.html).

**Installing Node**

After that I looked at a couple of posts on installing Node on Amazon Linux and setting up and testing a simple Node app on the EC2 instance. I followed [this link](http://www.lauradhamilton.com/how-to-set-up-a-nodejs-web-server-on-amazon-ec2) for general sanity checks and clearer info on port forwarding settings (from 80 to 8080).

I also went through [this post](https://thefloppydisk.wordpress.com/2013/04/25/a-node-js-application-on-the-amazon-cloud-part-1-installing-node-on-an-ec2-instance/). At the time of writing the most preferred way to install Node _and be able to get the version that you want_ is this approach, cloning the node source code and compiling the version you want with `make`. Below I am specifying Node version 0.12.3, which is the latest at the time of writing.

```
$ sudo yum install gcc-c++ make
$ sudo yum install openssl-devel
$ sudo yum install git
$ git clone git://github.com/joyent/node.git
$ cd node
$ git checkout v0.12.3
$ ./configure
$ make
$ sudo make install
```

A separate install step is specified for npm after installing Node, but as of Node 0.12 (or possibly earlier), npm is installed with node.

**Pushing your app files to the EC2 server**

Next I looked for installation guides specific to the yeoman angular-fullstack generator. I found [this comment](https://github.com/DaftMonk/generator-angular-fullstack/issues/501#issuecomment-57489119) and watched the accompanying video  - it was quite long but very useful. I also read through the rest of the thread for any additional info.

Mescalito (the commenter) seems to have worked himself up into a right old grump about the angular-fullstack Gruntfile and the complexities of setting environment variables. At first I thought he was overreacting but after a while I started to agree with him.

In angular-fullstack, setting environment variables is tightly bound to using Grunt which merges properties in a `local.config.js` file into `process.env` using the grunt-env module. This is fine for development mode when you call `grunt serve` and rebuild each time. But when you want to just deploy the dist files (created with `grunt build`) and have them use env variables from a non-source-controlled file without using Grunt (including the `NODE_ENV`) then angular-fullstack gets a bit too fiddly.

The intention of the generator authors was I think for Grunt and all its dependencies to be installed on the server, and then build to production in situ with `grunt build`. But AWS free tier is space-limited, so deploying the `dist` files is much better.

The Mescalito approach - pushing the `dist` files to a remote git repo on the server which then updates the content of another `www` folder with a post-receive hook - is a much better way. However his instructions are a bit unclear in places, and he's also using Ubuntu rather than Amazon Linux. So I also followed [this post](http://deductiveblog.in/2013/05/19/deploy-to-amazon-ec2-using-git/) which was doing roughly the same thing with a git setup, but explained more clearly. It also has some useful stuff like setting up ssh access to multiple ec2 servers with `.ssh/config` - this in turn makes defining the remote git repo easier.

Once you have followed theses steps for setting a local git repo in your `dist` folder (and cd'd into it), with a remote pointing to your repo folder on ec2 (which then deploys to the `www` folder on ec2 with the hook), then you can simply push your dist updates from your local machine directly to ec2 with the following command (assuming you have named your remote `production`):

```
$ git push production master
```

**Mongo DB**

For MongoDB setup I mostly followed this [ Colombian University post](https://github.com/SIB-Colombia/dataportal-explorer/wiki/How-to-install-node-and-mongodb-on-Amazon-EC2) which also once again clarified the general ec2 setup and then the node installation process on Amazon Linux.

With the Mongo stuff, the post also concurred with others I had read, and it was essentially a condensed version of fuller instructions in the [official MongoDB docs](http://docs.mongodb.org/ecosystem/platforms/amazon-ec2/). NB because I had read up on EBS volumes in the [AWS setup link](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/get-set-up-for-amazon-ec2.html) I was able to understand the MongoDB documentation better.

The Mongo docs recommend separate pre-allocated EBS volumes for the best MongoDB install. If you are using the free tier then this is not really an option, the IOPS range isn't high enough. The Colombian post just installs the Mongo directories in `/var/lib/mongo/`. But it useful to understand the difference between the 'free tier' approach and a better setup for Mongo when you are eventually scaling up.

So finally I had the dist files pushed to the server repo and then deployed from there to a `www` folder, and I had MongoDB up and running on the server. What next? Those environment variables again...

**Production Environment Variables**

Mescalito's post has a shell script for setting `NODE_ENV` to production (but no other environment variables). This script executes whenever an update is pushed to the server git repo. This is a useful technique for stopping and re-starting the node process manager (forever or pm2) when updating. But it's not a completely reliable way of setting the production environment - after all it is only set on a git update, but what if the server restarted at another time? The the environment would presumably default to development.

So instead I did the following to:

* set the `NODE_ENV` to production
* set other production environment variables

Firstly I set the `NODE_ENV` directly in the shell with

```
$ export NODE_ENV=production
```

and then `$ printenv` to check.

Then to resolve the angular-fullstack production environment complexities I used the [dotenv package](https://www.npmjs.com/package/dotenv), which is nice and simple.

I kept all sensitive production environment variables stored in a `production.env` file here `server/config/environment/production.env` (rather than a `.env` file in the root, which is the default dotenv way).

I kept non-sensitive production variables in the angular-fullstack environment config module, merged from `server/config/environment/production.js` (these config files can stay source-controlled in git, but don't scm the `.env` file).

This approach works similarly in the angular-fullstack development environment using Grunt (with grunt-env). The sensitive non-versioned variables are stored in `server/config/local.env.js`

I added the following code to `app.js` to only use `dotenv` in production:

```
var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');

//use dotenv to set other production environment variables
//directly into process.env
if(config.env === 'production'){
  require('dotenv').config({path: 'server/config/environment/production.env'});
}
```

I also added the following to a `.gitignore` file in my dist folder git repo, to make sure none of sensitive data got source-controlled:

```
/server/config/local.env.js
/server/config/local.env.sample.js
/server/config/environment/production.env
```

NB the `.git` folder and `.gitignore` file *do not* get wiped from the `dist` folder each time you run `grunt build` or `grunt serve:dist` - just in case you were wondering.

To get the `production.env` file onto the server I manually created and copied in the data:
```
$ cat > server/config/environment/production.env
...
```

And that was about it. I ran my app simply with `node server/app.js` or `forever start server/app.js`, and it launched in production mode, picked up the sensitive `production.env` variables with `dotenv`, connected to MongoDB and was off and running.

**All those links again**

AWS setup:

 * [http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/get-set-up-for-amazon-ec2.html](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/get-set-up-for-amazon-ec2.html)
 * [https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html)
 * [https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/RootDeviceStorage.html](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/RootDeviceStorage.html)
 * [https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Storage.html](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Storage.html)

Installing Node, setting up test app:

* [https://thefloppydisk.wordpress.com/2013/04/25/a-node-js-application-on-the-amazon-cloud-part-1-installing-node-on-an-ec2-instance/](https://thefloppydisk.wordpress.com/2013/04/25/a-node-js-application-on-the-amazon-cloud-part-1-installing-node-on-an-ec2-instance/)
* [http://www.lauradhamilton.com/how-to-set-up-a-nodejs-web-server-on-amazon-ec2](http://www.lauradhamilton.com/how-to-set-up-a-nodejs-web-server-on-amazon-ec2)

Deployment pipeline with Git:

* [http://deductiveblog.in/2013/05/19/deploy-to-amazon-ec2-using-git/](http://deductiveblog.in/2013/05/19/deploy-to-amazon-ec2-using-git/)
* [https://github.com/DaftMonk/generator-angular-fullstack/issues/501#issuecomment-57489119](https://github.com/DaftMonk/generator-angular-fullstack/issues/501#issuecomment-57489119)

Mongo DB on EC2

* [https://github.com/SIB-Colombia/dataportal-explorer/wiki/How-to-install-node-and-mongodb-on-Amazon-EC2](https://github.com/SIB-Colombia/dataportal-explorer/wiki/How-to-install-node-and-mongodb-on-Amazon-EC2)
* [http://docs.mongodb.org/ecosystem/platforms/amazon-ec2/](http://docs.mongodb.org/ecosystem/platforms/amazon-ec2/)

Production environment variables

* [https://www.npmjs.com/package/dotenv](https://www.npmjs.com/package/dotenv)

**Other useful links**

For generally managing multiple processes in a Unix shell:

* [https://www.ibm.com/developerworks/aix/library/au-speakingunix8/](https://www.ibm.com/developerworks/aix/library/au-speakingunix8/)
