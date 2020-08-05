/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const uri = require('uri-js');
const log = require('@adobe/helix-log');
const { Router } = require('./router');
const { forbidden } = require('./utils');
const fontCSS = require('./handlers/font-css');
const githubPlain = require('./handlers/github-plain');
const githubCSS = require('./handlers/github-css');
const githubJS = require('./handlers/github-js');
const pkgJson = require('../package.json');

/**
 * The rejected paths that may never be served
 * @param {*} path
 */
function rejected(path, allow, deny) {
  const allowlist = allow ? new RegExp(allow) : false;
  const denylist = deny ? new RegExp(deny) : false;

  if (allowlist) {
    return !(allowlist.test(path)) || rejected(path, undefined, deny);
  }
  if (denylist) {
    return denylist.test(path) || rejected(path);
  }
  if (/^\.well-known\/.*$/.test(path)) {
    return false;
  }
  if (/^(.*\/?)package\.json$/.test(path)) {
    return true;
  }
  if (/^(.*\/?)helix-config\.yaml$/.test(path)) {
    return true;
  }
  if (/(^|\/)\..+/.test(path)) {
    return true;
  }
  if (/^\/?src\//.test(path)) {
    return true;
  }
  return false;
}

function isESI({ esi }) {
  return !!esi;
}

/**
 *
 * @param {Object} params The OpenWhisk parameters
 * @param {string} params.owner Repository owner on GitHub
 * @param {string} params.repo Repository name on GitHub
 * @param {string} params.ref SHA of a commit or name of a branch or tag on GitHub
 * @param {string} params.path path to the requested file (if used with `entry`)
 * @param {string} params.allow regular expression pattern that all delivered files must follow
 * @param {string} params.deny regular expression pattern that all delivered files may not follow
 * @param {string} params.root document root for all static files in the repository
 * @param {boolean} params.esi replace relative URL references in JS and CSS with ESI references
 * @param {Object} params.__ow_headers The request headers of this web action invokation
 */
async function deliverStatic(params = {}) {
  const {
    owner,
    repo,
    ref = 'master',
    path,
    allow,
    deny,
    root = '',
    esi = false,
    __ow_headers = {},
  } = params;

  if (!owner && !repo && !path) {
    return {
      statusCode: 204,
      body: '',
      headers: {
        'x-version': pkgJson.version,
      },
    };
  }

  const file = uri.normalize(path);
  log.info(`deliverStatic with ${owner}/${repo}/${ref} path=${path} file=${file} allow=${allow} deny=${deny} root=${root} esi=${esi}`);
  if (rejected(file, allow, deny)) {
    log.info('rejected!');
    return forbidden();
  }

  const router = new Router();

  // eslint-disable-next-line  no-param-reassign
  params.githubToken = params.GITHUB_TOKEN || __ow_headers['x-github-token'];

  return router
    .register('/hlx_fonts/:kitid([a-z0-9]{7}).css', fontCSS)
    .register(':path(.*).:ext(css)', githubCSS, isESI)
    .register(':path(.*).:ext(m?js)', githubJS, isESI)
    .register(':path(.*).:ext(.*)', githubPlain)
    .handle(file, params);
}

module.exports = {
  deliverStatic, rejected,
};
