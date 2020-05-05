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
// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request-promise-native');
const crypto = require('crypto');
const mime = require('mime-types');
const postcss = require('postcss');
const postcssurl = require('postcss-url');
const parser = require('postcss-value-parser');
const babel = require('@babel/core');
const ohash = require('object-hash');
const sanitizer = require('sanitizer');
const { wrap: status } = require('@adobe/helix-status');
const { wrap } = require('@adobe/openwhisk-action-utils');
const { logger } = require('@adobe/openwhisk-action-logger');
const { epsagon } = require('@adobe/helix-epsagon');
const log = require('@adobe/helix-log');
const { computeSurrogateKey } = require('@adobe/helix-shared').utils;

const { space } = postcss.list;
const uri = require('uri-js');
const pkgJson = require('../package.json');

const deliverFontCSS = require('./font-proxy');

/* eslint-disable no-console */

// one megabyte openwhisk limit + 20% Base64 inflation + safety padding
const REDIRECT_LIMIT = 750000;

/**
 * Generates an error response
 * @param {string} message - error message
 * @param {number} code - error code.
 * @returns response
 */
function error(message, code = 500) {
  const statusCode = code === 400 ? 404 : code;
  log.info('delivering error', message, code);
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html',
      'X-Static': 'Raw/Static',
      'Cache-Control': 'max-age=300',
    },
    body: sanitizer.escape(message),
  };
}

/**
 * Generate a `forbidden` response.
 * @returns {object} a response object.
 */
function forbidden() {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=300', // don't bother us for the next five minutes
    },
    body: 'forbidden.',
  };
}

/**
 * Checks if the content type is css.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is css.
 */
function isCSS(type) {
  return type === 'text/css';
}

/**
 * Checks if the content type is javascript.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is javascript.
 */
function isJavaScript(type) {
  return /(text|application)\/(x-)?(javascript|ecmascript)/.test(type);
}

/**
 * Checks if the content type is binary.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is binary.
 */
function isBinary(type) {
  if (/text\/.*/.test(type)) {
    return false;
  }
  if (/.*\/javascript/.test(type)) {
    return false;
  }
  if (/.*\/.*json/.test(type)) {
    return false;
  }
  if (/.*\/.*xml/.test(type)) {
    return /svg/.test(type); // openwshisk treats SVG as binary
  }
  return true;
}

/**
 * Checks if the content type is JSON.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is JSON.
 */
function isJSON(type) {
  return /json/.test(type);
}

/**
 * Adds general headers to the response.
 * @param {object} headers - The headers object.
 * @param {string} ref - Content ref (branch, tag, or sha)
 * @param {string} content - The response content.
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
    const hash = crypto.createHash('md5').update(content);
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
 * Rewrites the content by replacing all `@import` statements and `url` rules with `<esi:include/>`
 * tags, so that they can be resolved to a stable URL by the ESI processor.
 *
 * @param {string} css - the CSS content
 * @param {string} base - the base href
 * @returns {Function | any}
 */
function rewriteCSS(css, base = '') {
  function rewriteImports(tree) {
    tree.walkAtRules('import', (rule) => {
      if (rule.name === 'import') {
        const [url, queries] = space(rule.params);
        const parsedurl = parser(url);
        if (parsedurl.nodes
          && parsedurl.nodes.length === 1
          && parsedurl.nodes[0].value === 'url'
          && parsedurl.nodes[0].nodes
          && parsedurl.nodes[0].nodes.length === 1
          && parsedurl.nodes[0].nodes[0].type === 'string'
          && typeof parsedurl.nodes[0].nodes[0].value === 'string'
          && typeof parsedurl.nodes[0].nodes[0].quote === 'string') {
          const importuri = uri.parse(parsedurl.nodes[0].nodes[0].value);
          const { quote } = parsedurl.nodes[0].nodes[0];
          if (importuri.reference === 'relative' && !importuri.query) {
            rule.replaceWith(postcss.atRule({
              name: 'import',
              params: `url(${quote}<esi:include src="${importuri.path}.url"/><esi:remove>${importuri.path}</esi:remove>${quote}) ${queries}`,
            }));
          }
        } else if (parsedurl.nodes
          && parsedurl.nodes[0].type === 'string'
          && typeof parsedurl.nodes[0].value === 'string'
          && typeof parsedurl.nodes[0].quote === 'string') {
          const importuri = uri.parse(parsedurl.nodes[0].value);
          const { quote } = parsedurl.nodes[0];
          if (importuri.reference === 'relative' && !importuri.query) {
            rule.replaceWith(postcss.atRule({
              name: 'import',
              params: `${quote}<esi:include src="${uri.resolve(base, importuri.path)}.url"/><esi:remove>${importuri.path}</esi:remove>${quote} ${queries}`,
            }));
          }
        }
      }
    });
    return tree;
  }

  log.info('rewriting css...');
  const processor = postcss()
    .use(rewriteImports)
    .use(postcssurl({
      url: (asset) => {
        // TODO pass in request URL and make it absolute.
        if (asset.search === '' && asset.absolutePath !== '.' && asset.relativePath !== '.') {
          return `<esi:include src="${uri.resolve(base, asset.relativePath)}.url"/><esi:remove>${asset.relativePath}</esi:remove>`;
        }
        return asset.url;
      },
    }));
  return processor
    .process(css, { from: undefined })
    .then((result) => result.css)
    .catch((err) => {
      log.error('error while processing css', err);
      return css;
    });
}

/**
 * Rewrites the content by replacing all `import` statements rules with `<esi:include/>`
 * tags, so that they can be resolved to a stable url by the esi processor.
 *
 * @param {string} javascript - the Javascript content
 * @param {string} base - the base href
 * @returns {Function | any}
 */
function rewriteJavaScript(javascript, base = '') {
  const importmap = {};

  function rewriteJSImports(bab) {
    const t = bab.types;
    return {
      visitor: {
        ImportDeclaration(path) {
          if (path
            && path.node
            && path.node.source
            && path.node.source.value
            && !importmap[path.node.source.value]) {
            const srcuri = uri.parse(path.node.source.value);
            if (srcuri.reference === 'relative' && !srcuri.query) {
              const { specifiers } = path.node;
              // console.log(srcuri);
              const h = ohash(srcuri.path);
              importmap[h] = `<esi:include src="${uri.resolve(base, srcuri.path)}.url"/><esi:remove>${path.node.source.value}</esi:remove>`;
              path.replaceWith(t.importDeclaration(specifiers, t.stringLiteral(h)));
            }
          }
          return false;
        },
      },
    };
  }

  try {
    log.info('rewriting javascript...');
    const transformed = babel.transformSync(javascript,
      { plugins: [rewriteJSImports], retainLines: true });

    return Object.keys(importmap)
      .reduce((src, key) => src.replace(key, importmap[key]), transformed.code);
  } catch (e) {
    log.error('error while processing javascript', e);
    return javascript;
  }
}

/**
 * Processes the body according to the content type.
 * @param {string} type - the content type
 * @param {string} responsebody - the response body
 * @param {boolean} esi - esi flag
 * @param {string} entry - the base href
 * @returns {Function|any|string|any} the response body
 */
function processBody(type, responsebody, esi = false, entry) {
  if (isBinary(type)) {
    return Buffer.from(responsebody).toString('base64');
  }
  if (isJSON(type)) {
    return JSON.parse(responsebody);
  }
  if (esi && isCSS(type)) {
    return rewriteCSS(responsebody.toString(), entry);
  }
  if (esi && isJavaScript(type)) {
    return rewriteJavaScript(responsebody.toString(), entry);
  }
  return responsebody.toString();
}

/* eslint-disable consistent-return
*/
function mymimelookup(filename) {
  if (/^.well-known\/apple-developer-merchantid-domain-association$/.test(filename)) {
    return 'text/plain';
  }
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
function deliverPlain(owner, repo, ref, entry, root, esi = false, branch, githubToken) {
  const cleanentry = (`${root}/${entry}`).replace(/^\//, '').replace(/[/]+/g, '/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${cleanentry}`;
  log.info(`deliverPlain: url=${url}`);
  const rawopts = {
    url,
    headers: {
      'User-Agent': 'Project Helix Static',
    },
    resolveWithFullResponse: true,
    encoding: null,
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

  return request.get(rawopts).then(async (response) => {
    const type = mime.lookup(cleanentry) || mymimelookup(cleanentry) || 'application/octet-stream';
    const size = parseInt(response.headers['content-length'], 10);
    log.info(`got response. size=${size}, type=${type}`);
    if (size < REDIRECT_LIMIT) {
      const body = await processBody(type, response.body, esi, entry);
      log.info(`delivering file ${cleanentry} type ${type} binary: ${isBinary(type)}`);
      return {
        statusCode: 200,
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Raw/Static',
          'X-ESI': esi ? 'enabled' : undefined,
          'Surrogate-Key': surrogateKey,
        }, ref, response.body),
        body,
      };
    }
    log.info(`size exceeds limit ${REDIRECT_LIMIT}. sending redirect.`);
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
        body: entry,
      };
    }
    const { statusCode, message, response } = rqerror;
    if (statusCode === 404) {
      return error(entry, statusCode);
    }
    if (statusCode === 500) {
      log.warn('error 500 from backend: ' + message);
      return error(message, 502); // bad gateway
    }
    log.error('error while fetching content', message);
    return error(
      (response && response.body && response.body.toString()) || message,
      statusCode,
    );
  });
}

/**
 * The blacklist of paths that may never be served
 * @param {*} path
 */
function blacklisted(path, allow, deny) {
  const whitelist = allow ? new RegExp(allow) : false;
  const blacklist = deny ? new RegExp(deny) : false;

  if (whitelist) {
    return !(whitelist.test(path)) || blacklisted(path, undefined, deny);
  }
  if (blacklist) {
    return blacklist.test(path) || blacklisted(path);
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
/**
 *
 * @param {Object} params The OpenWhisk parameters
 * @param {string} params.owner Repository owner on GitHub
 * @param {string} params.repo Repository name on GitHub
 * @param {string} params.ref SHA of a commit or name of a branch or tag on GitHub
 * @param {string} params.branch the name of a branch or tag on GitHub (defaults to ref)
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
    branch,
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
  if (blacklisted(file, allow, deny)) {
    log.info('blacklisted!');
    return forbidden();
  }

  if (/^\/hlx_fonts\/([a-z0-9]){7}\.css/.test(file)) {
    return deliverFontCSS(file);
  }

  const githubToken = params.GITHUB_TOKEN || __ow_headers['x-github-token'];
  return deliverPlain(owner, repo, ref, file, root, esi, branch, githubToken);
}

/**
 * Main function called by the openwhisk invoker.
 * @param params Action params
 * @returns {Promise<*>} The response
 */
const main = wrap(deliverStatic)
  .with(epsagon)
  .with(status, { github: 'https://raw.githubusercontent.com/adobe/helix-static/master/src/index.js' })
  .with(logger.trace)
  .with(logger);

// todo: do we still need those exports?
module.exports = {
  error,
  addHeaders,
  isBinary,
  blacklisted,
  getBody: processBody,
  main,
};
