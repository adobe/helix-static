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

const postcss = require('postcss');
const postcssurl = require('postcss-url');
const parser = require('postcss-value-parser');
const uri = require('uri-js');

const { space } = postcss.list;
const { fetchFromGithub } = require('../github-fetcher');
/**
 * Rewrites the content by replacing all `@import` statements and `url` rules with `<esi:include/>`
 * tags, so that they can be resolved to a stable URL by the ESI processor.
 *
 * @param {string} css - the CSS content
 * @param {string} base - the base href
 * @returns {Function | any}
 */
function rewriteCSS(css, base = '', context) {
  const { log } = context;
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
 * Processes the body according to the content type.
 * @param {string} type - the content type
 * @param {Buffer} responsebody - the response body
 * @param {boolean} esi - esi flag
 * @param {string} entry - the base href
 * @returns {Function|any|string|any} the response body
 */
function processBody(responsebody, { entry }, context) {
  return rewriteCSS(responsebody.toString('utf-8'), entry, context);
}

function handle(opts, context) {
  return fetchFromGithub(opts, processBody, context);
}

module.exports = handle;
module.exports.css = processBody;
