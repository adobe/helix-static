# Helix Static

> Serve static files from GitHub (with some extras) for Project Helix

## Status

[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-static.svg)](https://codecov.io/gh/adobe/helix-static)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-static/master.svg)](https://circleci.com/gh/adobe/helix-static/tree/master)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-static.svg)](https://github.com/adobe/helix-static/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-static.svg)](https://github.com/adobe/helix-static/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-static.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-static)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-static.svg)](https://greenkeeper.io/)


## About

Helix Static is a shared microservice for [Project Helix](https://www.project-helix.io) that serves static files from GitHub. It includes the following features:

- MIME type detection
- large file dection (large files get redirected and served from the CDN)
- generation of long-cachable URLs for JS and CSS assets
- replacement of URLs in JS and CSS assets with references to long-cacheable URLs (through ESI)


## Developing Helix Static

You need `node>=8.0.0` and `npm>=5.4.0`. Follow the typical `npm install`, `npm test` workflow.

Contributions are highly welcome.

## Deploying Helix Static

Deploying Helix Static requires the `wsk` command line client, authenticated to a namespace of your choice. For Project Helix, we use the `helix` namespace.

All commits to master that pass the testing will be deployed automatically. All commits to branches that will pass the testing will get commited as `/helix-services/static@ci<num>` and tagged with the CI build number.

