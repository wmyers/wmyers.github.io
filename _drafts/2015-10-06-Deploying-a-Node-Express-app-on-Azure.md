layout: post
title: Deploying a NodeJS App on Azure
categories:
- technical
- nodeJS
---

This article explains how to connect to Azure with the Azure CLI:
https://azure.microsoft.com/en-gb/documentation/articles/xplat-cli-connect/

This article is a very basic how-to of a Node App on Azure. It does not cover `node_modules` but has useful links at the bottom:
https://azure.microsoft.com/en-gb/documentation/articles/web-sites-nodejs-develop-deploy-mac/

This page covers NodeJS versions supported on Azure and how to define your required version in `package.json`:
https://azure.microsoft.com/en-gb/documentation/articles/nodejs-specify-node-version-azure-apps/

Use the management console `configure` tab to set DB connection strings and app environment variables (`app settings`).

This page explains some of the initial limitations with `node_modules` on Azure and the requirement for a custom deployment to get Azure to auto-install your dependencies:
https://azure.microsoft.com/en-gb/documentation/articles/nodejs-use-node-modules-azure-apps/

This blog post is useful for defining custom deployment:
http://blog.amitapple.com/post/38419111245/azurewebsitecustomdeploymentpart3/#.VhNIuWSqpBc

NB I just ran `azure site deploymentscript --node` and did not change the `depoy.cmd` file. It then auto-installed by node_modules using npm-shrinkwrap.json as part of the pre-defined script.

Customising this script works, but triggered a security error when adding explicit npm commands outside of an `if` block, e.g `npm i some-module`. I did not test but think you need to configure customisation using the `$POST_DEPLOYMENT_ACTION` stub defined, and then define an `app setting` to be picked up by the stub.

This page is massively useful for setting up logging and tail for debugging (need to generate a `IISNode.yml` file):
https://azure.microsoft.com/en-us/documentation/articles/web-sites-nodejs-debug/

To fix a `node_modules` issue after auto-intall with an `npm-shrinkwrap.json` file that had a missing dependency, I had to manually add the missing dependency module with ftp. Could not get Azure CLI to re-install one nested submodule.

This page documents commands to manage your web apps via the Azure CLI:
https://azure.microsoft.com/en-gb/documentation/articles/virtual-machines-command-line-tools/#commands-to-manage-your-web-apps
