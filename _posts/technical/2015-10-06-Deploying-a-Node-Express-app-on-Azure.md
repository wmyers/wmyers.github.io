---
layout: post
title: Deploying a NodeJS App on Azure
categories:
- technical
- nodeJS
---

**Connecting to Azure**

This article explains how to connect to Azure with the Azure CLI:
https://azure.microsoft.com/en-gb/documentation/articles/xplat-cli-connect/

**Basic Node 'Hello World' on Azure**

This article is a very basic how-to of a Node App on Azure. It does not cover `node_modules` but has useful links at the bottom:
https://azure.microsoft.com/en-gb/documentation/articles/web-sites-nodejs-develop-deploy-mac/

**Custom Node versions on Azure**

This page covers NodeJS versions supported on Azure and how to define your required version in `package.json`:
https://azure.microsoft.com/en-gb/documentation/articles/nodejs-specify-node-version-azure-apps/

It provides a way to specify a custom version of Node using just a `IISNode.yml` config and a deployed `node.exe` version in a `bin` folder. However this did not seem to work without a `deploy.sh` and `.deployment` files - see more explanation below.

This page explains some of the initial limitations with `node_modules` on Azure and the requirement for a custom deployment to get Azure to auto-install your dependencies:
https://azure.microsoft.com/en-gb/documentation/articles/nodejs-use-node-modules-azure-apps/

This blog post eventually provided me with the info  for defining custom deployment:
http://blog.amitapple.com/post/38419111245/azurewebsitecustomdeploymentpart3/#.VhNIuWSqpBc

NB I just ran `azure site deploymentscript --node` and did not change the generated `deploy.sh` file. It then auto-installed my node_modules using npm-shrinkwrap.json (that I had previously generated in my gulp pipeline) as part of the pre-defined steps (in `deploy.sh`).

NB Customising `deploy.sh` to do different things does sort-of work, but triggered a security error when adding explicit npm commands outside of an `if` block, e.g `npm i some-module`.

I was trying to fix a missing module error in a sub-dependency. I did not test this theory but think you need to configure customisation using the `$POST_DEPLOYMENT_ACTION` stub defined in `deploy.sh`, and then define an `app setting` to be picked up by the stub.

One other thought - I did `npm shrinkwrap` but I didn't do `npm dedupe` which might be another way of solving npm dependency gremlins on azure.

NB I had tried the more simple approach of just adding a `IISNode.yml` file and a bin directory containing a custom version of `node.exe` and then the following in the yml `nodeProcessCommandLine: "D:\home\site\wwwroot\bin\node.exe"`. Without the `deploy.sh` and `.deployment` the deployment failed with the following error log excerpt:

```
remote: Running custom deployment command...
remote: Running deployment command...
remote: bash: deploy.sh: No such file or directory
remote:
remote: Error - Changes committed to remote repository but deployment to website failed.
```

This would indicate that the presence of `IISNode.yml` automatically infers a custom deployment, which then requires a mandatory `deploy.sh`.

**Setting DB connection strings and environment variables on your Node Web App**

~~Use the management console `configure` tab to set DB connection strings and app environment variables (`app settings`).~~

This now seems to be under Settings > Application settings. Then `App settings` for node environment variables (secrets etc), and `Connection strings` for DB connection strings.

*NB I used MongoDB as a **custom** connection string. This changes the name of the variable in your app, a `CUSTOMCONNSTR_` prefix is added - so `MONGOLAB_URI` becomes `CUSTOMCONNSTR_MONGOLAB_URI`.*

**Debugging**

This page is massively useful for setting up logging and tail for debugging (need to generate a `IISNode.yml` file if you don't have one yet):
https://azure.microsoft.com/en-us/documentation/articles/web-sites-nodejs-debug/

**FTP access when all else fails**

To fix a `node_modules` issue for a `npm-shrinkwrap.json` file that had a missing dependency, I had to manually add the missing dependency module with ftp. I could not get Azure CLI to re-install one nested submodule.

**Azure CLI commands for web apps**

This page documents commands to manage your web apps via the Azure CLI:
https://azure.microsoft.com/en-gb/documentation/articles/virtual-machines-command-line-tools/#commands-to-manage-your-web-apps

**MIME types**

I was serving static JSON and getting a 404, this link explained why:
http://blogs.msdn.com/b/africaapps/archive/2013/06/07/how-to-serve-static-json-files-from-a-windows-azure-website.aspx

NB the `web.config` was auto-generated from settings in the azure web console when I deployed for the first time. I edited and overwrote this file via FTP.

Read the comment further down the page on making this technique more secure, by adding the following line `<remove fileExtension=".json" />` before the MIME definition. I don't fully understand this security issue - comments anyone?
