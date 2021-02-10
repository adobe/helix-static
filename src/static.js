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
const { Response } = require('@adobe/helix-fetch');
const uri = require('uri-js');
const log = require('@adobe/helix-log');
const { Router } = require('./router');
const { forbidden } = require('./utils');
const fontCSS = require('./handlers/font-css');
const githubPlain = require('./handlers/github-plain');
const githubIcons = require('./handlers/github-icons');
const githubSpritesheet = require('./handlers/github-spritesheet');
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
  return !!esi && esi !== 'false';
}

/**
 *
 * @param {Request} req The Request
 * @param {Context} context The context
 * @returns {Promise<Response>} The response
 */
// eslint-disable-next-line no-unused-vars
async function deliverStatic(req, context) {
  const { searchParams } = new URL(req.url);
  const params = Array.from(searchParams.entries()).reduce((p, [key, value]) => {
    // eslint-disable-next-line no-param-reassign
    p[key] = value;
    return p;
  }, {});

  const {
    owner,
    repo,
    ref = 'master',
    path,
    allow,
    deny,
    root = '',
    esi = false,
  } = params;

  if (!owner || !repo) {
    return new Response('', {
      status: 204,
      headers: {
        'x-version': pkgJson.version,
      },
    });
  }

  const file = uri.normalize(path);
  log.info(`deliverStatic with ${owner}/${repo}/${ref} path=${path} file=${file} allow=${allow} deny=${deny} root=${root} esi=${esi}`);
  if (rejected(file, allow, deny)) {
    log.info('rejected!');
    return forbidden();
  }

  const router = new Router();

  // eslint-disable-next-line  no-param-reassign
  params.githubToken = params.GITHUB_TOKEN || req.headers.get('x-github-token');

  return router
    .register('/hlx_fonts/:kitid([a-z0-9]{7}).css', fontCSS)
    .register(':path(.*).:ext(css)', githubCSS, isESI)
    .register(':path(.*).:ext(m?js)', githubJS, isESI)
    .register(':prefix(.*)/_icons_.svg', githubSpritesheet)
    .register(':prefix(.*)/_icons_:icon([a-zA-Z_-]+[a-zA-Z0-9]).svg', githubIcons)
    .register(':path(.*).:ext(.*)', githubPlain)
    .handle(file, params);
}

module.exports = {
  deliverStatic, rejected,
};
