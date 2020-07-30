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
const ohash = require('object-hash');
const uri = require('uri-js');
const babel = require('@babel/core');
const log = require('@adobe/helix-log');
const { fetchFromGithub } = require('../github-fetcher');

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
 * @param {Buffer} responsebody - the response body
 * @param {boolean} esi - esi flag
 * @param {string} entry - the base href
 * @returns {Function|any|string|any} the response body
 */
function processBody(responsebody, { entry }) {
  return rewriteJavaScript(responsebody.toString('utf-8'), entry);
}

function handle(opts) {
  return fetchFromGithub(opts, processBody);
}

module.exports = handle;
module.exports.js = processBody;
