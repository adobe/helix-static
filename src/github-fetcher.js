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
const { computeSurrogateKey } = require('@adobe/helix-shared').utils;
const mime = require('mime-types');
const { fetch, AbortController } = require('@adobe/helix-fetch').context({
  httpsProtocols:
  /* istanbul ignore next */
  process.env.HELIX_FETCH_FORCE_HTTP1 ? ['http1'] : ['http2', 'http1'],
});
const {
  error, isBinary, isCSS, isJavaScript,
} = require('./utils');

// one megabyte openwhisk limit + 20% Base64 inflation + safety padding
const REDIRECT_LIMIT = 750000;

/* eslint-disable consistent-return
*/
function mymimelookup(filename) {
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
 * @param owner
 * @param repo
 * @param ref
 * @param entry
 * @param root
 * @param esi
 * @param branch
 * @param githubToken
 */
function fetchFromGithub(params, bodyCallback) {
  const {
    owner, repo, ref = 'master', entry, root = '', esi = false, branch, githubToken,
  } = params;

  const { path, ext } = params.params;
  const cleanentry = (`${root}/${path}.${ext}`).replace(/^\//, '').replace(/[/]+/g, '/');
  const cleanpath = `${owner}/${repo}/${ref}/${cleanentry}`.replace(/[/]+/g, '/');
  const url = `https://raw.githubusercontent.com/${cleanpath}`;
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
    const type = mime.lookup(cleanentry) || mymimelookup(cleanentry) || 'application/octet-stream';
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
      const body = await bodyCallback(await response.buffer(), { type, esi, entry });
      log.info(`delivering file ${cleanentry} type ${type} binary: ${isBinary(type)}`);
      return {
        statusCode: 200,
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Raw/Static',
          'X-ESI': esi ? 'enabled' : undefined,
          'Surrogate-Key': surrogateKey,
        }, ref, await response.buffer()),
        body,
      };
    }
    log.info(`size exceeds limit ${REDIRECT_LIMIT}. sending redirect.`);

    // abort the request
    controller.abort();

    return {
      statusCode: 307,
      headers: {
        Location: url,
        'X-Content-Type': type,
        'X-Static': 'Raw/Static',
        'Cache-Control': 's-maxage=300',
        'Surrogate-Key': surrogateKey,
      },
    };
  }).catch((rqerror) => {
    if (esi) {
      // the ESI failed, so we simply fall back to the original URL
      // the browser will fetch it again, so let's cache the 404
      // for five minutes, in order to prevent the static function
      // from being called too often
      log.info(`error while fetching content. override status ${rqerror.statusCode} due to esi flag.`);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 's-maxage=300',
        },
        body: cleanentry,
      };
    }
    const { statusCode, message, response } = rqerror;
    if (statusCode === 404) {
      return error(entry, statusCode);
    }
    if (statusCode === 500) {
      log.warn(`error 500 from backend: ${message}`);
      return error(message, 502); // bad gateway
    }
    log.error('unknown error while fetching content', message);
    return error(
      (response && response.body && response.body.toString()) || message,
      statusCode,
    );
  });
}

module.exports = {
  fetchFromGithub, addHeaders,
};
