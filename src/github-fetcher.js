/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const log = require('@adobe/helix-log');
const crypto = require('crypto');
const { computeSurrogateKey } = require('@adobe/helix-shared-utils');
const mime = require('mime-types');
const fetchAPI = require('@adobe/helix-fetch');
const { error, isCSS, isJavaScript } = require('./utils');

const { context, ALPN_HTTP1_1 } = fetchAPI;
const { fetch, Response, AbortController } = process.env.HELIX_FETCH_FORCE_HTTP1
  ? context({
    alpnProtocols: [ALPN_HTTP1_1],
    userAgent: 'helix-fetch', // static user agent for test recordings
  })
  : /* istanbul ignore next */ fetchAPI;

// one megabyte openwhisk limit + 20% Base64 inflation + safety padding
const REDIRECT_LIMIT = 750000;

const HARD_LIMIT = 1048576;

/* eslint-disable consistent-return
*/
function mimeTypeLookup(filename) {
  if (/^.well-known\/apple-developer-merchantid-domain-association$/.test(filename)) {
    return 'text/plain';
  }
}

/**
 * Adds general headers to the response.
 * @param {object} headers - The headers object.
 * @param {string} ref - Content ref (branch, tag, or sha)
 * @param {Buffer} content - The response content.
 * @returns {object} the new headers.
 */
function addHeaders(headers, ref, content) {
  let cacheheaders = {};
  if (/[a-f0-9]{40}/i.test(ref)) {
    cacheheaders = {
      // cache for 24 hours days, stale-while-revalidate: 30 days
      'Cache-Control': 'max-age=86400, stale-while-revalidate=2592000',
    };
  } else if (content) {
    const hash = crypto.createHash('sha256').update(content);
    cacheheaders = {
      ETag: `"${hash.digest('base64')}"`,
      // stale-while-revalidate: 30 days
      'Cache-Control': 's-maxage=300, stale-while-revalidate=2592000',
    };
    if (headers['Content-Type'] && (
      isCSS(headers['Content-Type'])
      || isJavaScript(headers['Content-Type'])
    ) && content.toString().match(/<esi:include/)) {
      cacheheaders['X-ESI'] = true;
    }
  }
  return Object.assign(headers, cacheheaders);
}

/**
 * Delivers a plain file from the given github repository.
 *
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {string} params.ref
 * @param {string} params.entry
 * @param {string} params.root
 * @param {boolean} params.esi
 * @param {string} params.branch
 * @param {string} params.githubToken
 */
function fetchFromGithub(params, bodyCallback) {
  const {
    owner, repo, ref = 'master', entry, root = '', esi = false, branch, githubToken,
  } = params;

  const { path, ext } = params.params;
  const cleanentry = (`${root}/${path}.${ext}`).replace(/^\//, '').replace(/[/]+/g, '/');
  let url;
  if (ref === 'gh-pages') {
    url = `https://${owner}.github.io/${repo}/${cleanentry}`;
  } else {
    const cleanpath = `${owner}/${repo}/${ref}/${cleanentry}`.replace(/[/]+/g, '/');
    url = `https://raw.githubusercontent.com/${cleanpath}`;
  }
  log.info(`deliverPlain: url=${url}`);
  const rawopts = {
    headers: {
      'User-Agent': 'Project Helix Static',
    },
  };
  if (githubToken) {
    rawopts.headers.Authorization = `token ${githubToken}`;
  }

  //  url (for surrogate control) always uses branch name
  let surrogateKey;
  if (branch && branch !== ref) {
    surrogateKey = computeSurrogateKey(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanentry}`);
  } else {
    surrogateKey = computeSurrogateKey(url);
  }

  const controller = new AbortController();

  rawopts.signal = controller.signal;

  return fetch(url, rawopts).then(async (response) => {
    const type = mime.lookup(cleanentry) || mimeTypeLookup(cleanentry) || 'application/octet-stream';
    const size = parseInt(response.headers.get('content-length'), 10);
    log.info(`got response. size=${size}, type=${type}`);
    if (!response.ok) {
      const reqErr = new Error(response.statusText);
      reqErr.statusCode = response.status;
      reqErr.response = {
        body: await response.text(),
      };

      throw reqErr;
    }
    if (size < REDIRECT_LIMIT) {
      let body = await response.buffer();
      if (bodyCallback) {
        body = await bodyCallback(body, { type, esi, entry });
      }
      log.info(`delivering file ${cleanentry} type ${type}`);

      if (body.length > HARD_LIMIT) {
        log.warn(`result size exceeds limit ${HARD_LIMIT}. sending redirect.`);
        return new Response('', {
          status: 307,
          headers: {
            Location: url,
            'X-Content-Type': type,
            'X-Static': 'Raw/Static',
            'Cache-Control': 's-maxage=300',
            'Surrogate-Key': surrogateKey,
          },
        });
      }

      return new Response(body, {
        status: 200,
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Raw/Static',
          'X-ESI': esi ? 'enabled' : undefined,
          'Surrogate-Key': surrogateKey,
        }, ref, body),
      });
    }
    log.info(`size exceeds limit ${REDIRECT_LIMIT}. sending redirect.`);

    // abort the request
    controller.abort();

    return new Response('', {
      status: 307,
      headers: {
        Location: url,
        'X-Content-Type': type,
        'X-Static': 'Raw/Static',
        'Cache-Control': 's-maxage=300',
        'Surrogate-Key': surrogateKey,
      },
    });
  }).catch((rqerror) => {
    if (esi) {
      // the ESI failed, so we simply fall back to the original URL
      // the browser will fetch it again, so let's cache the 404
      // for five minutes, in order to prevent the static function
      // from being called too often
      log.info(`error while fetching content. override status ${rqerror.statusCode} due to esi flag.`);
      return new Response(cleanentry, {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 's-maxage=300',
        },
      });
    }
    const { statusCode, message, response } = rqerror;
    if (statusCode === 404) {
      return error(entry, statusCode);
    }
    if (statusCode === 500) {
      log.warn(`error 500 from backend: ${message}`);
      return error(message, 502); // bad gateway
    }
    const { code, syscall } = rqerror;
    if (code === 'ETIMEDOUT' && syscall === 'connect') {
      log.warn(`connect to backend timed out: ${message}`);
      return error(message, 504); // gateway timeout
    }
    if (code === 'ECONNRESET') {
      log.warn(`connection reset by host: ${message}`);
      return error(message, 504); // gateway unavailable
    }
    log.error(`unknown error ${code} while fetching content during syscall ${syscall}: `, message);
    return error(
      (response && response.body && response.body.toString()) || message,
      statusCode,
    );
  });
}

module.exports = {
  fetchFromGithub, addHeaders,
};
